// Keeps a pool of ready Fish API puzzles in MongoDB, so gameplay never waits for the provider.
import { createHash } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { Content } from '@riverbound/server/models';
import { fetchFishPuzzle, pngSize, ProviderError } from '../providers/fishApi.ts';

export type RefillOptions = { baseUrl: string; targetPoolSize: number; maxPerRun: number; maxRetries: number };

/** Tries one download with retries: waits 1s, 2s, 4s... between attempts (exponential backoff). */
async function fetchWithRetry(baseUrl: string, maxRetries: number) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await fetchFishPuzzle(baseUrl);
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) await sleep(1000 * 2 ** attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new ProviderError('Fish API unavailable');
}

export async function refillPuzzles(options: RefillOptions): Promise<{ added: number; message: string }> {
  // Only puzzles not yet handed out count: feeding and crossings each claim puzzles for good (v2.5).
  const ready = await Content.countDocuments({ source: 'fish_api', status: 'ready', usedFor: null });
  const needed = Math.min(options.maxPerRun, options.targetPoolSize - ready);
  if (needed <= 0) return { added: 0, message: `pool full (${ready} ready)` };

  let added = 0;
  let duplicates = 0;
  let quarantined = 0;
  for (let i = 0; i < needed; i += 1) {
    // One request at a time, with a short pause, to be polite to the free provider.
    const puzzle = await fetchWithRetry(options.baseUrl, options.maxRetries);
    const hash = createHash('sha256').update(puzzle.image).digest('hex');
    const size = pngSize(puzzle.image);
    // Unexpected picture size: keep it but never use it, so players are not penalised by a broken picture.
    const sizeOk = size.width === 660 && size.height === 360;
    const result = await Content.updateOne(
      { hash },
      {
        $setOnInsert: {
          source: 'fish_api',
          image: puzzle.image,
          imageType: puzzle.imageType,
          fishCount: puzzle.fishCount,
          chestCount: puzzle.chestCount,
          hash,
          status: sizeOk ? 'ready' : 'quarantined',
          note: sizeOk ? '' : `unexpected size ${size.width}x${size.height}`,
        },
      },
      { upsert: true },
    );
    if (result.upsertedCount === 1) {
      added += 1;
      if (!sizeOk) quarantined += 1;
    } else {
      duplicates += 1;
    }
    await sleep(500);
  }
  return { added, message: `added ${added} (quarantined ${quarantined}, duplicates ${duplicates}); pool was ${ready}` };
}

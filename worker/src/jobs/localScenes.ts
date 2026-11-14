// Locally drawn fallback puzzles (SVG pictures with known fish and chest counts).
// They keep river crossings playable when the Fish API is down. We drew them, so no licence issue.
import { createHash } from 'node:crypto';
import { Content } from '@riverbound/server/models';
import { createRng, randomInt } from '@riverbound/shared';
import { drawScene } from './sceneDrawing.ts';

/** Makes sure at least `target` local scenes exist, covering every region's limits (chests 1-4, fish 1-12). */
export async function ensureLocalScenes(target: number): Promise<{ added: number; message: string }> {
  const existing = await Content.countDocuments({ source: 'local' });
  let added = 0;
  for (let seed = 1; existing + added < target && seed < target * 10; seed += 1) {
    const rng = createRng(seed * 7919);
    const fish = randomInt(rng, 1, 12);
    const chests = randomInt(rng, 1, 4); // fits every region, including Shallow Bend
    const svg = drawScene(seed, fish, chests);
    const hash = createHash('sha256').update(svg).digest('hex');
    const result = await Content.updateOne(
      { hash },
      { $setOnInsert: { source: 'local', image: Buffer.from(svg), imageType: 'image/svg+xml', fishCount: fish, chestCount: chests, hash, status: 'ready', note: 'locally drawn fallback' } },
      { upsert: true },
    );
    if (result.upsertedCount === 1) added += 1;
  }
  return { added, message: `local scenes: ${existing + added} (added ${added})` };
}

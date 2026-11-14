// Finds one CC0 sound on Freesound for each game event and saves it in MongoDB.
// Already-saved sounds are kept; only missing ones are searched (saves API calls).
import { Sound } from '@riverbound/server/models';
import { SOUND_KEYS, SOUND_QUERIES } from '@riverbound/shared';
import { searchSound } from '../providers/freesoundApi.ts';

export async function refreshSounds(apiKey: string | undefined): Promise<{ added: number; message: string }> {
  if (!apiKey) return { added: 0, message: 'FREESOUND_API_KEY not set; the game will use built-in fallback sounds' };

  const saved = new Set((await Sound.find({}, { key: 1 }).lean()).map((s) => s.key));
  let added = 0;
  const notFound: string[] = [];
  for (const key of SOUND_KEYS) {
    if (saved.has(key)) continue;
    const maxSeconds = key === 'river_ambience' ? 60 : 4;
    const result = await searchSound(apiKey, SOUND_QUERIES[key], maxSeconds);
    if (!result) {
      notFound.push(key);
      continue;
    }
    await Sound.updateOne({ key }, { $set: { key, ...result } }, { upsert: true });
    added += 1;
  }
  const missingText = notFound.length ? `; no match for ${notFound.join(', ')}` : '';
  return { added, message: `sounds saved: ${saved.size + added}/${SOUND_KEYS.length}${missingText}` };
}

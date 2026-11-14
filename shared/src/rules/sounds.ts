// Game sound events and the Freesound searches used to find a sound for each one.
// Only CC0 (public domain) sounds are used so no extra licence work is needed.

export const SOUND_KEYS = [
  'button',
  'catch',
  'feed_correct',
  'feed_wrong',
  'coins',
  'purchase',
  'heart_lost',
  'crossing_clear',
  'rescue',
  'river_ambience',
] as const;

export type SoundKey = (typeof SOUND_KEYS)[number];

export const SOUND_QUERIES: Record<SoundKey, string> = {
  button: 'ui click wood',
  catch: 'water splash small',
  feed_correct: 'success chime',
  feed_wrong: 'soft error',
  coins: 'coins drop',
  purchase: 'cash register',
  heart_lost: 'hurt thud',
  crossing_clear: 'victory short',
  rescue: 'fanfare short',
  river_ambience: 'river stream ambience',
};

export function isSoundKey(value: unknown): value is SoundKey {
  return typeof value === 'string' && (SOUND_KEYS as readonly string[]).includes(value);
}

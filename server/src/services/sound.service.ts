// Gives the browser the list of game sounds the worker found on Freesound.
// If none are saved yet, the list is empty and the browser uses its built-in fallback beeps.
import type { SoundDTO } from '@riverbound/shared';
import { Sound } from '../models/index.ts';

export async function listSounds(): Promise<SoundDTO[]> {
  const sounds = await Sound.find().lean();
  return sounds.map((s) => ({
    key: s.key,
    url: s.previewUrl,
    title: s.title,
    author: s.author,
    license: s.license,
    sourceUrl: s.sourceUrl,
  }));
}

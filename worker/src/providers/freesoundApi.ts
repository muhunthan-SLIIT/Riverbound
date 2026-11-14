// Adapter for the Freesound API (sound effects).
// Docs: https://freesound.org/docs/api/  — needs a free API key (token), 60 requests/min, 2000/day.
// We only search for CC0 (public domain) sounds and keep their public preview links.

export type FreesoundResult = {
  freesoundId: number;
  title: string;
  author: string;
  license: string;
  previewUrl: string;
  sourceUrl: string;
};

export class SoundProviderError extends Error {}

type RawSound = {
  id?: unknown;
  name?: unknown;
  username?: unknown;
  license?: unknown;
  url?: unknown;
  previews?: Record<string, unknown>;
};

/** Finds the best short CC0 sound for a search phrase, or null if nothing fits. */
export async function searchSound(apiKey: string, query: string, maxSeconds: number, timeoutMs = 10_000): Promise<FreesoundResult | null> {
  const params = new URLSearchParams({
    query,
    filter: `license:"Creative Commons 0" duration:[0.1 TO ${maxSeconds}]`,
    fields: 'id,name,username,license,url,previews',
    sort: 'rating_desc',
    page_size: '5',
    token: apiKey,
  });
  const response = await fetch(`https://freesound.org/apiv2/search/text/?${params.toString()}`, {
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (response.status === 401) throw new SoundProviderError('Freesound rejected the API key');
  if (response.status === 429) throw new SoundProviderError('Freesound rate limit reached');
  if (!response.ok) throw new SoundProviderError(`HTTP ${response.status} from Freesound`);

  const body = (await response.json()) as { results?: RawSound[] };
  for (const raw of body.results ?? []) {
    const preview = raw.previews?.['preview-lq-mp3'] ?? raw.previews?.['preview-hq-mp3'];
    if (
      typeof raw.id === 'number' &&
      typeof raw.name === 'string' &&
      typeof raw.username === 'string' &&
      typeof raw.license === 'string' &&
      typeof raw.url === 'string' &&
      typeof preview === 'string' &&
      preview.startsWith('https://')
    ) {
      return { freesoundId: raw.id, title: raw.name, author: raw.username, license: raw.license, previewUrl: preview, sourceUrl: raw.url };
    }
  }
  return null;
}

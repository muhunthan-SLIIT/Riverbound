// Adapter for the Marc Conrad Fish Game API.
// It downloads one puzzle and turns it into OUR format. Nothing outside this file
// knows the provider's field names ("question", "fish", "chest").
//
// Docs: https://marcconrad.com/uob/fish/doc.php  (free, no API key, not for commercial use)

export type FishPuzzle = { image: Buffer; imageType: string; fishCount: number; chestCount: number };

export class ProviderError extends Error {}

const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 99;

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new ProviderError(`HTTP ${response.status} from ${new URL(url).host}`);
  return response;
}

/** Fetches one puzzle. Throws ProviderError if the reply is missing, malformed or not a PNG. */
export async function fetchFishPuzzle(baseUrl: string, timeoutMs = 10_000): Promise<FishPuzzle> {
  // base64=yes returns the picture inside the reply, so we never need the answer-revealing file name.
  const response = await fetchWithTimeout(`${baseUrl}?out=json&base64=yes`, timeoutMs);
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ProviderError('Reply was not JSON');
  }
  if (typeof body !== 'object' || body === null) throw new ProviderError('Reply was not an object');
  const { question, fish, chest } = body as Record<string, unknown>;
  if (typeof question !== 'string' || !isCount(fish) || !isCount(chest)) {
    throw new ProviderError('Reply is missing question, fish or chest');
  }

  const image = Buffer.from(question.replace(/^data:image\/\w+;base64,/, ''), 'base64');
  const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (image.length < 100 || !image.subarray(0, 8).equals(PNG_SIGNATURE)) throw new ProviderError('Picture is not a valid PNG');

  return { image, imageType: 'image/png', fishCount: fish, chestCount: chest };
}

/** Reads the width and height from a PNG header (expected 660 x 360). */
export function pngSize(image: Buffer): { width: number; height: number } {
  return { width: image.readUInt32BE(16), height: image.readUInt32BE(20) };
}

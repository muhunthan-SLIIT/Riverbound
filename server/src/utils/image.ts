// Checks that stored picture bytes really are a PNG or SVG picture (not an error page or empty data).

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function looksLikeImage(image: Buffer | undefined | null, imageType: string): boolean {
  if (!image || image.length < 8) return false;
  if (imageType === 'image/png') return image.subarray(0, 8).equals(PNG_SIGNATURE);
  if (imageType === 'image/svg+xml') {
    const start = image.subarray(0, 200).toString('utf8').trimStart();
    return start.startsWith('<svg') || start.startsWith('<?xml');
  }
  return false;
}

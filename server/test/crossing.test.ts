// Checks the picture safety test used before a crossing picture is served or replaced.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { looksLikeImage } from '../src/utils/image.ts';

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);

test('real PNG and SVG pictures pass the image check', () => {
  assert.equal(looksLikeImage(PNG_HEADER, 'image/png'), true);
  assert.equal(looksLikeImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'), 'image/svg+xml'), true);
  assert.equal(looksLikeImage(Buffer.from('  <?xml version="1.0"?><svg/>'), 'image/svg+xml'), true);
});

test('missing, empty or damaged pictures fail the image check (so they can be replaced without penalty)', () => {
  assert.equal(looksLikeImage(null, 'image/png'), false);
  assert.equal(looksLikeImage(Buffer.alloc(0), 'image/png'), false);
  assert.equal(looksLikeImage(Buffer.from('<html>error page</html>'), 'image/png'), false);
  assert.equal(looksLikeImage(Buffer.from('<html>error page</html>'), 'image/svg+xml'), false);
  assert.equal(looksLikeImage(PNG_HEADER, 'image/gif'), false);
});

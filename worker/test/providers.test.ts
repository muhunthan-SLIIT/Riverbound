// Worker tests with a fake (mocked) Fish API, so they never call the real service.
import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchFishPuzzle, pngSize, ProviderError } from '../src/providers/fishApi.ts';
import { drawScene } from '../src/jobs/sceneDrawing.ts';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

/** A tiny fake PNG header with width 660 and height 360. */
function fakePng(width = 660, height = 360): Buffer {
  const png = Buffer.alloc(120);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png, 0);
  png.writeUInt32BE(width, 16);
  png.writeUInt32BE(height, 20);
  return png;
}

function mockFetch(body: unknown, status = 200) {
  globalThis.fetch = (async () =>
    new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })) as typeof fetch;
}

test('valid reply becomes our own puzzle format', async () => {
  mockFetch({ question: fakePng().toString('base64'), fish: 7, chest: 3 });
  const puzzle = await fetchFishPuzzle('https://example.test/api.php');
  assert.equal(puzzle.fishCount, 7);
  assert.equal(puzzle.chestCount, 3);
  assert.deepEqual(pngSize(puzzle.image), { width: 660, height: 360 });
});

test('malformed replies are rejected (V2-18)', async () => {
  mockFetch({ question: 'abc', fish: 'seven', chest: 3 });
  await assert.rejects(fetchFishPuzzle('https://example.test/api.php'), ProviderError);
  mockFetch({ question: Buffer.from('not a png at all, just text that is long enough to pass the length check........................................').toString('base64'), fish: 1, chest: 1 });
  await assert.rejects(fetchFishPuzzle('https://example.test/api.php'), ProviderError);
  mockFetch('<html>oops</html>');
  await assert.rejects(fetchFishPuzzle('https://example.test/api.php'), ProviderError);
});

test('provider outage gives a ProviderError, not a crash', async () => {
  mockFetch({}, 503);
  await assert.rejects(fetchFishPuzzle('https://example.test/api.php'), /HTTP 503/);
});

test('local fallback scenes draw exactly the requested number of fish and chests', () => {
  const svg = drawScene(5, 9, 3);
  assert.equal((svg.match(/<ellipse/g) ?? []).length, 9);
  assert.equal((svg.match(/<rect width="44"/g) ?? []).length, 3);
  assert.ok(svg.includes('viewBox="0 0 660 360"'));
});

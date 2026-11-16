// Worker tests for the Open-Meteo adapter with a fake (mocked) API, so they never call the real service.
import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchCurrentWeather, WeatherProviderError } from '../src/providers/weatherApi.ts';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

let lastUrl = '';
function mockFetch(body: unknown, status = 200) {
  globalThis.fetch = (async (url: string | URL) => {
    lastUrl = String(url);
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });
  }) as typeof fetch;
}

const good = { current: { time: '2026-11-16T06:30', interval: 900, weather_code: 95, precipitation: 3.2, wind_speed_10m: 41.5, wind_gusts_10m: 68 } };

test('weather: a valid Open-Meteo reply becomes our reading', async () => {
  mockFetch(good);
  const live = await fetchCurrentWeather('https://example.test/v1/forecast', -17.9243, 25.8572);
  assert.deepEqual(live, { weatherCode: 95, rainMm: 3.2, windKmh: 41.5, gustKmh: 68, observedAt: new Date('2026-11-16T06:30:00Z') });
  const url = new URL(lastUrl);
  assert.equal(url.searchParams.get('latitude'), '-17.9243');
  assert.equal(url.searchParams.get('current'), 'weather_code,precipitation,wind_speed_10m,wind_gusts_10m');
  assert.equal(url.searchParams.get('wind_speed_unit'), 'kmh');
});

test('weather: bad replies are rejected, never saved', async () => {
  mockFetch({ current: { ...good.current, wind_speed_10m: -3 } });
  await assert.rejects(fetchCurrentWeather('https://example.test', 0, 0), WeatherProviderError);
  mockFetch({ current: { ...good.current, weather_code: 'storm' } });
  await assert.rejects(fetchCurrentWeather('https://example.test', 0, 0), WeatherProviderError);
  mockFetch({ current: { ...good.current, time: 'yesterday' } });
  await assert.rejects(fetchCurrentWeather('https://example.test', 0, 0), WeatherProviderError);
  mockFetch({ hourly: {} });
  await assert.rejects(fetchCurrentWeather('https://example.test', 0, 0), /no "current" block/);
  mockFetch('<html>oops</html>');
  await assert.rejects(fetchCurrentWeather('https://example.test', 0, 0), /not JSON/);
  mockFetch({}, 429);
  await assert.rejects(fetchCurrentWeather('https://example.test', 0, 0), /rate limit/);
});

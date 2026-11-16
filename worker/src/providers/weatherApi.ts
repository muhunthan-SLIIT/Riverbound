// Adapter for the Open-Meteo weather API (https://open-meteo.com). Free for non-commercial use,
// no API key. This is the ONLY file that knows Open-Meteo's request and reply format.
//
// Request : GET {base}?latitude=..&longitude=..&current=weather_code,precipitation,wind_speed_10m,wind_gusts_10m
//           &wind_speed_unit=kmh&timezone=GMT
// Reply   : { "current": { "time": "2026-11-16T06:30", "weather_code": 61, "precipitation": 0.4,
//                          "wind_speed_10m": 14.2, "wind_gusts_10m": 27.0, ... } }
import { isValidReading, type WeatherReading } from '@riverbound/shared';

export const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

export class WeatherProviderError extends Error {}

export type LiveWeather = WeatherReading & { observedAt: Date };

export async function fetchCurrentWeather(baseUrl: string, latitude: number, longitude: number, timeoutMs = 10_000): Promise<LiveWeather> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'weather_code,precipitation,wind_speed_10m,wind_gusts_10m',
    wind_speed_unit: 'kmh',
    timezone: 'GMT',
  });
  let response: Response;
  try {
    response = await fetch(`${baseUrl}?${params.toString()}`, { signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    throw new WeatherProviderError(`Open-Meteo unreachable: ${(error as Error).message}`);
  }
  if (response.status === 429) throw new WeatherProviderError('Open-Meteo rate limit reached');
  if (!response.ok) throw new WeatherProviderError(`HTTP ${response.status} from Open-Meteo`);

  let body: { current?: Record<string, unknown> };
  try {
    body = (await response.json()) as { current?: Record<string, unknown> };
  } catch {
    throw new WeatherProviderError('Open-Meteo reply is not JSON');
  }
  const current = body.current;
  if (!current) throw new WeatherProviderError('Open-Meteo reply has no "current" block');

  const reading = {
    weatherCode: current.weather_code,
    rainMm: current.precipitation,
    windKmh: current.wind_speed_10m,
    gustKmh: current.wind_gusts_10m,
  };
  if (!isValidReading(reading)) throw new WeatherProviderError('Open-Meteo reply has missing or impossible values');

  // With timezone=GMT the time has no zone suffix, e.g. "2026-11-16T06:30" (UTC).
  // Checked with a strict pattern first: JavaScript's date parser accepts odd text like "yesterday".
  const time = current.time;
  if (typeof time !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(time)) {
    throw new WeatherProviderError('Open-Meteo reply has no valid time');
  }
  const observedAt = new Date(`${time}:00Z`);
  if (Number.isNaN(observedAt.getTime())) throw new WeatherProviderError('Open-Meteo reply has no valid time');
  return { ...reading, observedAt };
}

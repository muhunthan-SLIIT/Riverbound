// River weather (added 16 Nov 2026). Each region is linked to a REAL river place whose usual weather
// fits its difficulty. The worker reads that place's live weather from the Open-Meteo API.
//
//   Easy   -> calm  : light wind, no rain
//   Medium -> rain  : rain and small changes in wind
//   Hard   -> storm : thunderstorm, heavy rain or strong wind / gusts
//
// Real weather does not follow game difficulty, so: if the live weather at the place matches the
// region's level, the game uses it ("Live"). If not (or it is too old / missing), the game uses a
// built-in "Backup" weather of the right level and SAYS so, showing the real reading next to it.
// The server snapshots the weather when a trip starts, so it never changes in the middle of a trip.
import type { RegionId } from './regions.ts';

export type WeatherKind = 'calm' | 'rain' | 'storm';

export type WeatherPlace = {
  regionId: RegionId;
  place: string;
  river: string;
  country: string;
  latitude: number;
  longitude: number;
  /** Why this place fits the level (shown in Help and used in the report). */
  why: string;
};

export const WEATHER_PLACES: readonly WeatherPlace[] = [
  {
    regionId: 'shallow_bend',
    place: 'Aswan',
    river: 'Nile',
    country: 'Egypt',
    latitude: 24.0889,
    longitude: 32.8998,
    why: 'One of the driest and sunniest cities on Earth: calm, clear weather almost every day.',
  },
  {
    regionId: 'reed_marsh',
    place: 'Quibdó',
    river: 'Atrato',
    country: 'Colombia',
    latitude: 5.6947,
    longitude: -76.6583,
    why: 'Often called the rainiest city in the world: rain on most days of the year.',
  },
  {
    regionId: 'rapid_gorge',
    place: 'Victoria Falls (Batoka Gorge)',
    river: 'Zambezi',
    country: 'Zimbabwe / Zambia',
    latitude: -17.9243,
    longitude: 25.8572,
    why: 'Class V rapids in a deep gorge; afternoon thunderstorms in the wet season (about November to March).',
  },
  {
    regionId: 'final_crossing',
    place: 'Catatumbo river mouth, Lake Maracaibo',
    river: 'Catatumbo',
    country: 'Venezuela',
    latitude: 9.1,
    longitude: -71.8,
    why: 'Home of the "everlasting storm": lightning storms on many nights of the year.',
  },
];

/** The weather each region needs, by its difficulty. */
export const REGION_WEATHER: Record<RegionId, WeatherKind> = {
  shallow_bend: 'calm',
  reed_marsh: 'rain',
  rapid_gorge: 'storm',
  final_crossing: 'storm',
};

/** Seconds taken off a timed crossing's timer by the weather (server-decided). */
export const WEATHER_TIMER_PENALTY: Record<WeatherKind, number> = { calm: 0, rain: 5, storm: 5 };

export const WEATHER_KIND_LABEL: Record<WeatherKind, string> = { calm: 'Calm', rain: 'Rain and wind', storm: 'Storm' };

/** Live weather older than this is not trusted (the worker refreshes every 30 minutes). */
export const WEATHER_MAX_AGE_MS = 3 * 60 * 60 * 1000;

/** One weather reading (Open-Meteo "current" values). */
export type WeatherReading = {
  weatherCode: number; // WMO weather code
  rainMm: number; // precipitation in the last 15 minutes / hour, mm
  windKmh: number; // wind speed at 10 m, km/h
  gustKmh: number; // wind gusts at 10 m, km/h
};

// Thresholds (km/h and mm). 39 km/h = Beaufort 6 "strong breeze"; 50 km/h gusts = strong gusts.
const STORM_WIND = 39;
const STORM_GUST = 50;
const HEAVY_RAIN = 7.6; // mm per hour, the usual "heavy rain" level
const BREEZY = 20;

/** Sorts a reading into calm / rain / storm. */
export function classifyWeather(r: WeatherReading): WeatherKind {
  const thunder = r.weatherCode >= 95 && r.weatherCode <= 99;
  if (thunder || r.windKmh >= STORM_WIND || r.gustKmh >= STORM_GUST || r.rainMm >= HEAVY_RAIN) return 'storm';
  const wetCode = (r.weatherCode >= 51 && r.weatherCode <= 86) || r.weatherCode === 45 || r.weatherCode === 48;
  if (wetCode || r.rainMm > 0 || r.windKmh >= BREEZY) return 'rain';
  return 'calm';
}

/** Plain words for a WMO weather code. */
export function describeWeatherCode(code: number): string {
  if (code === 0) return 'Clear sky';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if (code === 61) return 'Slight rain';
  if (code === 63) return 'Moderate rain';
  if (code === 65) return 'Heavy rain';
  if (code === 66 || code === 67) return 'Freezing rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code === 80) return 'Slight rain showers';
  if (code === 81) return 'Rain showers';
  if (code === 82) return 'Violent rain showers';
  if (code === 85 || code === 86) return 'Snow showers';
  if (code === 95) return 'Thunderstorm';
  if (code === 96 || code === 99) return 'Thunderstorm with hail';
  if (code === 97) return 'Heavy thunderstorm';
  return 'Unknown';
}

/** Built-in weather of each level, used when the live weather does not match. */
export const BACKUP_WEATHER: Record<WeatherKind, WeatherReading> = {
  calm: { weatherCode: 1, rainMm: 0, windKmh: 9, gustKmh: 15 },
  rain: { weatherCode: 63, rainMm: 3.5, windKmh: 24, gustKmh: 38 },
  storm: { weatherCode: 95, rainMm: 12, windKmh: 46, gustKmh: 72 },
};

export type RegionWeather = WeatherReading & {
  regionId: RegionId;
  kind: WeatherKind;
  source: 'live' | 'backup';
  condition: string;
  place: string;
  river: string;
  country: string;
  /** When the live reading was taken (ISO), or null if there is none. */
  observedAt: string | null;
  /** For backup weather: what the real place shows right now, e.g. "Clear sky, wind 9 km/h". */
  liveNow: string | null;
  timerPenaltySeconds: number;
};

export function getWeatherPlace(regionId: RegionId): WeatherPlace {
  const place = WEATHER_PLACES.find((p) => p.regionId === regionId);
  if (!place) throw new Error(`No weather place for ${regionId}`);
  return place;
}

function summary(r: WeatherReading): string {
  return `${describeWeatherCode(r.weatherCode)}, wind ${Math.round(r.windKmh)} km/h`;
}

/**
 * The weather a region uses now: the live reading if it is fresh and matches the region's level,
 * otherwise the labelled backup of the right level.
 */
export function resolveRegionWeather(
  regionId: RegionId,
  live: (WeatherReading & { observedAt: Date }) | null,
  now: Date,
): RegionWeather {
  const wanted = REGION_WEATHER[regionId];
  const place = getWeatherPlace(regionId);
  const fresh = live !== null && now.getTime() - live.observedAt.getTime() <= WEATHER_MAX_AGE_MS;
  const matches = fresh && classifyWeather(live) === wanted;
  const reading = matches ? live : BACKUP_WEATHER[wanted];
  return {
    weatherCode: reading.weatherCode,
    rainMm: reading.rainMm,
    windKmh: reading.windKmh,
    gustKmh: reading.gustKmh,
    regionId,
    kind: wanted,
    source: matches ? 'live' : 'backup',
    condition: describeWeatherCode(reading.weatherCode),
    place: place.place,
    river: place.river,
    country: place.country,
    observedAt: fresh ? live.observedAt.toISOString() : null,
    liveNow: !matches && fresh ? summary(live) : null,
    timerPenaltySeconds: WEATHER_TIMER_PENALTY[wanted],
  };
}

/** Checks a reading from outside (the worker validates API data with this). */
export function isValidReading(r: Partial<Record<keyof WeatherReading, unknown>>): r is WeatherReading {
  const ok = (v: unknown, max: number) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max;
  return ok(r.weatherCode, 99) && Number.isInteger(r.weatherCode) && ok(r.rainMm, 500) && ok(r.windKmh, 400) && ok(r.gustKmh, 500);
}

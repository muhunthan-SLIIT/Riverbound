// Loads the river weather for all regions once (GET /api/weather). Weather is extra information:
// if it cannot be loaded, pages still work and simply show no weather.
import { useEffect, useState } from 'react';
import type { RegionId, RegionWeather } from '@riverbound/shared';
import { weatherApi } from '../services/gameApi.ts';

export function useRegionWeather(): Partial<Record<RegionId, RegionWeather>> | null {
  const [weather, setWeather] = useState<Partial<Record<RegionId, RegionWeather>> | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    weatherApi
      .list(controller.signal)
      .then(({ weather: list }) => setWeather(Object.fromEntries(list.map((w) => [w.regionId, w]))))
      .catch(() => {
        if (!controller.signal.aborted) setWeather({});
      });
    return () => controller.abort();
  }, []);
  return weather;
}

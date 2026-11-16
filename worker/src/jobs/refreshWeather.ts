// Reads the live weather at each region's real river place (Open-Meteo) and saves it in MongoDB.
// One failing place does not stop the others. If a place keeps failing, its saved reading gets old
// and the game switches that region to its labelled backup weather (see shared/rules/weather.ts).
import { Weather } from '@riverbound/server/models';
import { WEATHER_PLACES } from '@riverbound/shared';
import { fetchCurrentWeather } from '../providers/weatherApi.ts';

export async function refreshWeather(baseUrl: string): Promise<{ added: number; message: string }> {
  let added = 0;
  const failed: string[] = [];
  for (const place of WEATHER_PLACES) {
    try {
      const live = await fetchCurrentWeather(baseUrl, place.latitude, place.longitude);
      await Weather.updateOne({ regionId: place.regionId }, { $set: { regionId: place.regionId, ...live } }, { upsert: true });
      added += 1;
    } catch (error) {
      failed.push(`${place.place} (${(error as Error).message})`);
    }
  }
  const failText = failed.length ? `; failed: ${failed.join(', ')}` : '';
  return { added, message: `weather saved for ${added}/${WEATHER_PLACES.length} places${failText}` };
}

// River weather for the game: reads the live readings the worker saved, and turns each one into the
// weather a region uses (live if it fits the level, otherwise a labelled backup). See shared/rules/weather.ts.
import type { ClientSession } from 'mongoose';
import { REGION_IDS, resolveRegionWeather, type RegionId, type RegionWeather } from '@riverbound/shared';
import { Weather } from '../models/index.ts';

export async function getRegionWeather(regionId: RegionId, now: Date, session?: ClientSession): Promise<RegionWeather> {
  const live = await Weather.findOne({ regionId }).session(session ?? null).lean();
  return resolveRegionWeather(regionId, live, now);
}

export async function listRegionWeather(now: Date = new Date()): Promise<RegionWeather[]> {
  const saved = await Weather.find({}).lean();
  return REGION_IDS.map((id) => resolveRegionWeather(id, saved.find((w) => w.regionId === id) ?? null, now));
}

// The latest live weather for each region's real river place, saved by the worker from Open-Meteo.
// One document per region. The game never calls the weather API itself: it only reads this.
import { Schema, model } from 'mongoose';
import type { RegionId } from '@riverbound/shared';

export interface IWeather {
  regionId: RegionId;
  weatherCode: number; // WMO weather code
  rainMm: number;
  windKmh: number;
  gustKmh: number;
  observedAt: Date; // time of the reading, from the API
  updatedAt: Date; // when the worker saved it
}

const weatherSchema = new Schema<IWeather>(
  {
    regionId: { type: String, required: true, unique: true },
    weatherCode: { type: Number, required: true, min: 0, max: 99 },
    rainMm: { type: Number, required: true, min: 0 },
    windKmh: { type: Number, required: true, min: 0 },
    gustKmh: { type: Number, required: true, min: 0 },
    observedAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

export const Weather = model<IWeather>('Weather', weatherSchema);

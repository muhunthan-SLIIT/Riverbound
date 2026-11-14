// A game sound chosen by the worker from the Freesound API (CC0 sounds only).
import { Schema, model } from 'mongoose';
import type { SoundKey } from '@riverbound/shared';

export interface ISound {
  key: SoundKey;
  freesoundId: number;
  title: string;
  author: string;
  license: string;
  previewUrl: string;
  sourceUrl: string;
  updatedAt: Date;
}

const soundSchema = new Schema<ISound>(
  {
    key: { type: String, required: true, unique: true },
    freesoundId: { type: Number, required: true },
    title: { type: String, required: true },
    author: { type: String, required: true },
    license: { type: String, required: true },
    previewUrl: { type: String, required: true },
    sourceUrl: { type: String, required: true },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

export const Sound = model<ISound>('Sound', soundSchema);

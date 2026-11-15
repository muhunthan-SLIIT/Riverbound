// A Fish API puzzle (picture + correct fish and chest counts), prepared by the worker.
// Used by river crossings and (rules v2.5) by feeding. A puzzle is given to ONE of them only:
// `usedFor` is set the first time it is handed out, so a feeding puzzle (whose counts are shown in
// the question) can never appear later as a crossing, where the counts are the secret answer.
// The picture is stored here and served through our own API, so the browser never sees the
// provider's file name (which contains the answers).
import { Schema, model, type HydratedDocument } from 'mongoose';

export interface IContent {
  source: 'fish_api' | 'local';
  image: Buffer;
  imageType: string; // e.g. image/png or image/svg+xml
  fishCount: number;
  chestCount: number;
  hash: string; // SHA-256 of the picture, used to skip duplicates
  status: 'ready' | 'quarantined';
  usedFor: 'feeding' | 'crossing' | null; // null = not handed out yet
  note: string;
  createdAt: Date;
}

const contentSchema = new Schema<IContent>(
  {
    source: { type: String, enum: ['fish_api', 'local'], required: true },
    image: { type: Buffer, required: true },
    imageType: { type: String, required: true },
    fishCount: { type: Number, required: true, min: 0 },
    chestCount: { type: Number, required: true, min: 0 },
    hash: { type: String, required: true, unique: true },
    status: { type: String, enum: ['ready', 'quarantined'], default: 'ready' },
    usedFor: { type: String, enum: ['feeding', 'crossing', null], default: null },
    note: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

contentSchema.index({ status: 1, usedFor: 1, chestCount: 1, fishCount: 1 });

export const Content = model<IContent>('Content', contentSchema);
export type ContentDoc = HydratedDocument<IContent>;

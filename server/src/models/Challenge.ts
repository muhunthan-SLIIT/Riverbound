// One question shown to the player: a feeding maths question or a river crossing.
// The correct answer lives only here on the server and is never sent before the answer.
import { Schema, model, type HydratedDocument, type Types } from 'mongoose';
import type { FeedingQuestion, RegionId } from '@riverbound/shared';

export type ChallengeStatus = 'open' | 'correct' | 'wrong' | 'partial' | 'timeout' | 'cancelled';

export interface IChallenge {
  campaign: Types.ObjectId;
  owner: Types.ObjectId;
  type: 'feeding' | 'crossing';
  status: ChallengeStatus;
  // feeding
  batch: Types.ObjectId | null;
  feeding: FeedingQuestion | null;
  // crossing (used from the crossing stage onwards)
  content: Types.ObjectId | null;
  region: RegionId | null;
  encounterIndex: number | null;
  timed: boolean;
  deadline: Date | null;
  hintUsed: boolean; // Mira revealed the fish count for this picture
  replacedBy: Types.ObjectId | null;
  submitted: unknown;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const challengeSchema = new Schema<IChallenge>(
  {
    campaign: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['feeding', 'crossing'], required: true },
    status: { type: String, enum: ['open', 'correct', 'wrong', 'partial', 'timeout', 'cancelled'], default: 'open' },
    batch: { type: Schema.Types.ObjectId, ref: 'FeedingBatch', default: null },
    feeding: { type: Schema.Types.Mixed, default: null },
    content: { type: Schema.Types.ObjectId, ref: 'Content', default: null },
    region: { type: String, default: null },
    encounterIndex: { type: Number, default: null },
    timed: { type: Boolean, default: false },
    deadline: { type: Date, default: null },
    hintUsed: { type: Boolean, default: false },
    replacedBy: { type: Schema.Types.ObjectId, ref: 'Challenge', default: null },
    submitted: { type: Schema.Types.Mixed, default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true, optimisticConcurrency: true },
);

// Lets the server quickly find which pictures a campaign has already seen.
challengeSchema.index({ campaign: 1, type: 1, content: 1 });

export const Challenge = model<IChallenge>('Challenge', challengeSchema);
export type ChallengeDoc = HydratedDocument<IChallenge>;

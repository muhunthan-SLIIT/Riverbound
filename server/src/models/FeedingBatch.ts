// A batch of 4 reserved fish waiting to be fed through a maths question.
import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export type BatchStatus = 'reserved' | 'fed' | 'cancelled';

export interface IFeedingBatch {
  campaign: Types.ObjectId;
  owner: Types.ObjectId;
  fishCount: number;
  status: BatchStatus;
  activeChallengeId: Types.ObjectId | null;
  attempts: number;
  rewardClaimed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const batchSchema = new Schema<IFeedingBatch>(
  {
    campaign: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fishCount: { type: Number, required: true },
    status: { type: String, enum: ['reserved', 'fed', 'cancelled'], default: 'reserved' },
    activeChallengeId: { type: Schema.Types.ObjectId, ref: 'Challenge', default: null },
    attempts: { type: Number, default: 0 },
    rewardClaimed: { type: Boolean, default: false },
  },
  { timestamps: true, optimisticConcurrency: true },
);

// At most one reserved (unfinished) batch per campaign.
batchSchema.index({ campaign: 1 }, { unique: true, partialFilterExpression: { status: 'reserved' }, name: 'one_reserved_batch' });

export const FeedingBatch = model<IFeedingBatch>('FeedingBatch', batchSchema);
export type FeedingBatchDoc = HydratedDocument<IFeedingBatch>;

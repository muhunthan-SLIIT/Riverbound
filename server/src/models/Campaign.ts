// One saved game (campaign). The inventory is stored inside the campaign document,
// so wallet + fish + items always change together in one atomic write.
import { Schema, model, type HydratedDocument, type Types } from 'mongoose';
import type { CampaignState, CharacterId, CompanionId, ItemId, RegionId } from '@riverbound/shared';

export interface ICampaign {
  owner: Types.ObjectId;
  character: CharacterId;
  characterName: string;
  rulesVersion: string;
  state: CampaignState;
  unfinished: boolean; // true until completed or abandoned; used for the "one unfinished campaign" rule
  hearts: number;
  coins: number;
  score: number;
  regionsCleared: RegionId[];
  companions: CompanionId[];
  introDone: boolean;
  tutorialDone: boolean;
  activeFeedingBatchId: Types.ObjectId | null;
  activeChallengeId: Types.ObjectId | null;
  inventory: {
    unfedAvailable: number;
    unfedReserved: number;
    fedAvailable: number;
    ownedItems: ItemId[];
  };
  totals: {
    fishCaught: number;
    saleIncome: number;
    feedingBonus: number;
    crossingLoot: number;
    fishSold: number;
    spent: number;
  };
  stats: {
    feedingAnswers: number;
    feedingCorrect: number;
    crossingAnswers: number;
    crossingPerfect: number;
    crossingPartial: number;
    crossingHinted: number;
    crossingPerfectUnassisted: number;
    crossingAnswersUnassisted: number;
  };
  // The current trip down the river (null at camp). Kept after a failure so the failure page can describe it.
  expedition: {
    regionId: RegionId;
    encounterIndex: number;
    timed: boolean;
    medicUsed: boolean;
    // Crossings cleared on this trip (for the Region Complete page).
    log: CrossingLog[];
  } | null;
  regionResults: {
    regionId: RegionId;
    crossings: CrossingLog[];
    heartsRemaining: number;
    bonusPoints: number;
    coinsEarned: number;
    pointsEarned: number;
    walletAfter: number;
    clearedAt: Date;
  }[];
  // "shallow_bend:0" style keys: crossings that already paid coins/points. Never paid twice, even after a failure.
  rewardedEncounters: string[];
  scoutUsedRegions: RegionId[];
  createdAt: Date;
  updatedAt: Date;
}

export type CrossingLog = { index: number; result: 'perfect' | 'partial'; coins: number; points: number; alreadyRewarded: boolean };

const crossingLogSchema = new Schema<CrossingLog>(
  {
    index: { type: Number, required: true, min: 0 },
    result: { type: String, enum: ['perfect', 'partial'], required: true },
    coins: { type: Number, required: true, min: 0 },
    points: { type: Number, required: true, min: 0 },
    alreadyRewarded: { type: Boolean, default: false },
  },
  { _id: false },
);

const nonNegativeInt = () => ({ type: Number, required: true, default: 0, min: 0, validate: Number.isInteger });

const campaignSchema = new Schema<ICampaign>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    character: { type: String, enum: ['female', 'male'], required: true },
    characterName: { type: String, required: true, trim: true },
    rulesVersion: { type: String, required: true },
    state: { type: String, enum: ['at_camp', 'feeding', 'crossing', 'failed', 'completed', 'abandoned'], default: 'at_camp' },
    unfinished: { type: Boolean, default: true },
    hearts: { type: Number, required: true, default: 3, min: 0, max: 3 },
    coins: nonNegativeInt(),
    score: nonNegativeInt(),
    regionsCleared: { type: [String], default: [] },
    companions: { type: [String], default: [] },
    introDone: { type: Boolean, default: false },
    tutorialDone: { type: Boolean, default: false },
    activeFeedingBatchId: { type: Schema.Types.ObjectId, ref: 'FeedingBatch', default: null },
    activeChallengeId: { type: Schema.Types.ObjectId, ref: 'Challenge', default: null },
    inventory: {
      unfedAvailable: nonNegativeInt(),
      unfedReserved: nonNegativeInt(),
      fedAvailable: nonNegativeInt(),
      ownedItems: { type: [String], default: [] },
    },
    totals: {
      fishCaught: nonNegativeInt(),
      saleIncome: nonNegativeInt(),
      feedingBonus: nonNegativeInt(),
      crossingLoot: nonNegativeInt(),
      fishSold: nonNegativeInt(),
      spent: nonNegativeInt(),
    },
    stats: {
      feedingAnswers: nonNegativeInt(),
      feedingCorrect: nonNegativeInt(),
      crossingAnswers: nonNegativeInt(),
      crossingPerfect: nonNegativeInt(),
      crossingPartial: nonNegativeInt(),
      crossingHinted: nonNegativeInt(),
      crossingPerfectUnassisted: nonNegativeInt(),
      crossingAnswersUnassisted: nonNegativeInt(),
    },
    expedition: {
      type: new Schema(
        {
          regionId: { type: String, required: true },
          encounterIndex: { type: Number, required: true, min: 0 },
          timed: { type: Boolean, required: true },
          medicUsed: { type: Boolean, default: false },
          log: { type: [crossingLogSchema], default: [] },
        },
        { _id: false },
      ),
      default: null,
    },
    regionResults: {
      type: [
        new Schema(
          {
            regionId: { type: String, required: true },
            crossings: { type: [crossingLogSchema], default: [] },
            heartsRemaining: { type: Number, required: true, min: 0 },
            bonusPoints: { type: Number, required: true, min: 0 },
            coinsEarned: { type: Number, required: true, min: 0 },
            pointsEarned: { type: Number, required: true, min: 0 },
            walletAfter: { type: Number, required: true, min: 0 },
            clearedAt: { type: Date, required: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    rewardedEncounters: { type: [String], default: [] },
    scoutUsedRegions: { type: [String], default: [] },
  },
  // optimisticConcurrency: if two browser tabs save the same campaign at once, the second save fails safely.
  { timestamps: true, optimisticConcurrency: true },
);

// Only ONE unfinished campaign per account (enforced by the database itself).
campaignSchema.index({ owner: 1 }, { unique: true, partialFilterExpression: { unfinished: true }, name: 'one_unfinished_per_owner' });

export const Campaign = model<ICampaign>('Campaign', campaignSchema);
export type CampaignDoc = HydratedDocument<ICampaign>;

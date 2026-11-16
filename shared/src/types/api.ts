// Shapes of the data the backend sends to the frontend (DTO = data transfer object).
// These never contain secret answers.
import type { CharacterId } from '../rules/constants.ts';
import type { AnswerKind, FeedingType, FeedingParams } from '../rules/feeding.ts';
import type { ItemId, ItemState } from '../rules/shop.ts';
import type { CompanionId, RegionId } from '../rules/regions.ts';
import type { RegionWeather } from '../rules/weather.ts';

export type CampaignState = 'at_camp' | 'feeding' | 'crossing' | 'failed' | 'completed' | 'abandoned';

export type UserDTO = { id: string; email: string; explorerName: string };

export type InventoryDTO = {
  unfedAvailable: number;
  unfedReserved: number;
  fedAvailable: number;
  ownedItems: ItemId[];
};

export type CampaignDTO = {
  id: string;
  character: CharacterId;
  characterName: string;
  rulesVersion: string;
  state: CampaignState;
  hearts: number;
  coins: number;
  score: number;
  regionsCleared: RegionId[];
  companions: CompanionId[];
  introDone: boolean;
  tutorialDone: boolean;
  activeFeedingBatchId: string | null;
  activeChallengeId: string | null;
  inventory: InventoryDTO;
  totals: { fishCaught: number; saleIncome: number; feedingBonus: number; crossingLoot: number; fishSold: number; spent: number };
  /** The current trip down the river, or null at camp. */
  expedition: ExpeditionDTO | null;
  /** Regions where Mira's fish-count hint was already used (once per region per campaign). */
  scoutUsedRegions: RegionId[];
  /** One summary per cleared region, in the order they were cleared (for the Region Complete and Escape pages). */
  regionResults: RegionResultDTO[];
  stats: CampaignStatsDTO;
  createdAt: string;
  updatedAt: string;
};

export type ExpeditionDTO = {
  regionId: RegionId;
  encounterIndex: number; // 0-based: which crossing the player is on now
  encounters: number; // total crossings in this region
  timed: boolean;
  medicUsed: boolean;
  /** Weather fixed when the trip started (live from the real river place, or labelled backup). */
  weather: RegionWeather | null;
};

export type CrossingLogDTO = {
  index: number; // 0-based crossing number in the region
  result: 'perfect' | 'partial';
  coins: number; // 0 when this crossing already paid on an earlier trip
  points: number;
  alreadyRewarded: boolean;
};

export type RegionResultDTO = {
  regionId: RegionId;
  crossings: CrossingLogDTO[]; // the crossings of the trip that cleared the region
  heartsRemaining: number;
  bonusPoints: number;
  coinsEarned: number; // crossing loot on the clearing trip
  pointsEarned: number; // crossing points + region bonus on the clearing trip
  walletAfter: number;
  clearedAt: string;
};

export type CampaignStatsDTO = {
  feedingAnswers: number;
  feedingCorrect: number;
  crossingAnswers: number;
  crossingPerfect: number;
  crossingPartial: number;
  crossingHinted: number;
  crossingPerfectUnassisted: number;
  crossingAnswersUnassisted: number;
};

export type CrossingChallengeDTO = {
  id: string;
  type: 'crossing';
  regionId: RegionId;
  encounterIndex: number;
  encounters: number;
  timed: boolean;
  deadline: string | null; // ISO time set by the server; refresh never restarts it
  status: 'open' | 'correct' | 'partial' | 'wrong' | 'timeout' | 'cancelled';
  imageUrl: string; // our own opaque route, never the provider's file name
  hintFish: number | null; // only after Mira's hint was used on this picture
  /** Correct counts: only after the challenge is resolved. */
  solution: { fish: number; chests: number } | null;
};

export type ChallengeDTO = FeedingChallengeDTO | CrossingChallengeDTO;

export type CrossingAnswerResult = {
  result: 'perfect' | 'partial' | 'incorrect' | 'timeout';
  coinsAwarded: number;
  pointsAwarded: number;
  heartsLost: number;
  alreadyRewarded: boolean; // true when this crossing paid out on an earlier trip
  cleared: boolean;
  failed: boolean;
  regionCleared: { regionId: RegionId; companion: CompanionId | null; bonusPoints: number } | null;
  completed: boolean;
  solution: { fish: number; chests: number };
  challenge: CrossingChallengeDTO;
  campaign: CampaignDTO;
};

export type FeedingChallengeDTO = {
  id: string;
  type: 'feeding';
  batchId: string;
  question: { type: FeedingType; text: string; answerKind: AnswerKind; params: FeedingParams };
  imageUrl: string | null; // v2.5: the Fish API picture (fish + food chests); null for old batches
  status: 'open' | 'correct' | 'wrong' | 'cancelled';
  workedSolution: string[] | null; // only after a wrong answer
};

export type ShopItemDTO = {
  id: ItemId;
  name: string;
  price: number;
  purpose: string;
  state: ItemState;
};

export type SoundDTO = {
  key: string; // game event, e.g. "catch"
  url: string; // public preview URL
  title: string;
  author: string;
  license: string;
  sourceUrl: string;
};

export type ApiErrorBody = { error: { code: string; message: string } };

/** One row of the leaderboard (finished journeys only). Only public game data: never an email or account ID. */
export type LeaderboardEntryDTO = {
  rank: number;
  explorerName: string;
  character: CharacterId;
  score: number;
  perfectRate: number | null; // % of crossing answers with both counts right
  finishedAt: string; // ISO date when the player reached the rescue dock
  isYou: boolean;
};

export type LeaderboardDTO = {
  entries: LeaderboardEntryDTO[]; // the top rows
  you: LeaderboardEntryDTO | null; // your best finished journey, or null if you have not finished yet
  totalPlayers: number; // players who have finished
};

/** GET /api/weather: the weather each region would use if a trip started now. */
export type WeatherListDTO = { weather: RegionWeather[] };

// Typed functions for every backend endpoint the pages use.
// Pages call these instead of writing fetch() themselves.
import type {
  CampaignDTO,
  CharacterId,
  CompanionId,
  CrossingAnswerResult,
  CrossingChallengeDTO,
  FeedingAnswer,
  LeaderboardDTO,
  FeedingChallengeDTO,
  ItemId,
  RegionId,
  ShopItem,
  ShopItemDTO,
  SoundDTO,
  UserDTO,
} from '@riverbound/shared';
import { api } from './apiClient.ts';

type CampaignResponse = { campaign: CampaignDTO };
type FeedingStart = { batchId: string; challenge: FeedingChallengeDTO; campaign: CampaignDTO };

export const authApi = {
  register: (body: { explorerName: string; email: string; password: string; confirmPassword: string }) =>
    api.post<{ user: UserDTO }>('/auth/register', body),
  login: (body: { email: string; password: string }) => api.post<{ user: UserDTO }>('/auth/login', body),
  logout: () => api.post<{ ok: true }>('/auth/logout'),
  session: (signal?: AbortSignal) => api.get<{ user: UserDTO }>('/auth/session', signal),
  /** Which sign-in buttons work on this server (Google needs keys in server/.env). */
  providers: (signal?: AbortSignal) => api.get<{ google: boolean; apple: boolean }>('/auth/providers', signal),
};

/** Full-page address that starts Google sign-in. It is a normal link, not a fetch: the browser must visit Google. */
export const GOOGLE_SIGN_IN_URL = '/api/auth/google/start';

export const campaignApi = {
  list: () => api.get<{ campaigns: CampaignDTO[] }>('/campaigns'),
  create: (character: CharacterId, characterName: string, key?: string) =>
    api.post<CampaignResponse>('/campaigns', { character, characterName }, key),
  get: (id: string, signal?: AbortSignal) => api.get<CampaignResponse>(`/campaigns/${id}`, signal),
  abandon: (id: string) => api.post<CampaignResponse>(`/campaigns/${id}/abandon`, { confirm: true }),
  storyStep: (id: string, step: 'intro' | 'tutorial') => api.post<CampaignResponse>(`/campaigns/${id}/story`, { step }),
};

export const campApi = {
  catchFish: (id: string, key?: string) => api.post<{ caught: number; campaign: CampaignDTO }>(`/campaigns/${id}/fish/catch`, {}, key),
  sell: (id: string, quantity: number, key?: string) =>
    api.post<{ sold: number; earned: number; campaign: CampaignDTO }>(`/campaigns/${id}/fish/sell`, { quantity }, key),
  catalogue: () => api.get<{ items: ShopItem[] }>('/shop'),
  shop: (id: string) => api.get<{ items: ShopItemDTO[] }>(`/campaigns/${id}/shop`),
  buy: (id: string, itemId: ItemId, key?: string) => api.post<{ itemId: ItemId; campaign: CampaignDTO }>(`/campaigns/${id}/buy`, { itemId }, key),
  rest: (id: string) => api.post<CampaignResponse>(`/campaigns/${id}/camp/rest`),
};

export type FeedingAnswerResponse = {
  result: 'correct' | 'wrong';
  coinsAwarded: number;
  correctAnswer: FeedingAnswer;
  workedSolution: string[] | null;
  challenge: FeedingChallengeDTO;
  campaign: CampaignDTO;
};

export const feedingApi = {
  start: (id: string, key?: string) => api.post<FeedingStart>(`/campaigns/${id}/feeding/start`, {}, key),
  active: (id: string) => api.get<{ active: { batchId: string; challenge: FeedingChallengeDTO } | null }>(`/campaigns/${id}/feeding/active`),
  answer: (challengeId: string, answer: FeedingAnswer, key?: string) =>
    api.post<FeedingAnswerResponse>(`/challenges/${challengeId}/answer`, answer, key),
  retry: (batchId: string) => api.post<FeedingStart>(`/feeding-batches/${batchId}/retry`),
  cancel: (batchId: string) => api.post<CampaignResponse>(`/feeding-batches/${batchId}/cancel`),
};

type CrossingStart = { challenge: CrossingChallengeDTO; campaign: CampaignDTO };

export const crossingApi = {
  start: (id: string, regionId: RegionId, timed: boolean, key?: string) =>
    api.post<CrossingStart>(`/campaigns/${id}/route/start`, { regionId, timed }, key),
  next: (id: string, key?: string) => api.post<CrossingStart>(`/campaigns/${id}/route/next`, {}, key),
  get: (challengeId: string, signal?: AbortSignal) => api.get<{ challenge: CrossingChallengeDTO }>(`/challenges/${challengeId}`, signal),
  answer: (challengeId: string, body: { fish: number; chests: number } | { timeout: true }, key?: string) =>
    api.post<CrossingAnswerResult>(`/challenges/${challengeId}/answer`, body, key),
  replace: (challengeId: string, key?: string) => api.post<CrossingStart>(`/challenges/${challengeId}/replacement`, {}, key),
  useCompanion: (id: string, companion: CompanionId, key?: string) =>
    api.post<{ hintFish: number | null; challenge: CrossingChallengeDTO | null; campaign: CampaignDTO }>(`/campaigns/${id}/companions/${companion}/use`, {}, key),
  returnToCamp: (id: string, key?: string) => api.post<CampaignResponse>(`/campaigns/${id}/return-to-camp`, {}, key),
};

export const leaderboardApi = {
  get: (signal?: AbortSignal) => api.get<LeaderboardDTO>('/leaderboard', signal),
};

export const soundApi = {
  list: () => api.get<{ sounds: SoundDTO[] }>('/sounds'),
};

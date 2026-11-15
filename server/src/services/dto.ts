// Turns database documents into the safe shapes sent to the browser (no secret answers).
import {
  isItemId,
  getItemState,
  getRegion,
  SHOP_ITEMS,
  workedSolution,
  type CampaignDTO,
  type CrossingChallengeDTO,
  type FeedingChallengeDTO,
  type ShopItemDTO,
} from '@riverbound/shared';
import type { CampaignDoc, ChallengeDoc, ContentDoc } from '../models/index.ts';

export function toCampaignDTO(c: CampaignDoc): CampaignDTO {
  const inv = c.inventory;
  return {
    id: c._id.toString(),
    character: c.character,
    characterName: c.characterName,
    rulesVersion: c.rulesVersion,
    state: c.state,
    hearts: c.hearts,
    coins: c.coins,
    score: c.score,
    regionsCleared: [...c.regionsCleared],
    companions: [...c.companions],
    introDone: c.introDone,
    tutorialDone: c.tutorialDone,
    activeFeedingBatchId: c.activeFeedingBatchId?.toString() ?? null,
    activeChallengeId: c.activeChallengeId?.toString() ?? null,
    inventory: {
      unfedAvailable: inv.unfedAvailable,
      unfedReserved: inv.unfedReserved,
      fedAvailable: inv.fedAvailable,
      // Old test saves may still hold removed fishing tools (v2.3); only current items are shown.
      ownedItems: inv.ownedItems.filter(isItemId),
    },
    totals: {
      fishCaught: c.totals.fishCaught,
      saleIncome: c.totals.saleIncome,
      feedingBonus: c.totals.feedingBonus,
      crossingLoot: c.totals.crossingLoot,
      fishSold: c.totals.fishSold,
      spent: c.totals.spent,
    },
    expedition: c.expedition
      ? {
          regionId: c.expedition.regionId,
          encounterIndex: c.expedition.encounterIndex,
          encounters: getRegion(c.expedition.regionId).encounters,
          timed: c.expedition.timed,
          medicUsed: c.expedition.medicUsed,
        }
      : null,
    scoutUsedRegions: [...c.scoutUsedRegions],
    regionResults: c.regionResults.map((r) => ({
      regionId: r.regionId,
      crossings: r.crossings.map((x) => ({ index: x.index, result: x.result, coins: x.coins, points: x.points, alreadyRewarded: x.alreadyRewarded })),
      heartsRemaining: r.heartsRemaining,
      bonusPoints: r.bonusPoints,
      coinsEarned: r.coinsEarned,
      pointsEarned: r.pointsEarned,
      walletAfter: r.walletAfter,
      clearedAt: r.clearedAt.toISOString(),
    })),
    stats: {
      feedingAnswers: c.stats.feedingAnswers,
      feedingCorrect: c.stats.feedingCorrect,
      crossingAnswers: c.stats.crossingAnswers,
      crossingPerfect: c.stats.crossingPerfect,
      crossingPartial: c.stats.crossingPartial,
      crossingHinted: c.stats.crossingHinted,
      crossingPerfectUnassisted: c.stats.crossingPerfectUnassisted,
      crossingAnswersUnassisted: c.stats.crossingAnswersUnassisted,
    },
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export function toFeedingChallengeDTO(ch: ChallengeDoc): FeedingChallengeDTO {
  const q = ch.feeding;
  if (!q || !ch.batch) throw new Error('Not a feeding challenge');
  const status = ch.status === 'correct' || ch.status === 'wrong' || ch.status === 'cancelled' ? ch.status : 'open';
  return {
    id: ch._id.toString(),
    type: 'feeding',
    batchId: ch.batch.toString(),
    // params are safe to show: the player needs them to draw the fish and crates. The answer is not included.
    question: { type: q.type, text: q.text, answerKind: q.answerKind, params: q.params },
    // v2.5: the Fish API picture this question is built from (served from our own URL, owner only).
    imageUrl: ch.content ? `/api/challenges/${ch._id.toString()}/image` : null,
    status,
    workedSolution: ch.status === 'wrong' ? workedSolution(q) : null,
  };
}

export function toShopDTO(owned: CampaignDoc['inventory']['ownedItems'], coins: number): ShopItemDTO[] {
  return SHOP_ITEMS.map((item) => ({
    id: item.id,
    name: item.name,
    price: item.price,
    purpose: item.purpose,
    state: getItemState(item.id, owned, coins),
  }));
}

/**
 * A crossing for the browser. The correct counts are included ONLY after the crossing is resolved.
 * `content` is needed for the hint (fish count) and for the solution after answering.
 */
export function toCrossingChallengeDTO(ch: ChallengeDoc, content: Pick<ContentDoc, 'fishCount' | 'chestCount'>): CrossingChallengeDTO {
  if (ch.type !== 'crossing' || !ch.region || ch.encounterIndex === null) throw new Error('Not a crossing challenge');
  const resolved = ch.status !== 'open';
  return {
    id: ch._id.toString(),
    type: 'crossing',
    regionId: ch.region,
    encounterIndex: ch.encounterIndex,
    encounters: getRegion(ch.region).encounters,
    timed: ch.timed,
    deadline: ch.deadline?.toISOString() ?? null,
    status: ch.status === 'correct' || ch.status === 'partial' || ch.status === 'wrong' || ch.status === 'timeout' || ch.status === 'cancelled' ? ch.status : 'open',
    imageUrl: `/api/challenges/${ch._id.toString()}/image`,
    hintFish: ch.hintUsed ? content.fishCount : null,
    solution: resolved && ch.status !== 'cancelled' ? { fish: content.fishCount, chests: content.chestCount } : null,
  };
}

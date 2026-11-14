// Resolves one river-crossing answer: fish count + chest count.
import { CHEST_LOOT_COINS, POINTS_PARTIAL, POINTS_PERFECT } from './constants.ts';

export type CrossingCategory = 'perfect' | 'partial' | 'incorrect' | 'timeout';

export type CrossingInput = {
  fishAnswer: number | null;
  chestAnswer: number | null;
  fishCount: number;
  chestCount: number;
  heartsBefore: number;
  expired: boolean;
};

export type CrossingOutcome = {
  category: CrossingCategory;
  coins: number;
  points: number;
  heartsAfter: number;
  cleared: boolean;
  failed: boolean; // true when hearts reach 0 and the player must return to camp
};

export function resolveCrossing(input: CrossingInput): CrossingOutcome {
  const loot = input.chestCount * CHEST_LOOT_COINS;
  const loseHeart = (category: CrossingCategory): CrossingOutcome => {
    const heartsAfter = Math.max(0, input.heartsBefore - 1);
    return { category, coins: 0, points: 0, heartsAfter, cleared: false, failed: heartsAfter === 0 };
  };

  // A late answer counts as a timeout, even if it is correct.
  if (input.expired) return loseHeart('timeout');

  const fishRight = input.fishAnswer === input.fishCount;
  const chestRight = input.chestAnswer === input.chestCount;

  if (fishRight && chestRight) {
    return { category: 'perfect', coins: loot, points: POINTS_PERFECT, heartsAfter: input.heartsBefore, cleared: true, failed: false };
  }
  if (fishRight || chestRight) {
    const heartsAfter = Math.max(0, input.heartsBefore - 1);
    if (heartsAfter === 0) {
      // One right on the last heart: no loot, not cleared, back to camp.
      return { category: 'partial', coins: 0, points: 0, heartsAfter, cleared: false, failed: true };
    }
    return { category: 'partial', coins: Math.floor(loot / 2), points: POINTS_PARTIAL, heartsAfter, cleared: true, failed: false };
  }
  return loseHeart('incorrect');
}

/** Checks a crossing answer from a request body: two whole numbers from 0 to 99. */
export function parseCrossingAnswer(raw: unknown): { fish: number; chests: number } | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const body = raw as Record<string, unknown>;
  const ok = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 99;
  return ok(body.fish) && ok(body.chests) ? { fish: body.fish, chests: body.chests } : null;
}

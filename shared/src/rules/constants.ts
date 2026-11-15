// Core numbers of the Riverbound game rules (version 2.2).
// The server is the only place that applies these rules; the client only displays them.

export const RULES_VERSION = '2.5'; // 2.3: fishing tools removed; 2.4: random 1-4 catch; 2.5: feeding uses Fish API puzzles

export const MAX_HEARTS = 3;
// Feeding (rules v2.5, 15 Nov 2026): you need at least 12 unfed fish to start feeding.
// The batch size is the fish count of a Fish API puzzle (1-12), so the question always matches
// the fish you really reserve. 12 is the most fish a feeding puzzle can have.
export const FEED_MIN_UNFED = 12;
export const FEED_PUZZLE_FISH_MAX = FEED_MIN_UNFED;
export const FEED_BONUS_COINS = 5;
export const FISH_SALE_PRICE = 10;
export const CHEST_LOOT_COINS = 10;

export const POINTS_PERFECT = 100;
export const POINTS_PARTIAL = 50;
export const POINTS_PER_HEART_REGION_BONUS = 50;

export const EXPLORER_NAME_MIN = 2;
export const EXPLORER_NAME_MAX = 30;
export const CHARACTER_NAME_MIN = 1;
export const CHARACTER_NAME_MAX = 20;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export const CHARACTERS = {
  female: { id: 'female', defaultName: 'Alex' },
  male: { id: 'male', defaultName: 'Finn' },
} as const;

export type CharacterId = keyof typeof CHARACTERS;

export function isCharacterId(value: unknown): value is CharacterId {
  return value === 'female' || value === 'male';
}

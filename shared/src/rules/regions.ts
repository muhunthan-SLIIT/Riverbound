// The river regions, in the order the player travels them.
import type { ItemId } from './shop.ts';

export const COMPANION_IDS = ['mira', 'jonah', 'tess'] as const;
export type CompanionId = (typeof COMPANION_IDS)[number];

export const COMPANIONS: Record<CompanionId, { name: string; role: string; ability: string }> = {
  mira: { name: 'Mira', role: 'Scout', ability: 'Reveals the fish count once per region.' },
  jonah: { name: 'Jonah', role: 'Medic', ability: 'Restores one heart once per expedition.' },
  tess: { name: 'Tess', role: 'Navigator', ability: 'Highlights the next route objective.' },
};

export const REGION_IDS = ['shallow_bend', 'reed_marsh', 'rapid_gorge', 'final_crossing'] as const;
export type RegionId = (typeof REGION_IDS)[number];

export type Region = {
  id: RegionId;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  encounters: number;
  timerSeconds: number;
  chestMax: number;
  fishMax: number;
  requiredItems: ItemId[];
  rescues: CompanionId | null;
  hazards: string;
};

const BASIC_KIT: ItemId[] = ['river_map', 'compass', 'swimming_goggles', 'swimming_outfit'];

export const REGIONS: readonly Region[] = [
  { id: 'shallow_bend', name: 'Shallow Bend', difficulty: 'easy', encounters: 3, timerSeconds: 45, chestMax: 4, fishMax: 12, requiredItems: BASIC_KIT, rescues: 'mira', hazards: 'Branches and stepping stones' },
  { id: 'reed_marsh', name: 'Reed Marsh', difficulty: 'medium', encounters: 4, timerSeconds: 35, chestMax: 5, fishMax: 12, requiredItems: [...BASIC_KIT, 'life_jacket'], rescues: 'jonah', hazards: 'Fog, reeds and strong current' },
  { id: 'rapid_gorge', name: 'Rapid Gorge', difficulty: 'hard', encounters: 5, timerSeconds: 30, chestMax: 6, fishMax: 12, requiredItems: [...BASIC_KIT, 'life_jacket', 'rescue_rope'], rescues: 'tess', hazards: 'Rocks, rapids and a broken crossing' },
  { id: 'final_crossing', name: 'Final crossing', difficulty: 'hard', encounters: 3, timerSeconds: 30, chestMax: 6, fishMax: 12, requiredItems: [...BASIC_KIT, 'life_jacket', 'rescue_rope', 'boat'], rescues: null, hazards: 'All river hazards together' },
];

export function isRegionId(value: unknown): value is RegionId {
  return typeof value === 'string' && (REGION_IDS as readonly string[]).includes(value);
}

export function getRegion(id: RegionId): Region {
  const region = REGIONS.find((r) => r.id === id);
  if (!region) throw new Error(`Unknown region ${id}`);
  return region;
}

/** Content is only used in a region if its counts fit that region's limits (v2.2). */
export function contentFitsRegion(region: Region, fish: number, chests: number): boolean {
  return fish >= 1 && fish <= region.fishMax && chests >= 1 && chests <= region.chestMax;
}

/** Name of the camp the player is at, based on how many regions they have cleared. */
export function campNameFor(regionsCleared: number): string {
  const camps = ['Riverside camp', 'Shallow Bend camp', 'Reed Marsh camp', 'Rapid Gorge camp'];
  return camps[Math.min(Math.max(regionsCleared, 0), camps.length - 1)] ?? 'Riverside camp';
}

export type RouteStatus = 'cleared' | 'available' | 'locked';

/**
 * Where a region stands for this player.
 * cleared   = already completed
 * available = the next region to travel (gear may still be missing)
 * locked    = an earlier region must be cleared first
 */
export function routeStatus(regionId: RegionId, regionsCleared: readonly string[]): RouteStatus {
  if (regionsCleared.includes(regionId)) return 'cleared';
  const index = REGIONS.findIndex((r) => r.id === regionId);
  return index === regionsCleared.length ? 'available' : 'locked';
}

/** Gear still needed for a region (empty list = ready). */
export function missingGear(regionId: RegionId, owned: readonly ItemId[]): ItemId[] {
  return getRegion(regionId).requiredItems.filter((item) => !owned.includes(item));
}

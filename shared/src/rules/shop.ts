// The shop catalogue and the purchase order rules.
// Item IDs never change because saves store them. Display names follow the Figma design.
// v2.3: the fishing tools (rod, reel, hook, net, trap) were removed from the game at the author's request.
// Every catch is bare hands (1 fish). Only the map, compass and travel gear are sold.

export const ITEM_IDS = [
  'river_map',
  'compass',
  'swimming_goggles',
  'swimming_outfit',
  'life_jacket',
  'rescue_rope',
  'boat',
] as const;

export type ItemId = (typeof ITEM_IDS)[number];

export type ShopItem = {
  id: ItemId;
  name: string;
  price: number;
  purpose: string;
  requires: ItemId[];
};

export const SHOP_ITEMS: readonly ShopItem[] = [
  { id: 'river_map', name: 'River map', price: 30, purpose: 'Reveal the river journey', requires: [] },
  { id: 'compass', name: 'Compass', price: 40, purpose: 'Find your bearings', requires: ['river_map'] },
  { id: 'swimming_goggles', name: 'Swimming goggles', price: 30, purpose: 'See through the shallows', requires: [] },
  { id: 'swimming_outfit', name: 'Swimming outfit', price: 40, purpose: 'Prepare for cold currents', requires: [] },
  { id: 'life_jacket', name: 'Life jacket', price: 60, purpose: 'Required at Reed Marsh', requires: [] },
  { id: 'rescue_rope', name: 'Rope', price: 80, purpose: 'Required at Rapid Gorge', requires: [] },
  { id: 'boat', name: 'Boat', price: 180, purpose: 'Bring your crew home', requires: [] },
];

export function isItemId(value: unknown): value is ItemId {
  return typeof value === 'string' && (ITEM_IDS as readonly string[]).includes(value);
}

export function getShopItem(id: ItemId): ShopItem {
  const item = SHOP_ITEMS.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Unknown item ${id}`);
  return item;
}

export type ItemState =
  | { status: 'owned' }
  | { status: 'locked'; reason: string }
  | { status: 'need_coins'; shortfall: number }
  | { status: 'buyable' };

/**
 * Decides whether one item can be bought right now.
 * Order rule: map first, compass second, then everything else.
 */
export function getItemState(id: ItemId, owned: readonly ItemId[], coins: number): ItemState {
  if (owned.includes(id)) return { status: 'owned' };

  const hasMap = owned.includes('river_map');
  const hasCompass = owned.includes('compass');
  if (!hasMap && id !== 'river_map') return { status: 'locked', reason: 'Buy the river map first.' };
  if (hasMap && !hasCompass && id !== 'compass') return { status: 'locked', reason: 'Buy the compass first.' };

  const item = getShopItem(id);
  const missing = item.requires.filter((required) => !owned.includes(required));
  if (missing.length > 0) {
    const names = missing.map((m) => getShopItem(m).name).join(' and ');
    return { status: 'locked', reason: `Buy the ${names} first.` };
  }

  if (coins < item.price) return { status: 'need_coins', shortfall: item.price - coins };
  return { status: 'buyable' };
}

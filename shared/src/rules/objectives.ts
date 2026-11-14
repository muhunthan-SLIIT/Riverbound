// Works out the "Current objective" shown at camp (App Spec page 9).
// Purchase priority: map -> compass -> basic travel kit -> gear for the next region
// -> rescue the next teammate -> boat -> escape.
import { FEED_BATCH_SIZE, FISH_SALE_PRICE } from './constants.ts';
import { COMPANIONS, REGIONS } from './regions.ts';
import { getShopItem, type ItemId } from './shop.ts';

export type ObjectiveInput = {
  coins: number;
  ownedItems: readonly ItemId[];
  regionsCleared: readonly string[];
  unfedAvailable: number;
  unfedReserved: number;
  fedAvailable: number;
  hearts: number;
};

export type Objective = { title: string; lines: [string, string]; target: ItemId | 'route' | 'escape' };

/** The next thing the player should buy, or null if they have the gear for their next route. */
export function nextPurchase(owned: readonly ItemId[], regionsCleared: number): ItemId | null {
  const order: ItemId[] = ['river_map', 'compass', 'swimming_goggles', 'swimming_outfit'];
  const region = REGIONS[regionsCleared]; // undefined once every region is cleared
  for (const item of [...order, ...(region?.requiredItems ?? [])]) {
    if (!owned.includes(item)) return item;
  }
  return null;
}

/** A short hint on how to earn coins, based on the fish the player has right now. */
export function earningHint(i: Pick<ObjectiveInput, 'unfedAvailable' | 'unfedReserved' | 'fedAvailable'>): string {
  if (i.unfedReserved > 0) return 'Finish your feeding batch at the fish pen.';
  if (i.fedAvailable > 0) return `Sell your fed fish to the merchant (${FISH_SALE_PRICE} coins each).`;
  if (i.unfedAvailable >= FEED_BATCH_SIZE) return `Feed ${FEED_BATCH_SIZE} fish at the fish pen.`;
  return 'Catch, feed, and sell four fish.';
}

export function currentObjective(i: ObjectiveInput): Objective {
  const cleared = i.regionsCleared.length;
  const item = nextPurchase(i.ownedItems, cleared);

  if (item) {
    const { name, price } = getShopItem(item);
    const lower = name.toLowerCase();
    const costLine = item === 'river_map' ? `Your first map costs ${price} coins.` : `The ${lower} costs ${price} coins.`;
    if (i.coins >= price) {
      return { title: `Buy your ${lower}`, lines: ['You have enough coins.', 'Visit the merchant to buy it.'], target: item };
    }
    return { title: `Buy your ${lower}`, lines: [earningHint(i), costLine], target: item };
  }

  const region = REGIONS[cleared];
  if (!region) return { title: 'Escape together', lines: ['Your crew is safe.', 'Head for the rescue dock.'], target: 'escape' };
  const rest = i.hearts < 3 ? 'Rest at the campfire first.' : 'Open the River Map to set off.';
  if (region.rescues) {
    const mate = COMPANIONS[region.rescues];
    return { title: `Rescue ${mate.name}`, lines: [`Cross ${region.name} to find ${mate.name}, the ${mate.role}.`, rest], target: 'route' };
  }
  return { title: 'Make the final crossing', lines: ['Your boat is ready and your crew is with you.', rest], target: 'route' };
}

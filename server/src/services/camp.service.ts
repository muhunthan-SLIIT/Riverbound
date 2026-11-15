// Camp actions: catch fish, sell fed fish, buy items, rest.
// Every action checks the rules on the server and saves the result atomically.
import { randomInt as cryptoRandomInt } from 'node:crypto';
import type { Types } from 'mongoose';
import {
  FISH_SALE_PRICE,
  MAX_HEARTS,
  getItemState,
  getShopItem,
  isItemId,
  rollCatch,
  type CampaignDTO,
  type ShopItemDTO,
} from '@riverbound/shared';
import { badRequest, conflict } from '../utils/errors.ts';
import { requirePositiveInt } from '../utils/validate.ts';
import { runAction } from './action.service.ts';
import { assertAtCampAndFree, loadOwnedCampaign } from './campaign.service.ts';
import { toCampaignDTO, toShopDTO } from './dto.ts';

type Ids = { campaignId: Types.ObjectId; ownerId: Types.ObjectId; key: string };

/**
 * One accepted Catch action: a random 1-4 unfed fish (rules v2.4).
 * The SERVER rolls the number with crypto.randomInt; the request never chooses it.
 * The result is saved with the action key, so retrying the same request returns the same number
 * instead of rolling again. `randomInt` can be replaced in tests.
 */
export async function catchFish(
  { campaignId, ownerId, key }: Ids,
  randomInt: (min: number, maxExclusive: number) => number = cryptoRandomInt,
): Promise<{ caught: number; campaign: CampaignDTO }> {
  return runAction({ ownerId, key, operation: 'fish.catch', payload: { campaignId: campaignId.toString() } }, async (session) => {
    const c = await loadOwnedCampaign(campaignId, ownerId, session);
    assertAtCampAndFree(c);
    const caught = rollCatch(randomInt);
    c.inventory.unfedAvailable += caught;
    c.totals.fishCaught += caught;
    await c.save({ session });
    return { caught, campaign: toCampaignDTO(c) };
  });
}

export async function sellFish({ campaignId, ownerId, key }: Ids, rawQuantity: unknown): Promise<{ sold: number; earned: number; campaign: CampaignDTO }> {
  const quantity = requirePositiveInt(rawQuantity, 'Quantity', 1000);
  return runAction({ ownerId, key, operation: 'fish.sell', payload: { campaignId: campaignId.toString(), quantity } }, async (session) => {
    const c = await loadOwnedCampaign(campaignId, ownerId, session);
    assertAtCampAndFree(c);
    // Only FED fish can be sold. Unfed and reserved fish are never counted here.
    if (quantity > c.inventory.fedAvailable) {
      throw conflict('NOT_ENOUGH_FED_FISH', `You only have ${c.inventory.fedAvailable} fed fish to sell.`);
    }
    const earned = quantity * FISH_SALE_PRICE;
    c.inventory.fedAvailable -= quantity;
    c.coins += earned;
    c.totals.saleIncome += earned;
    c.totals.fishSold += quantity;
    await c.save({ session });
    return { sold: quantity, earned, campaign: toCampaignDTO(c) };
  });
}

export async function getShop(campaignId: Types.ObjectId, ownerId: Types.ObjectId): Promise<ShopItemDTO[]> {
  const c = await loadOwnedCampaign(campaignId, ownerId);
  return toShopDTO(c.inventory.ownedItems, c.coins);
}

export async function buyItem({ campaignId, ownerId, key }: Ids, rawItemId: unknown): Promise<{ itemId: string; campaign: CampaignDTO }> {
  if (!isItemId(rawItemId)) throw badRequest('Unknown item.');
  const itemId = rawItemId;
  return runAction({ ownerId, key, operation: 'shop.buy', payload: { campaignId: campaignId.toString(), itemId } }, async (session) => {
    const c = await loadOwnedCampaign(campaignId, ownerId, session);
    assertAtCampAndFree(c);
    const state = getItemState(itemId, c.inventory.ownedItems, c.coins);
    if (state.status === 'owned') throw conflict('ALREADY_OWNED', 'You already own this item.');
    if (state.status === 'locked') throw conflict('LOCKED', state.reason);
    if (state.status === 'need_coins') throw conflict('NOT_ENOUGH_COINS', `You need ${state.shortfall} more coins.`);
    const price = getShopItem(itemId).price;
    c.coins -= price;
    c.totals.spent += price;
    c.inventory.ownedItems.push(itemId);
    await c.save({ session });
    return { itemId, campaign: toCampaignDTO(c) };
  });
}

/** Resting is free and refills hearts to 3. It always works at camp, even with 0 coins. */
export async function rest({ campaignId, ownerId, key }: Ids): Promise<CampaignDTO> {
  return runAction({ ownerId, key, operation: 'camp.rest', payload: { campaignId: campaignId.toString() } }, async (session) => {
    const c = await loadOwnedCampaign(campaignId, ownerId, session);
    assertAtCampAndFree(c);
    c.hearts = MAX_HEARTS;
    await c.save({ session });
    return toCampaignDTO(c);
  });
}

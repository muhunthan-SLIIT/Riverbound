// Creating, loading and abandoning campaigns (saved games).
import type { ClientSession, Types } from 'mongoose';
import {
  CHARACTER_NAME_MAX,
  CHARACTER_NAME_MIN,
  CHARACTERS,
  MAX_HEARTS,
  RULES_VERSION,
  isCharacterId,
  type CampaignDTO,
} from '@riverbound/shared';
import { Campaign, Challenge, FeedingBatch, type CampaignDoc } from '../models/index.ts';
import { badRequest, conflict, notFound } from '../utils/errors.ts';
import { requireString } from '../utils/validate.ts';
import { runAction } from './action.service.ts';
import { toCampaignDTO } from './dto.ts';

/** Loads a campaign only if it belongs to this player. Otherwise "not available". */
export async function loadOwnedCampaign(id: Types.ObjectId, ownerId: Types.ObjectId, session?: ClientSession): Promise<CampaignDoc> {
  const campaign = await Campaign.findOne({ _id: id, owner: ownerId }).session(session ?? null);
  if (!campaign) throw notFound();
  return campaign;
}

/** Camp actions (catch, sell, buy, rest) need the player at camp with nothing in progress. */
export function assertAtCampAndFree(c: CampaignDoc): void {
  if (c.state === 'abandoned' || c.state === 'completed') throw conflict('READ_ONLY', 'This journey is finished and can only be viewed.');
  if (c.state !== 'at_camp') throw conflict('NOT_AT_CAMP', 'Return to camp first.');
  if (c.activeFeedingBatchId || c.activeChallengeId) throw conflict('BUSY', 'Finish or cancel your feeding batch first.');
}

export async function listCampaigns(ownerId: Types.ObjectId): Promise<CampaignDTO[]> {
  const campaigns = await Campaign.find({ owner: ownerId }).sort({ updatedAt: -1 });
  return campaigns.map(toCampaignDTO);
}

export async function getCampaign(id: Types.ObjectId, ownerId: Types.ObjectId): Promise<CampaignDTO> {
  return toCampaignDTO(await loadOwnedCampaign(id, ownerId));
}

export async function createCampaign(ownerId: Types.ObjectId, key: string, body: Record<string, unknown>): Promise<CampaignDTO> {
  if (!isCharacterId(body.character)) throw badRequest('Choose Alex or Finn.');
  const character = body.character;
  const characterName =
    body.characterName === undefined || body.characterName === ''
      ? CHARACTERS[character].defaultName
      : requireString(body.characterName, 'Character name', CHARACTER_NAME_MIN, CHARACTER_NAME_MAX);

  return runAction({ ownerId, key, operation: 'campaign.create', payload: { character, characterName } }, async (session) => {
    const unfinished = await Campaign.exists({ owner: ownerId, unfinished: true }).session(session);
    if (unfinished) throw conflict('UNFINISHED_EXISTS', 'You already have a journey in progress. Abandon it first to start a new one.');
    const [campaign] = await Campaign.create(
      [{ owner: ownerId, character, characterName, rulesVersion: RULES_VERSION, hearts: MAX_HEARTS }],
      { session },
    );
    if (!campaign) throw new Error('Campaign was not created');
    return toCampaignDTO(campaign);
  });
}

/** Archives an unfinished campaign (never deletes it). Any reserved fish are released first. */
export async function abandonCampaign(id: Types.ObjectId, ownerId: Types.ObjectId, key: string, confirm: unknown): Promise<CampaignDTO> {
  if (confirm !== true) throw badRequest('Please confirm that you want to abandon this journey.');
  return runAction({ ownerId, key, operation: 'campaign.abandon', payload: { id: id.toString() } }, async (session) => {
    const c = await loadOwnedCampaign(id, ownerId, session);
    if (!c.unfinished) throw conflict('READ_ONLY', 'This journey is already finished.');

    if (c.activeFeedingBatchId) {
      await FeedingBatch.updateOne({ _id: c.activeFeedingBatchId, status: 'reserved' }, { status: 'cancelled' }, { session });
      c.inventory.unfedAvailable += c.inventory.unfedReserved;
      c.inventory.unfedReserved = 0;
    }
    await Challenge.updateMany({ campaign: c._id, status: 'open' }, { status: 'cancelled', resolvedAt: new Date() }, { session });

    c.state = 'abandoned';
    c.unfinished = false;
    c.expedition = null;
    c.activeFeedingBatchId = null;
    c.activeChallengeId = null;
    await c.save({ session });
    return toCampaignDTO(c);
  });
}

/** Marks the story introduction or the tutorial as seen. Gives no rewards. */
export async function markStoryStep(id: Types.ObjectId, ownerId: Types.ObjectId, step: unknown): Promise<CampaignDTO> {
  if (step !== 'intro' && step !== 'tutorial') throw badRequest('Unknown story step.');
  const c = await loadOwnedCampaign(id, ownerId);
  if (step === 'intro') c.introDone = true;
  else c.tutorialDone = true;
  await c.save();
  return toCampaignDTO(c);
}

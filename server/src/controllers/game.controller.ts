// HTTP handlers for campaigns, camp actions, feeding, shop, sounds and river weather.
import type { Request, Response } from 'express';
import { SHOP_ITEMS } from '@riverbound/shared';
import { currentUserId } from '../middleware/auth.ts';
import * as camp from '../services/camp.service.ts';
import * as campaigns from '../services/campaign.service.ts';
import * as challenges from '../services/challenge.service.ts';
import * as crossing from '../services/crossing.service.ts';
import * as feeding from '../services/feeding.service.ts';
import { getLeaderboard } from '../services/leaderboard.service.ts';
import { listSounds } from '../services/sound.service.ts';
import { listRegionWeather } from '../services/weather.service.ts';
import { asObject, requireActionKey, requireObjectId } from '../utils/validate.ts';

/** Collects the ids every camp action needs: which campaign, which player, which request key. */
function actionIds(req: Request, res: Response) {
  return {
    campaignId: requireObjectId(req.params.id),
    ownerId: currentUserId(res),
    key: requireActionKey(req.get('Idempotency-Key')),
  };
}

export const gameController = {
  // ----- campaigns -----
  async leaderboard(_req: Request, res: Response) {
    res.json(await getLeaderboard(currentUserId(res)));
  },
  async listCampaigns(_req: Request, res: Response) {
    res.json({ campaigns: await campaigns.listCampaigns(currentUserId(res)) });
  },
  async createCampaign(req: Request, res: Response) {
    const key = requireActionKey(req.get('Idempotency-Key'));
    res.status(201).json({ campaign: await campaigns.createCampaign(currentUserId(res), key, asObject(req.body)) });
  },
  async getCampaign(req: Request, res: Response) {
    res.json({ campaign: await campaigns.getCampaign(requireObjectId(req.params.id), currentUserId(res)) });
  },
  async abandonCampaign(req: Request, res: Response) {
    const { campaignId, ownerId, key } = actionIds(req, res);
    res.json({ campaign: await campaigns.abandonCampaign(campaignId, ownerId, key, asObject(req.body).confirm) });
  },
  async storyStep(req: Request, res: Response) {
    const id = requireObjectId(req.params.id);
    res.json({ campaign: await campaigns.markStoryStep(id, currentUserId(res), asObject(req.body).step) });
  },

  // ----- camp -----
  async catchFish(req: Request, res: Response) {
    res.json(await camp.catchFish(actionIds(req, res)));
  },
  async sellFish(req: Request, res: Response) {
    res.json(await camp.sellFish(actionIds(req, res), asObject(req.body).quantity));
  },
  shopCatalogue(_req: Request, res: Response) {
    res.json({ items: SHOP_ITEMS });
  },
  async campaignShop(req: Request, res: Response) {
    res.json({ items: await camp.getShop(requireObjectId(req.params.id), currentUserId(res)) });
  },
  async buy(req: Request, res: Response) {
    res.json(await camp.buyItem(actionIds(req, res), asObject(req.body).itemId));
  },
  async rest(req: Request, res: Response) {
    res.json({ campaign: await camp.rest(actionIds(req, res)) });
  },

  // ----- feeding -----
  async startFeeding(req: Request, res: Response) {
    const { campaignId, ownerId, key } = actionIds(req, res);
    res.status(201).json(await feeding.startFeeding(campaignId, ownerId, key));
  },
  async activeFeeding(req: Request, res: Response) {
    res.json({ active: await feeding.getActiveFeeding(requireObjectId(req.params.id), currentUserId(res)) });
  },
  async retryFeeding(req: Request, res: Response) {
    const key = requireActionKey(req.get('Idempotency-Key'));
    res.json(await feeding.retryFeeding(requireObjectId(req.params.batchId), currentUserId(res), key));
  },
  async cancelFeeding(req: Request, res: Response) {
    const key = requireActionKey(req.get('Idempotency-Key'));
    res.json({ campaign: await feeding.cancelFeeding(requireObjectId(req.params.batchId), currentUserId(res), key) });
  },

  // ----- challenges (feeding or crossing) -----
  async getChallenge(req: Request, res: Response) {
    res.json({ challenge: await challenges.getAnyChallenge(requireObjectId(req.params.challengeId), currentUserId(res)) });
  },
  async answerChallenge(req: Request, res: Response) {
    const key = requireActionKey(req.get('Idempotency-Key'));
    res.json(await challenges.answerAnyChallenge(requireObjectId(req.params.challengeId), currentUserId(res), key, req.body));
  },
  async challengeImage(req: Request, res: Response) {
    const { image, imageType } = await crossing.getChallengeImage(requireObjectId(req.params.challengeId), currentUserId(res));
    // Private and not cached: the picture belongs to this player's open puzzle.
    res.set({ 'Content-Type': imageType, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
    if (imageType === 'image/svg+xml') res.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
    res.send(image);
  },
  async replaceChallenge(req: Request, res: Response) {
    const key = requireActionKey(req.get('Idempotency-Key'));
    res.json(await crossing.replaceCrossing(requireObjectId(req.params.challengeId), currentUserId(res), key));
  },

  // ----- expeditions -----
  async startRoute(req: Request, res: Response) {
    const { campaignId, ownerId, key } = actionIds(req, res);
    res.status(201).json(await crossing.startRoute(campaignId, ownerId, key, asObject(req.body)));
  },
  async nextCrossing(req: Request, res: Response) {
    const { campaignId, ownerId, key } = actionIds(req, res);
    res.json(await crossing.nextCrossing(campaignId, ownerId, key));
  },
  async useCompanion(req: Request, res: Response) {
    const { campaignId, ownerId, key } = actionIds(req, res);
    res.json(await crossing.useCompanion(campaignId, ownerId, key, req.params.companionId));
  },
  async returnToCamp(req: Request, res: Response) {
    const { campaignId, ownerId, key } = actionIds(req, res);
    res.json({ campaign: await crossing.returnToCamp(campaignId, ownerId, key) });
  },

  // ----- sounds (from the Freesound API, prepared by the worker) -----
  async sounds(_req: Request, res: Response) {
    res.json({ sounds: await listSounds() });
  },

  // ----- river weather (from the Open-Meteo API, prepared by the worker) -----
  async weather(_req: Request, res: Response) {
    res.json({ weather: await listRegionWeather() });
  },
};

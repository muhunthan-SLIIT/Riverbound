// Every backend URL in one place. Read this file to see the whole API at a glance.
import { Router } from 'express';
import type { Env } from '../config/env.ts';
import { isDatabaseConnected } from '../config/db.ts';
import { authController } from '../controllers/auth.controller.ts';
import { gameController as g } from '../controllers/game.controller.ts';
import { requireAuth } from '../middleware/auth.ts';
import { rateLimit } from '../middleware/security.ts';

export function buildRoutes(env: Env): Router {
  const router = Router();
  const auth = authController(env);
  const authLimit = rateLimit('auth', 20, 15 * 60_000); // 20 sign-in/register tries per 15 minutes
  const gameLimit = rateLimit('game', 120, 60_000); // 120 game actions per minute

  // Health (no sign-in needed)
  router.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  router.get('/ready', (_req, res) => {
    const ready = isDatabaseConnected();
    res.status(ready ? 200 : 503).json({ ready, store: 'mongodb' });
  });

  // Authentication
  router.post('/auth/register', authLimit, auth.register);
  router.post('/auth/login', authLimit, auth.login);
  router.post('/auth/logout', auth.logout);
  router.get('/auth/session', requireAuth, auth.session);
  router.get('/auth/providers', auth.providers);
  router.get('/auth/google/start', authLimit, auth.googleStart);
  router.get('/auth/google/callback', authLimit, auth.googleCallback);

  // Public data
  router.get('/shop', g.shopCatalogue);
  router.get('/sounds', g.sounds);

  // Everything below needs a signed-in player
  router.use(requireAuth, gameLimit);

  router.get('/leaderboard', g.leaderboard);
  router.get('/campaigns', g.listCampaigns);
  router.post('/campaigns', g.createCampaign);
  router.get('/campaigns/:id', g.getCampaign);
  router.post('/campaigns/:id/abandon', g.abandonCampaign);
  router.post('/campaigns/:id/story', g.storyStep);

  router.post('/campaigns/:id/fish/catch', g.catchFish);
  router.post('/campaigns/:id/fish/sell', g.sellFish);
  router.get('/campaigns/:id/shop', g.campaignShop);
  router.post('/campaigns/:id/buy', g.buy);
  router.post('/campaigns/:id/camp/rest', g.rest);

  router.post('/campaigns/:id/feeding/start', g.startFeeding);
  router.get('/campaigns/:id/feeding/active', g.activeFeeding);
  router.post('/feeding-batches/:batchId/retry', g.retryFeeding);
  router.post('/feeding-batches/:batchId/cancel', g.cancelFeeding);

  router.get('/challenges/:challengeId', g.getChallenge);
  router.get('/challenges/:challengeId/image', g.challengeImage);
  router.post('/challenges/:challengeId/answer', g.answerChallenge);
  router.post('/challenges/:challengeId/replacement', g.replaceChallenge);

  router.post('/campaigns/:id/route/start', g.startRoute);
  router.post('/campaigns/:id/route/next', g.nextCrossing);
  router.post('/campaigns/:id/companions/:companionId/use', g.useCompanion);
  router.post('/campaigns/:id/return-to-camp', g.returnToCamp);

  return router;
}

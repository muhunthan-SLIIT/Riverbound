// End-to-end check of the earning loop against a RUNNING server and a real MongoDB.
// Usage: start the API (npm run dev:server), then run: npm run smoke
// It creates a throwaway account, so use your development database, not production.
//
// Feeding (rules v2.5) and crossings both need puzzles in the database: run the worker once first (npm run dev:worker).
// To answer crossings correctly, this TEST script looks up the secret counts directly in MongoDB.
// The real browser can never do that: it only talks to the API, which hides the counts.
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import {
  FEED_BONUS_COINS,
  FEED_MIN_UNFED,
  FISH_SALE_PRICE,
  correctAnswer,
  type CampaignDTO,
  type CrossingAnswerResult,
  type CrossingChallengeDTO,
  type FeedingChallengeDTO,
} from '@riverbound/shared';
import { connectDatabase, disconnectDatabase } from '../src/config/db.ts';
import { Challenge, Content } from '../src/models/index.ts';

const BASE = process.env.SMOKE_API_URL ?? `http://localhost:${process.env.PORT ?? 4000}/api`;
let cookie = '';

type Json = Record<string, unknown>;

async function call(method: string, path: string, body: Json = {}, key = randomUUID()): Promise<{ status: number; data: Json }> {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key, ...(cookie ? { Cookie: cookie } : {}) },
    body: method === 'GET' ? undefined : JSON.stringify(body),
  });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0] ?? '';
  return { status: response.status, data: (await response.json()) as Json };
}

function step(name: string) {
  console.log(`• ${name}`);
}

/** Every fish the server says it caught, added up, to check conservation at the end. */
let totalCaught = 0;

/** One catch: the server rolls 1-4 fish (rules v2.4). */
async function catchOnce(campaignId: string, key = randomUUID()): Promise<{ caught: number; campaign: CampaignDTO }> {
  const res = await call('POST', `/campaigns/${campaignId}/fish/catch`, {}, key);
  assert.equal(res.status, 200, JSON.stringify(res.data));
  const caught = res.data.caught as number;
  assert.ok(Number.isInteger(caught) && caught >= 1 && caught <= 4, `catch size ${caught} must be 1-4`);
  return { caught, campaign: res.data.campaign as CampaignDTO };
}

/** Catches until there are at least `n` unfed fish. */
async function catchUntil(campaignId: string, n: number): Promise<CampaignDTO> {
  let campaign = (await call('GET', `/campaigns/${campaignId}`)).data.campaign as CampaignDTO;
  while (campaign.inventory.unfedAvailable < n) {
    const result = await catchOnce(campaignId);
    totalCaught += result.caught;
    campaign = result.campaign;
  }
  return campaign;
}

/**
 * One full earning cycle (rules v2.5): catch up to 12, start feeding, answer correctly, sell the fed fish.
 * The batch size comes from the Fish API puzzle, so the coins earned are 5 + 10 x (fish in the picture).
 */
async function feedOneBatch(campaignId: string): Promise<{ campaign: CampaignDTO; fish: number; earned: number }> {
  const before = await catchUntil(campaignId, FEED_MIN_UNFED);
  const started = await call('POST', `/campaigns/${campaignId}/feeding/start`);
  assert.equal(started.status, 201, JSON.stringify(started.data));
  const challenge = started.data.challenge as FeedingChallengeDTO;
  const fish = challenge.question.params.fish;
  await checkFeedingPuzzle(challenge, before.inventory.unfedAvailable);
  const answer = correctAnswer({ ...challenge.question });
  const answered = await call('POST', `/challenges/${challenge.id}/answer`, answer as unknown as Json);
  assert.equal(answered.data.result, 'correct', JSON.stringify(answered.data));
  const sold = await call('POST', `/campaigns/${campaignId}/fish/sell`, { quantity: fish });
  assert.equal(sold.status, 200, JSON.stringify(sold.data));
  const campaign = sold.data.campaign as CampaignDTO;
  return { campaign, fish, earned: FEED_BONUS_COINS + fish * FISH_SALE_PRICE };
}

/** TEST ONLY: the feeding question really uses the Fish API puzzle's numbers, and the puzzle is claimed for feeding. */
async function checkFeedingPuzzle(challenge: FeedingChallengeDTO, unfedBefore: number) {
  const ch = await Challenge.findById(challenge.id).lean();
  const content = ch?.content ? await Content.findById(ch.content).lean() : null;
  assert.ok(content, 'feeding challenge must point at a puzzle');
  assert.equal(content.usedFor, 'feeding');
  assert.equal(challenge.question.params.fish, content.fishCount, 'batch size = fish in the picture');
  assert.equal(challenge.question.params.crates, content.chestCount, 'food chests = chests in the picture');
  assert.ok(content.fishCount >= 1 && content.fishCount <= 12 && unfedBefore >= FEED_MIN_UNFED);
  assert.ok(challenge.imageUrl, 'feeding question shows the picture');
  const img = await call('GET', `/challenges/${challenge.id}/image`);
  assert.equal(img.status, 200);
}

/** TEST ONLY: reads the hidden counts of a crossing straight from the database. */
async function secretCounts(challengeId: string): Promise<{ fish: number; chests: number }> {
  const ch = await Challenge.findById(challengeId).lean();
  const content = ch ? await Content.findById(ch.content).lean() : null;
  if (!content) throw new Error('crossing content not found');
  // v2.5: a crossing never uses a picture that was shown in a feeding question.
  assert.equal(content.usedFor, 'crossing');
  return { fish: content.fishCount, chests: content.chestCount };
}

async function answerCrossing(challengeId: string, body: Json, key = randomUUID()): Promise<CrossingAnswerResult> {
  const res = await call('POST', `/challenges/${challengeId}/answer`, body, key);
  assert.equal(res.status, 200, JSON.stringify(res.data));
  return res.data as unknown as CrossingAnswerResult;
}

async function nextPicture(campaignId: string): Promise<CrossingChallengeDTO> {
  const res = await call('POST', `/campaigns/${campaignId}/route/next`);
  assert.equal(res.status, 200, JSON.stringify(res.data));
  return res.data.challenge as CrossingChallengeDTO;
}

async function crossingTests(id: string, startCampaign: CampaignDTO) {
  let campaign = startCampaign;

  step('earn and buy goggles + outfit (Shallow Bend kit)');
  while (campaign.coins < 70) campaign = (await feedOneBatch(id)).campaign;
  for (const itemId of ['swimming_goggles', 'swimming_outfit']) {
    const bought = await call('POST', `/campaigns/${id}/buy`, { itemId });
    assert.equal(bought.status, 200, JSON.stringify(bought.data));
    campaign = bought.data.campaign as CampaignDTO;
  }

  step('locked route is refused');
  assert.equal((await call('POST', `/campaigns/${id}/route/start`, { regionId: 'reed_marsh', timed: false })).status, 409);

  step('start Shallow Bend (untimed)');
  let started = await call('POST', `/campaigns/${id}/route/start`, { regionId: 'shallow_bend', timed: false });
  if (started.status === 503) throw new Error('No crossing puzzles in the database. Run the worker once (npm run dev:worker), then try again.');
  assert.equal(started.status, 201, JSON.stringify(started.data));
  let pic = started.data.challenge as CrossingChallengeDTO;
  assert.equal(pic.encounterIndex, 0);

  step('answers stay secret before answering (V2-19)');
  assert.equal(pic.solution, null);
  assert.equal(pic.hintFish, null);
  assert.ok(!JSON.stringify(started.data).includes('marcconrad') && !JSON.stringify(started.data).includes('sanfoh'));
  const img = await fetch(`${BASE}/challenges/${pic.id}/image`, { headers: { Cookie: cookie } });
  assert.equal(img.status, 200);
  assert.match(img.headers.get('content-type') ?? '', /^image\//);
  assert.ok((await img.arrayBuffer()).byteLength > 100);

  step('camp actions are blocked during an expedition');
  assert.equal((await call('POST', `/campaigns/${id}/fish/catch`)).status, 409);

  step('a timeout claim is refused when no time limit applies');
  assert.equal((await call('POST', `/challenges/${pic.id}/answer`, { timeout: true })).status, 409);

  step('3 wrong answers -> out of hearts -> failed, everything kept (V2-14, V2-22)');
  const coinsBefore = campaign.coins;
  for (let i = 0; i < 3; i += 1) {
    const counts = await secretCounts(pic.id);
    const r = await answerCrossing(pic.id, { fish: counts.fish + 1, chests: counts.chests + 1 });
    assert.equal(r.result, 'incorrect');
    assert.equal(r.coinsAwarded, 0);
    assert.equal(r.campaign.hearts, 2 - i);
    if (i < 2) pic = await nextPicture(id);
    else {
      assert.equal(r.failed, true);
      assert.equal(r.campaign.state, 'failed');
    }
  }
  const back = await call('POST', `/campaigns/${id}/return-to-camp`);
  campaign = back.data.campaign as CampaignDTO;
  assert.equal(campaign.state, 'at_camp');
  assert.equal(campaign.coins, coinsBefore);
  assert.equal(campaign.expedition, null);

  step('start again: perfect answer pays chests x 10 and 100 points (V2-11)');
  started = await call('POST', `/campaigns/${id}/route/start`, { regionId: 'shallow_bend', timed: false });
  campaign = started.data.campaign as CampaignDTO;
  assert.equal(campaign.hearts, 3);
  pic = started.data.challenge as CrossingChallengeDTO;
  let counts = await secretCounts(pic.id);
  const perfectKey = randomUUID();
  const perfect = await answerCrossing(pic.id, counts, perfectKey);
  assert.equal(perfect.result, 'perfect');
  assert.equal(perfect.coinsAwarded, counts.chests * 10);
  assert.equal(perfect.pointsAwarded, 100);
  assert.deepEqual(perfect.solution, counts);

  step('replaying the same answer pays nothing extra (V2-15)');
  const replay = await answerCrossing(pic.id, counts, perfectKey);
  assert.deepEqual(replay, perfect);

  step('one correct with 3 hearts -> half loot, 50 points, one heart lost (V2-12)');
  pic = await nextPicture(id);
  assert.equal(pic.encounterIndex, 1);
  counts = await secretCounts(pic.id);
  const partial = await answerCrossing(pic.id, { fish: counts.fish, chests: counts.chests + 1 });
  assert.equal(partial.result, 'partial');
  assert.equal(partial.coinsAwarded, Math.floor((counts.chests * 10) / 2));
  assert.equal(partial.pointsAwarded, 50);
  assert.equal(partial.campaign.hearts, 2);

  step('last crossing clears the region: Mira joins, bonus 50 x hearts');
  pic = await nextPicture(id);
  counts = await secretCounts(pic.id);
  const last = await answerCrossing(pic.id, counts);
  assert.equal(last.result, 'perfect');
  assert.deepEqual(last.regionCleared, { regionId: 'shallow_bend', companion: 'mira', bonusPoints: 100 });
  campaign = last.campaign;
  assert.equal(campaign.state, 'at_camp');
  assert.deepEqual(campaign.regionsCleared, ['shallow_bend']);
  assert.deepEqual(campaign.companions, ['mira']);
  assert.equal(campaign.score, 100 + 50 + 100 + 100);
  assert.equal(campaign.totals.crossingLoot, perfect.coinsAwarded + partial.coinsAwarded + last.coinsAwarded);
  assert.equal(campaign.coins, campaign.totals.saleIncome + campaign.totals.feedingBonus + campaign.totals.crossingLoot - campaign.totals.spent);

  step('region summary is saved once for the Region Complete page');
  assert.equal(campaign.regionResults.length, 1);
  const summary = campaign.regionResults[0]!;
  assert.equal(summary.regionId, 'shallow_bend');
  assert.deepEqual(summary.crossings.map((x) => [x.index, x.result]), [[0, 'perfect'], [1, 'partial'], [2, 'perfect']]);
  assert.equal(summary.heartsRemaining, 2);
  assert.equal(summary.bonusPoints, 100);
  assert.equal(summary.pointsEarned, 350);
  assert.equal(summary.coinsEarned, campaign.totals.crossingLoot);
  assert.equal(summary.walletAfter, campaign.coins);

  step('leaderboard lists finished players only, with public data only');
  const board = await call('GET', '/leaderboard');
  assert.equal(board.status, 200);
  // This test player has not finished the game, so they are not on the board yet.
  assert.equal((board.data as { you: unknown }).you, null);
  const boardJson = JSON.stringify(board.data);
  assert.ok(!boardJson.includes('@') && !boardJson.includes(id), 'no email or campaign ID on the leaderboard');

  step('a cleared route cannot be started again');
  assert.equal((await call('POST', `/campaigns/${id}/route/start`, { regionId: 'shallow_bend', timed: false })).status, 409);

  step('Mira cannot be used at camp; Jonah is not rescued yet');
  assert.equal((await call('POST', `/campaigns/${id}/companions/mira/use`)).status, 409);
  assert.equal((await call('POST', `/campaigns/${id}/companions/jonah/use`)).status, 409);
  return campaign;
}

async function main() {
  step(`API: ${BASE}`);
  assert.equal((await call('GET', '/health')).status, 200);

  step('register a test player');
  const email = `smoke-${Date.now()}@example.test`;
  const reg = await call('POST', '/auth/register', { explorerName: 'Smoke Tester', email, password: 'river1234', confirmPassword: 'river1234' });
  assert.equal(reg.status, 201, JSON.stringify(reg.data));

  step('create a campaign (V2-01: 0 coins, 0 fish, 3 hearts)');
  const created = await call('POST', '/campaigns', { character: 'female' });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  let campaign = created.data.campaign as CampaignDTO;
  assert.equal(campaign.coins, 0);
  assert.equal(campaign.hearts, 3);
  assert.equal(campaign.characterName, 'Alex');
  const id = campaign.id;

  step('second unfinished campaign is refused (V2-25)');
  assert.equal((await call('POST', '/campaigns', { character: 'male' })).status, 409);

  step('a catch gives 1-4 fish; repeating the same key gives the same result once (V2-02)');
  const key = randomUUID();
  const first = await catchOnce(id, key);
  const again = await catchOnce(id, key);
  assert.equal(again.caught, first.caught, 'a retry must not roll again');
  totalCaught += first.caught;
  campaign = (await call('GET', `/campaigns/${id}`)).data.campaign as CampaignDTO;
  assert.equal(campaign.inventory.unfedAvailable, first.caught);

  step('feeding with fewer than 12 fish is refused (v2.5, V2-03)');
  await catchUntil(id, 1);
  campaign = (await call('GET', `/campaigns/${id}`)).data.campaign as CampaignDTO;
  if (campaign.inventory.unfedAvailable < FEED_MIN_UNFED) {
    const refused = await call('POST', `/campaigns/${id}/feeding/start`);
    assert.equal(refused.status, 409);
    assert.equal((refused.data.error as { code: string }).code, 'NOT_ENOUGH_FISH');
  }

  step('selling unfed fish is refused (V2-08)');
  assert.equal((await call('POST', `/campaigns/${id}/fish/sell`, { quantity: 1 })).status, 409);

  step('buying the compass before the map is refused');
  assert.equal((await call('POST', `/campaigns/${id}/buy`, { itemId: 'compass' })).status, 409);

  step('cycle 1: catch 12, feed the picture\'s fish, sell -> 5 + 10 x fish coins (V2-09)');
  let cycle = await feedOneBatch(id);
  assert.equal(cycle.campaign.coins, cycle.earned);
  campaign = cycle.campaign;
  while (campaign.coins < 30) {
    const coinsBefore = campaign.coins;
    cycle = await feedOneBatch(id);
    assert.equal(cycle.campaign.coins, coinsBefore + cycle.earned);
    campaign = cycle.campaign;
  }

  step('buy the map (V2-10)');
  const coinsBeforeMap = campaign.coins;
  campaign = (await call('POST', `/campaigns/${id}/buy`, { itemId: 'river_map' })).data.campaign as CampaignDTO;
  assert.equal(campaign.coins, coinsBeforeMap - 30);

  step('wrong feeding answer keeps the fish reserved, no penalty (V2-06)');
  await catchUntil(id, FEED_MIN_UNFED);
  const started = await call('POST', `/campaigns/${id}/feeding/start`);
  const challenge = started.data.challenge as FeedingChallengeDTO;
  const batchFish = challenge.question.params.fish;
  const wrongBody = challenge.question.answerKind === 'boolean' ? { value: !(correctAnswer(challenge.question) as { value: boolean }).value } : challenge.question.answerKind === 'number' ? { value: 9999 } : { quotient: 9999, remainder: 0 };
  const wrong = await call('POST', `/challenges/${challenge.id}/answer`, wrongBody);
  assert.equal(wrong.data.result, 'wrong');
  assert.ok(Array.isArray(wrong.data.workedSolution));
  campaign = wrong.data.campaign as CampaignDTO;
  assert.equal(campaign.inventory.unfedReserved, batchFish);
  assert.equal(campaign.hearts, 3);

  step('a new question for the same batch keeps the same picture and fish (v2.5)');
  const retried = await call('POST', `/feeding-batches/${challenge.batchId}/retry`);
  assert.equal(retried.status, 200, JSON.stringify(retried.data));
  const retryChallenge = retried.data.challenge as FeedingChallengeDTO;
  assert.notEqual(retryChallenge.id, challenge.id);
  assert.equal(retryChallenge.question.params.fish, batchFish);
  assert.equal(retryChallenge.question.params.crates, challenge.question.params.crates);

  step('cancel releases the batch\'s fish once (V2-07)');
  const unfedBeforeCancel = campaign.inventory.unfedAvailable;
  const cancelled = await call('POST', `/feeding-batches/${challenge.batchId}/cancel`);
  campaign = cancelled.data.campaign as CampaignDTO;
  assert.equal(campaign.inventory.unfedReserved, 0);
  assert.equal(campaign.inventory.unfedAvailable, unfedBeforeCancel + batchFish);
  assert.equal((await call('POST', `/feeding-batches/${challenge.batchId}/cancel`)).status, 409);

  step('earn and buy the compass (V2-10)');
  while (campaign.coins < 40) campaign = (await feedOneBatch(id)).campaign;
  const coinsBeforeCompass = campaign.coins;
  campaign = (await call('POST', `/campaigns/${id}/buy`, { itemId: 'compass' })).data.campaign as CampaignDTO;
  assert.equal(campaign.coins, coinsBeforeCompass - 40);

  step('fish conservation: caught = unfed + reserved + fed + sold');
  const inv = campaign.inventory;
  // Random catches (1-4 each): the server's total must equal what it told us, catch by catch.
  assert.equal(campaign.totals.fishCaught, totalCaught);
  assert.equal(inv.unfedAvailable + inv.unfedReserved + inv.fedAvailable + campaign.totals.fishSold, campaign.totals.fishCaught);

  campaign = await crossingTests(id, campaign);

  step('abandon archives the campaign and allows a new one');
  assert.equal((await call('POST', `/campaigns/${id}/abandon`, { confirm: true })).status, 200);
  assert.equal((await call('POST', '/campaigns', { character: 'male' })).status, 201);

  step('sign out ends the session');
  await call('POST', '/auth/logout');
  assert.equal((await call('GET', '/auth/session')).status, 401);

  console.log('\nSMOKE TEST PASSED');
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('SMOKE TEST needs MONGODB_URI in server/.env');
  process.exit(1);
}
await connectDatabase(uri, process.env.MONGODB_DB_NAME ?? 'riverbound');
try {
  await main();
} catch (error: unknown) {
  console.error('\nSMOKE TEST FAILED:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}

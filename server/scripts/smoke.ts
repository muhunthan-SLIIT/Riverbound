// End-to-end check of the earning loop against a RUNNING server and a real MongoDB.
// Usage: start the API (npm run dev:server), then run: npm run smoke
// It creates a throwaway account, so use your development database, not production.
//
// The crossing part needs puzzles in the database: run the worker once first (npm run dev:worker).
// To answer crossings correctly, this TEST script looks up the secret counts directly in MongoDB.
// The real browser can never do that: it only talks to the API, which hides the counts.
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import {
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

async function feedOneBatch(campaignId: string): Promise<CampaignDTO> {
  for (let i = 0; i < 4; i += 1) assert.equal((await call('POST', `/campaigns/${campaignId}/fish/catch`)).status, 200);
  const started = await call('POST', `/campaigns/${campaignId}/feeding/start`);
  assert.equal(started.status, 201, JSON.stringify(started.data));
  const challenge = started.data.challenge as FeedingChallengeDTO;
  const answer = correctAnswer({ ...challenge.question });
  const answered = await call('POST', `/challenges/${challenge.id}/answer`, answer as unknown as Json);
  assert.equal(answered.data.result, 'correct', JSON.stringify(answered.data));
  const sold = await call('POST', `/campaigns/${campaignId}/fish/sell`, { quantity: 4 });
  assert.equal(sold.status, 200, JSON.stringify(sold.data));
  return sold.data.campaign as CampaignDTO;
}

/** TEST ONLY: reads the hidden counts of a crossing straight from the database. */
async function secretCounts(challengeId: string): Promise<{ fish: number; chests: number }> {
  const ch = await Challenge.findById(challengeId).lean();
  const content = ch ? await Content.findById(ch.content).lean() : null;
  if (!content) throw new Error('crossing content not found');
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
  campaign = await feedOneBatch(id);
  campaign = await feedOneBatch(id);
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

  step('repeated catch with the same key pays once (V2-02)');
  const key = randomUUID();
  const first = await call('POST', `/campaigns/${id}/fish/catch`, {}, key);
  const again = await call('POST', `/campaigns/${id}/fish/catch`, {}, key);
  assert.deepEqual(again.data, first.data);
  campaign = (await call('GET', `/campaigns/${id}`)).data.campaign as CampaignDTO;
  assert.equal(campaign.inventory.unfedAvailable, 1);

  step('feeding with too few fish is refused (V2-03)');
  assert.equal((await call('POST', `/campaigns/${id}/feeding/start`)).status, 409);

  step('selling unfed fish is refused (V2-08)');
  assert.equal((await call('POST', `/campaigns/${id}/fish/sell`, { quantity: 1 })).status, 409);

  step('buying the compass before the map is refused');
  assert.equal((await call('POST', `/campaigns/${id}/buy`, { itemId: 'compass' })).status, 409);

  step('cycle 1: catch, feed, sell -> 45 coins (V2-09)');
  campaign = await feedOneBatch(id);
  assert.equal(campaign.coins, 45);

  step('buy the map -> 15 coins left (V2-10)');
  campaign = (await call('POST', `/campaigns/${id}/buy`, { itemId: 'river_map' })).data.campaign as CampaignDTO;
  assert.equal(campaign.coins, 15);

  step('wrong feeding answer keeps the fish reserved, no penalty (V2-06)');
  for (let i = 0; i < 4; i += 1) await call('POST', `/campaigns/${id}/fish/catch`);
  const started = await call('POST', `/campaigns/${id}/feeding/start`);
  const challenge = started.data.challenge as FeedingChallengeDTO;
  const wrongBody = challenge.question.answerKind === 'boolean' ? { value: !(correctAnswer(challenge.question) as { value: boolean }).value } : challenge.question.answerKind === 'number' ? { value: 9999 } : { quotient: 9999, remainder: 0 };
  const wrong = await call('POST', `/challenges/${challenge.id}/answer`, wrongBody);
  assert.equal(wrong.data.result, 'wrong');
  assert.ok(Array.isArray(wrong.data.workedSolution));
  campaign = wrong.data.campaign as CampaignDTO;
  assert.equal(campaign.inventory.unfedReserved, 4);
  assert.equal(campaign.hearts, 3);

  step('cancel releases the 4 fish once (V2-07)');
  const cancelled = await call('POST', `/feeding-batches/${challenge.batchId}/cancel`);
  campaign = cancelled.data.campaign as CampaignDTO;
  assert.equal(campaign.inventory.unfedReserved, 0);
  assert.equal(campaign.inventory.unfedAvailable, 5); // 1 left over + 4 released
  assert.equal((await call('POST', `/feeding-batches/${challenge.batchId}/cancel`)).status, 409);

  step('cycle 2 -> 60 coins, buy compass -> 20 left (V2-10)');
  // 5 unfed already: start feeding uses 4, leaving 1
  const s2 = await call('POST', `/campaigns/${id}/feeding/start`);
  const c2 = s2.data.challenge as FeedingChallengeDTO;
  await call('POST', `/challenges/${c2.id}/answer`, correctAnswer(c2.question) as unknown as Json);
  campaign = (await call('POST', `/campaigns/${id}/fish/sell`, { quantity: 4 })).data.campaign as CampaignDTO;
  assert.equal(campaign.coins, 60);
  campaign = (await call('POST', `/campaigns/${id}/buy`, { itemId: 'compass' })).data.campaign as CampaignDTO;
  assert.equal(campaign.coins, 20);

  step('fish conservation: caught = unfed + reserved + fed + sold');
  const inv = campaign.inventory;
  // 1 (replay test) + 4 (cycle 1) + 4 (wrong-answer test) = 9 caught; cycle 2 reused fish already caught
  assert.equal(campaign.totals.fishCaught, 9);
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

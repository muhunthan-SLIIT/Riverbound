// River expeditions: start a route, answer crossings (fish + chest counts), use Mira and Jonah,
// clear a region, fail and return to camp.
//
// Rules that protect the economy (all checked here on the server):
// - The correct counts never leave the server before the crossing is answered.
// - A crossing pays coins and points only the FIRST time it is cleared, even after a failure.
// - One correct count on the last heart pays nothing and sends the player back to camp.
// - The timer deadline is saved on the server; refreshing the page never restarts it.
import type { ClientSession, Types } from 'mongoose';
import {
  COMPANIONS,
  MAX_HEARTS,
  POINTS_PER_HEART_REGION_BONUS,
  REGIONS,
  getRegion,
  isRegionId,
  missingGear,
  parseCrossingAnswer,
  resolveCrossing,
  routeStatus,
  type CampaignDTO,
  type CompanionId,
  type CrossingAnswerResult,
  type CrossingChallengeDTO,
  type RegionId,
} from '@riverbound/shared';
import { Challenge, Content, type CampaignDoc, type ChallengeDoc, type ContentDoc } from '../models/index.ts';
import { AppError, badRequest, conflict, notFound } from '../utils/errors.ts';
import { looksLikeImage } from '../utils/image.ts';
import { claimPuzzle } from './content.service.ts';
import { getRegionWeather } from './weather.service.ts';

/** Timer for one timed crossing: the region's time minus the weather penalty (rain or storm: -5 s). */
export function crossingSeconds(regionSeconds: number, weather: { timerPenaltySeconds: number } | null | undefined): number {
  return Math.max(10, regionSeconds - (weather?.timerPenaltySeconds ?? 0));
}
import { runAction } from './action.service.ts';
import { assertAtCampAndFree, loadOwnedCampaign } from './campaign.service.ts';
import { toCampaignDTO, toCrossingChallengeDTO } from './dto.ts';

/** Extra seconds allowed for network delay before a timed answer counts as late. */
const DEADLINE_GRACE_MS = 2000;

type Clock = () => Date;
const systemClock: Clock = () => new Date();

export type CrossingStart = { challenge: CrossingChallengeDTO; campaign: CampaignDTO };

const encounterKey = (region: RegionId, index: number) => `${region}:${index}`;

function noPuzzles(): AppError {
  return new AppError(503, 'NO_PUZZLES', 'River puzzles are still being prepared. Please try again in a minute. Nothing was lost.');
}

async function issueCrossing(c: CampaignDoc, session: ClientSession, now: Date, exclude: Types.ObjectId[] = []): Promise<{ challenge: ChallengeDoc; content: ContentDoc }> {
  const exp = c.expedition;
  if (!exp) throw new Error('No expedition');
  // Region limits (v2.2: chest max 4/5/6, fish 1-12); never a puzzle already used for feeding.
  const regionRules = getRegion(exp.regionId);
  const content = await claimPuzzle({
    campaignId: c._id,
    use: 'crossing',
    fishMax: regionRules.fishMax,
    chestMax: regionRules.chestMax,
    session,
    exclude,
  });
  if (!content) throw noPuzzles();
  const contentId = content._id;

  const [challenge] = await Challenge.create(
    [
      {
        campaign: c._id,
        owner: c.owner,
        type: 'crossing',
        content: contentId,
        region: exp.regionId,
        encounterIndex: exp.encounterIndex,
        timed: exp.timed,
        deadline: exp.timed ? new Date(now.getTime() + crossingSeconds(regionRules.timerSeconds, exp.weather) * 1000) : null,
      },
    ],
    { session },
  );
  if (!challenge) throw new Error('Challenge was not created');
  c.activeChallengeId = challenge._id;
  return { challenge, content };
}

async function loadContentCounts(ch: ChallengeDoc, session?: ClientSession) {
  const content = await Content.findById(ch.content).select('fishCount chestCount').session(session ?? null);
  if (!content) throw new AppError(503, 'CONTENT_MISSING', 'This river picture is no longer available.');
  return content;
}

/** Loads a crossing that belongs to this player. */
async function loadOwnedCrossing(challengeId: Types.ObjectId, ownerId: Types.ObjectId, session?: ClientSession): Promise<ChallengeDoc> {
  const ch = await Challenge.findOne({ _id: challengeId, owner: ownerId, type: 'crossing' }).session(session ?? null);
  if (!ch) throw notFound();
  return ch;
}

// ---------------------------------------------------------------- start / next

export async function startRoute(
  campaignId: Types.ObjectId,
  ownerId: Types.ObjectId,
  key: string,
  body: Record<string, unknown>,
  clock: Clock = systemClock,
): Promise<CrossingStart> {
  if (!isRegionId(body.regionId)) throw badRequest('Unknown route.');
  if (typeof body.timed !== 'boolean') throw badRequest('Choose Untimed or Timed.');
  const regionId = body.regionId;
  const timed = body.timed;

  return runAction({ ownerId, key, operation: 'route.start', payload: { campaignId: campaignId.toString(), regionId, timed } }, async (session) => {
    const c = await loadOwnedCampaign(campaignId, ownerId, session);
    assertAtCampAndFree(c);
    const status = routeStatus(regionId, c.regionsCleared);
    if (status === 'cleared') throw conflict('ROUTE_CLEARED', 'You have already cleared this route.');
    if (status === 'locked') throw conflict('ROUTE_LOCKED', 'Clear the earlier routes first.');
    const missing = missingGear(regionId, c.inventory.ownedItems);
    if (missing.length > 0) throw conflict('MISSING_GEAR', 'You still need some gear for this route. Check the shop.');

    // Every expedition starts fully rested (rules: "Start a new expedition fully rested").
    c.hearts = MAX_HEARTS;
    c.state = 'crossing';
    // The weather is fixed now, so it cannot change in the middle of the trip (it also sets the timer).
    const weather = await getRegionWeather(regionId, clock(), session);
    c.expedition = { regionId, encounterIndex: 0, timed, medicUsed: false, log: [], weather };
    const { challenge, content } = await issueCrossing(c, session, clock());
    await c.save({ session });
    return { challenge: toCrossingChallengeDTO(challenge, content), campaign: toCampaignDTO(c) };
  });
}

/**
 * Gives the next picture during an expedition: after a cleared crossing, or a fresh picture after a
 * wrong answer. If a picture is still open, it is returned unchanged (resume after refresh).
 */
export async function nextCrossing(campaignId: Types.ObjectId, ownerId: Types.ObjectId, key: string, clock: Clock = systemClock): Promise<CrossingStart> {
  return runAction({ ownerId, key, operation: 'route.next', payload: { campaignId: campaignId.toString() } }, async (session) => {
    const c = await loadOwnedCampaign(campaignId, ownerId, session);
    if (c.state !== 'crossing' || !c.expedition) throw conflict('NO_EXPEDITION', 'You are not on an expedition.');

    if (c.activeChallengeId) {
      const open = await Challenge.findById(c.activeChallengeId).session(session);
      if (open && open.status === 'open') {
        return { challenge: toCrossingChallengeDTO(open, await loadContentCounts(open, session)), campaign: toCampaignDTO(c) };
      }
    }
    const { challenge, content } = await issueCrossing(c, session, clock());
    await c.save({ session });
    return { challenge: toCrossingChallengeDTO(challenge, content), campaign: toCampaignDTO(c) };
  });
}

// ---------------------------------------------------------------- read / image

export async function getCrossing(challengeId: Types.ObjectId, ownerId: Types.ObjectId): Promise<CrossingChallengeDTO> {
  const ch = await loadOwnedCrossing(challengeId, ownerId);
  return toCrossingChallengeDTO(ch, await loadContentCounts(ch));
}

/**
 * The picture of a crossing OR a feeding question (rules v2.5), served from our own URL so the
 * provider's file name (which holds the answers) stays hidden. Only the challenge's owner can load it.
 */
export async function getChallengeImage(challengeId: Types.ObjectId, ownerId: Types.ObjectId): Promise<{ image: Buffer; imageType: string }> {
  const ch = await Challenge.findOne({ _id: challengeId, owner: ownerId }).select('content');
  if (!ch?.content) throw notFound();
  const content = await Content.findById(ch.content).select('image imageType');
  if (!content || !looksLikeImage(content.image, content.imageType)) {
    throw new AppError(503, 'CONTENT_BROKEN', 'This river picture could not be loaded.');
  }
  return { image: content.image, imageType: content.imageType };
}

// ---------------------------------------------------------------- answer

/** Region finished: recruit the companion, add the heart bonus, go back to camp (or finish the game). */
function clearRegion(c: CampaignDoc, regionId: RegionId, now: Date) {
  const region = getRegion(regionId);
  const bonusPoints = c.hearts * POINTS_PER_HEART_REGION_BONUS;
  c.score += bonusPoints;
  if (bonusPoints > 0) c.scoreReachedAt = now;
  // Saved once, when the region is cleared: the Region Complete page reads it, nothing is recalculated.
  const log = c.expedition?.log ?? [];
  const coinsEarned = log.reduce((sum, x) => sum + x.coins, 0);
  c.regionResults.push({
    regionId,
    crossings: log.map((x) => ({ index: x.index, result: x.result, coins: x.coins, points: x.points, alreadyRewarded: x.alreadyRewarded })),
    heartsRemaining: c.hearts,
    bonusPoints,
    coinsEarned,
    pointsEarned: log.reduce((sum, x) => sum + x.points, 0) + bonusPoints,
    walletAfter: c.coins,
    clearedAt: now,
  });
  c.regionsCleared.push(regionId);
  if (region.rescues && !c.companions.includes(region.rescues)) c.companions.push(region.rescues);
  c.expedition = null;
  c.activeChallengeId = null;

  const completed = c.regionsCleared.length === REGIONS.length;
  if (completed) {
    c.state = 'completed';
    c.unfinished = false;
  } else {
    c.state = 'at_camp';
  }
  return { regionCleared: { regionId, companion: region.rescues, bonusPoints }, completed };
}

export async function answerCrossing(
  challengeId: Types.ObjectId,
  ownerId: Types.ObjectId,
  key: string,
  body: unknown,
  clock: Clock = systemClock,
): Promise<CrossingAnswerResult> {
  const isTimeout = typeof body === 'object' && body !== null && (body as { timeout?: unknown }).timeout === true;
  const answer = isTimeout ? null : parseCrossingAnswer(body);
  if (!isTimeout && !answer) throw badRequest('Enter two whole numbers from 0 to 99.');

  return runAction({ ownerId, key, operation: 'challenge.answer', payload: { challengeId: challengeId.toString(), body } }, async (session) => {
    const ch = await loadOwnedCrossing(challengeId, ownerId, session);
    if (ch.status !== 'open') throw conflict('ALREADY_ANSWERED', 'This crossing was already answered.');
    const c = await loadOwnedCampaign(ch.campaign, ownerId, session);
    if (c.state !== 'crossing' || !c.expedition || !c.activeChallengeId?.equals(ch._id)) {
      throw conflict('NOT_ACTIVE', 'This crossing is no longer active.');
    }
    const regionId = c.expedition.regionId;
    const content = await loadContentCounts(ch, session);

    const now = clock();
    const expired = ch.deadline !== null && now.getTime() > ch.deadline.getTime() + DEADLINE_GRACE_MS;
    // The browser can only report a timeout once the server agrees the time is really up.
    if (isTimeout && !expired) throw conflict('NOT_EXPIRED', 'There is still time left on this crossing.');

    // Mira's hint: the revealed fish field counts as correct.
    const fishAnswer = ch.hintUsed ? content.fishCount : (answer?.fish ?? null);
    const outcome = resolveCrossing({
      fishAnswer,
      chestAnswer: answer?.chests ?? null,
      fishCount: content.fishCount,
      chestCount: content.chestCount,
      heartsBefore: c.hearts,
      expired,
    });

    // Rewards are paid once per crossing, ever.
    const ek = encounterKey(regionId, ch.encounterIndex ?? 0);
    const alreadyRewarded = c.rewardedEncounters.includes(ek);
    const coinsAwarded = outcome.cleared && !alreadyRewarded ? outcome.coins : 0;
    const pointsAwarded = outcome.cleared && !alreadyRewarded ? outcome.points : 0;
    if (outcome.cleared && !alreadyRewarded) c.rewardedEncounters.push(ek);

    c.coins += coinsAwarded;
    c.totals.crossingLoot += coinsAwarded;
    c.score += pointsAwarded;
    if (pointsAwarded > 0) c.scoreReachedAt = now;
    const heartsLost = c.hearts - outcome.heartsAfter;
    c.hearts = outcome.heartsAfter;

    // Statistics (perfect accuracy counts timeouts as not perfect; hinted answers are kept apart).
    c.stats.crossingAnswers += 1;
    if (outcome.category === 'perfect') c.stats.crossingPerfect += 1;
    if (outcome.category === 'partial' && outcome.cleared) c.stats.crossingPartial += 1;
    if (ch.hintUsed) c.stats.crossingHinted += 1;
    else {
      c.stats.crossingAnswersUnassisted += 1;
      if (outcome.category === 'perfect') c.stats.crossingPerfectUnassisted += 1;
    }

    ch.status = { perfect: 'correct', partial: 'partial', incorrect: 'wrong', timeout: 'timeout' }[outcome.category] as ChallengeDoc['status'];
    ch.submitted = answer ?? { timeout: true };
    ch.resolvedAt = now;
    c.activeChallengeId = null;

    let regionCleared: CrossingAnswerResult['regionCleared'] = null;
    let completed = false;
    if (outcome.failed) {
      // Out of hearts: the trip ends. Coins, fish, gear and companions are all kept.
      c.state = 'failed';
    } else if (outcome.cleared) {
      c.expedition.log.push({
        index: ch.encounterIndex ?? 0,
        result: outcome.category === 'perfect' ? 'perfect' : 'partial',
        coins: coinsAwarded,
        points: pointsAwarded,
        alreadyRewarded,
      });
      const region = getRegion(regionId);
      if (c.expedition.encounterIndex + 1 >= region.encounters) {
        ({ regionCleared, completed } = clearRegion(c, regionId, now));
      } else {
        c.expedition.encounterIndex += 1;
      }
    }

    await ch.save({ session });
    await c.save({ session });
    return {
      result: outcome.category,
      coinsAwarded,
      pointsAwarded,
      heartsLost,
      alreadyRewarded: outcome.cleared && alreadyRewarded,
      cleared: outcome.cleared,
      failed: outcome.failed,
      regionCleared,
      completed,
      solution: { fish: content.fishCount, chests: content.chestCount },
      challenge: toCrossingChallengeDTO(ch, content),
      campaign: toCampaignDTO(c),
    };
  });
}

// ---------------------------------------------------------------- replacement

/**
 * Swaps a picture that is really broken on the server (missing or damaged bytes) for a new one,
 * with a fresh deadline and no penalty. A browser saying "it didn't load" is not enough on its own:
 * if the stored picture is fine, the request is refused, so it can't be used to reset the timer.
 */
export async function replaceCrossing(challengeId: Types.ObjectId, ownerId: Types.ObjectId, key: string, clock: Clock = systemClock): Promise<CrossingStart> {
  return runAction({ ownerId, key, operation: 'challenge.replace', payload: { challengeId: challengeId.toString() } }, async (session) => {
    const ch = await loadOwnedCrossing(challengeId, ownerId, session);
    if (ch.status !== 'open') throw conflict('ALREADY_ANSWERED', 'This crossing was already answered.');
    const c = await loadOwnedCampaign(ch.campaign, ownerId, session);
    if (!c.activeChallengeId?.equals(ch._id)) throw conflict('NOT_ACTIVE', 'This crossing is no longer active.');

    const content = await Content.findById(ch.content).session(session);
    if (content && content.status === 'ready' && looksLikeImage(content.image, content.imageType)) {
      throw conflict('CONTENT_OK', 'The picture is fine on our side. Check your connection and reload the page.');
    }
    // Take the broken picture out of the pool so nobody gets it again.
    if (content) {
      content.status = 'quarantined';
      content.note = 'Failed image check during play';
      await content.save({ session });
    }
    ch.status = 'cancelled';
    ch.resolvedAt = clock();
    const exclude = ch.content ? [ch.content] : [];
    const { challenge, content: fresh } = await issueCrossing(c, session, clock(), exclude);
    ch.replacedBy = challenge._id;
    await ch.save({ session });
    await c.save({ session });
    return { challenge: toCrossingChallengeDTO(challenge, fresh), campaign: toCampaignDTO(c) };
  });
}

// ---------------------------------------------------------------- companions

export type CompanionUseResult = { companion: CompanionId; hintFish: number | null; challenge: CrossingChallengeDTO | null; campaign: CampaignDTO };

export async function useCompanion(campaignId: Types.ObjectId, ownerId: Types.ObjectId, key: string, rawCompanion: unknown): Promise<CompanionUseResult> {
  if (rawCompanion !== 'mira' && rawCompanion !== 'jonah') {
    throw badRequest(rawCompanion === 'tess' ? 'Tess guides you automatically. There is nothing to use.' : 'Unknown companion.');
  }
  const companion = rawCompanion;

  return runAction({ ownerId, key, operation: 'companion.use', payload: { campaignId: campaignId.toString(), companion } }, async (session) => {
    const c = await loadOwnedCampaign(campaignId, ownerId, session);
    if (!c.companions.includes(companion)) throw conflict('NOT_RESCUED', `Rescue ${COMPANIONS[companion].name} first.`);
    if (c.state !== 'crossing' || !c.expedition) throw conflict('NO_EXPEDITION', 'Companion abilities work during an expedition.');

    if (companion === 'jonah') {
      if (c.expedition.medicUsed) throw conflict('ALREADY_USED', 'Jonah has already healed you on this expedition.');
      if (c.hearts >= MAX_HEARTS) throw conflict('FULL_HEALTH', 'Your hearts are already full.');
      c.hearts += 1;
      c.expedition.medicUsed = true;
      await c.save({ session });
      return { companion, hintFish: null, challenge: null, campaign: toCampaignDTO(c) };
    }

    // Mira: reveal the fish count of the open picture, once per region per campaign.
    const regionId = c.expedition.regionId;
    if (c.scoutUsedRegions.includes(regionId)) throw conflict('ALREADY_USED', 'Mira has already helped in this region.');
    const ch = c.activeChallengeId ? await Challenge.findById(c.activeChallengeId).session(session) : null;
    if (!ch || ch.type !== 'crossing' || ch.status !== 'open') throw conflict('NO_PICTURE', 'Mira can help when a crossing picture is open.');
    const content = await loadContentCounts(ch, session);
    ch.hintUsed = true;
    c.scoutUsedRegions.push(regionId);
    await ch.save({ session });
    await c.save({ session });
    return { companion, hintFish: content.fishCount, challenge: toCrossingChallengeDTO(ch, content), campaign: toCampaignDTO(c) };
  });
}

// ---------------------------------------------------------------- leaving

/**
 * Back to camp: after running out of hearts, or when the player chooses "Leave Expedition".
 * Route progress resets; coins, fish, gear, companions and score are kept. An open picture is
 * closed with no reward and no heart lost (leaving already costs the trip's progress).
 */
export async function returnToCamp(campaignId: Types.ObjectId, ownerId: Types.ObjectId, key: string, clock: Clock = systemClock): Promise<CampaignDTO> {
  return runAction({ ownerId, key, operation: 'route.return', payload: { campaignId: campaignId.toString() } }, async (session) => {
    const c = await loadOwnedCampaign(campaignId, ownerId, session);
    if (c.state !== 'crossing' && c.state !== 'failed') throw conflict('NOT_ON_EXPEDITION', 'You are already at camp.');
    if (c.activeChallengeId) {
      await Challenge.updateOne({ _id: c.activeChallengeId, status: 'open' }, { status: 'cancelled', resolvedAt: clock() }, { session });
    }
    c.state = 'at_camp';
    c.expedition = null;
    c.activeChallengeId = null;
    await c.save({ session });
    return toCampaignDTO(c);
  });
}

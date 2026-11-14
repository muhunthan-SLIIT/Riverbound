// Feeding batches: reserve 4 fish, answer a maths question, get 4 fed fish + 5 coins.
//
// Fish never disappear or duplicate:
//   start   : unfedAvailable -4, unfedReserved +4
//   correct : unfedReserved  -4, fedAvailable  +4, coins +5 (once)
//   cancel  : unfedReserved  -4, unfedAvailable +4
//   wrong   : nothing moves; a fresh question can be requested
import type { ClientSession, Types } from 'mongoose';
import {
  FEED_BATCH_SIZE,
  FEED_BONUS_COINS,
  correctAnswer,
  createRng,
  feedingDifficultyFor,
  generateQuestion,
  isCorrect,
  parseFeedingAnswer,
  type CampaignDTO,
  type FeedingAnswer,
  type FeedingChallengeDTO,
} from '@riverbound/shared';
import { Challenge, FeedingBatch, type CampaignDoc, type FeedingBatchDoc } from '../models/index.ts';
import { badRequest, conflict, notFound } from '../utils/errors.ts';
import { randomSeed } from '../utils/security.ts';
import { runAction } from './action.service.ts';
import { assertAtCampAndFree, loadOwnedCampaign } from './campaign.service.ts';
import { toCampaignDTO, toFeedingChallengeDTO } from './dto.ts';

type FeedingResult = { batchId: string; challenge: FeedingChallengeDTO; campaign: CampaignDTO };

async function issueQuestion(c: CampaignDoc, batch: FeedingBatchDoc, session: ClientSession) {
  const question = generateQuestion(createRng(randomSeed()), feedingDifficultyFor(c.regionsCleared.length));
  const [challenge] = await Challenge.create(
    [{ campaign: c._id, owner: c.owner, type: 'feeding', batch: batch._id, feeding: question }],
    { session },
  );
  if (!challenge) throw new Error('Challenge was not created');
  batch.activeChallengeId = challenge._id;
  batch.attempts += 1;
  c.activeChallengeId = challenge._id;
  return challenge;
}

async function loadOwnedBatch(batchId: Types.ObjectId, ownerId: Types.ObjectId, session: ClientSession): Promise<FeedingBatchDoc> {
  const batch = await FeedingBatch.findOne({ _id: batchId, owner: ownerId }).session(session);
  if (!batch) throw notFound();
  return batch;
}

export async function startFeeding(campaignId: Types.ObjectId, ownerId: Types.ObjectId, key: string): Promise<FeedingResult> {
  return runAction({ ownerId, key, operation: 'feeding.start', payload: { campaignId: campaignId.toString() } }, async (session) => {
    const c = await loadOwnedCampaign(campaignId, ownerId, session);
    if (c.state === 'feeding') throw conflict('BATCH_ACTIVE', 'You already have a feeding batch. Resume it instead.');
    assertAtCampAndFree(c);
    const missing = FEED_BATCH_SIZE - c.inventory.unfedAvailable;
    if (missing > 0) {
      throw conflict('NOT_ENOUGH_FISH', `You need ${missing} more unfed fish to start feeding. Catch more fish first.`);
    }

    c.inventory.unfedAvailable -= FEED_BATCH_SIZE;
    c.inventory.unfedReserved += FEED_BATCH_SIZE;
    c.state = 'feeding';
    const [batch] = await FeedingBatch.create([{ campaign: c._id, owner: ownerId, fishCount: FEED_BATCH_SIZE }], { session });
    if (!batch) throw new Error('Batch was not created');
    c.activeFeedingBatchId = batch._id;
    const challenge = await issueQuestion(c, batch, session);
    await batch.save({ session });
    await c.save({ session });
    return { batchId: batch._id.toString(), challenge: toFeedingChallengeDTO(challenge), campaign: toCampaignDTO(c) };
  });
}

export async function getChallenge(challengeId: Types.ObjectId, ownerId: Types.ObjectId): Promise<FeedingChallengeDTO> {
  const challenge = await Challenge.findOne({ _id: challengeId, owner: ownerId });
  if (!challenge) throw notFound();
  if (challenge.type !== 'feeding') throw conflict('WRONG_TYPE', 'This is not a feeding question.');
  return toFeedingChallengeDTO(challenge);
}

export type FeedingAnswerResult = {
  result: 'correct' | 'wrong';
  coinsAwarded: number;
  correctAnswer: FeedingAnswer;
  workedSolution: string[] | null;
  challenge: FeedingChallengeDTO;
  campaign: CampaignDTO;
};

export async function answerFeeding(challengeId: Types.ObjectId, ownerId: Types.ObjectId, key: string, body: unknown): Promise<FeedingAnswerResult> {
  return runAction({ ownerId, key, operation: 'challenge.answer', payload: { challengeId: challengeId.toString(), body } }, async (session) => {
    const challenge = await Challenge.findOne({ _id: challengeId, owner: ownerId }).session(session);
    if (!challenge) throw notFound();
    if (challenge.type !== 'feeding' || !challenge.feeding || !challenge.batch) {
      throw conflict('WRONG_TYPE', 'This is not a feeding question.');
    }
    // A question can only be answered once. An explained (wrong) question can never pay later.
    if (challenge.status !== 'open') throw conflict('ALREADY_ANSWERED', 'This question was already answered. Ask for a new one.');

    const answer = parseFeedingAnswer(challenge.feeding.answerKind, body);
    if (!answer) throw badRequest('Please enter a valid answer.');

    const batch = await loadOwnedBatch(challenge.batch, ownerId, session);
    if (batch.status !== 'reserved' || !batch.activeChallengeId?.equals(challenge._id)) {
      throw conflict('BATCH_CLOSED', 'This feeding batch is no longer active.');
    }
    const c = await loadOwnedCampaign(challenge.campaign, ownerId, session);

    const right = isCorrect(challenge.feeding, answer);
    challenge.status = right ? 'correct' : 'wrong';
    challenge.submitted = answer;
    challenge.resolvedAt = new Date();
    c.stats.feedingAnswers += 1;

    let coinsAwarded = 0;
    if (right) {
      c.stats.feedingCorrect += 1;
      c.inventory.unfedReserved -= batch.fishCount;
      c.inventory.fedAvailable += batch.fishCount;
      if (!batch.rewardClaimed) {
        coinsAwarded = FEED_BONUS_COINS;
        c.coins += coinsAwarded;
        c.totals.feedingBonus += coinsAwarded;
        batch.rewardClaimed = true;
      }
      batch.status = 'fed';
      batch.activeChallengeId = null;
      c.state = 'at_camp';
      c.activeFeedingBatchId = null;
      c.activeChallengeId = null;
    }

    await challenge.save({ session });
    await batch.save({ session });
    await c.save({ session });
    return {
      result: right ? 'correct' : 'wrong',
      coinsAwarded,
      correctAnswer: correctAnswer(challenge.feeding),
      workedSolution: right ? null : toFeedingChallengeDTO(challenge).workedSolution,
      challenge: toFeedingChallengeDTO(challenge),
      campaign: toCampaignDTO(c),
    };
  });
}

/** After a wrong answer: a brand-new question for the same 4 reserved fish. */
export async function retryFeeding(batchId: Types.ObjectId, ownerId: Types.ObjectId, key: string): Promise<FeedingResult> {
  return runAction({ ownerId, key, operation: 'feeding.retry', payload: { batchId: batchId.toString() } }, async (session) => {
    const batch = await loadOwnedBatch(batchId, ownerId, session);
    if (batch.status !== 'reserved') throw conflict('BATCH_CLOSED', 'This feeding batch is no longer active.');
    const c = await loadOwnedCampaign(batch.campaign, ownerId, session);

    const current = batch.activeChallengeId ? await Challenge.findById(batch.activeChallengeId).session(session) : null;
    // If the current question is still open, just give it back (refresh/resume case).
    if (current && current.status === 'open') {
      return { batchId: batch._id.toString(), challenge: toFeedingChallengeDTO(current), campaign: toCampaignDTO(c) };
    }
    const challenge = await issueQuestion(c, batch, session);
    await batch.save({ session });
    await c.save({ session });
    return { batchId: batch._id.toString(), challenge: toFeedingChallengeDTO(challenge), campaign: toCampaignDTO(c) };
  });
}

/** Cancels an unfinished batch and returns the 4 fish. No reward. */
export async function cancelFeeding(batchId: Types.ObjectId, ownerId: Types.ObjectId, key: string): Promise<CampaignDTO> {
  return runAction({ ownerId, key, operation: 'feeding.cancel', payload: { batchId: batchId.toString() } }, async (session) => {
    const batch = await loadOwnedBatch(batchId, ownerId, session);
    if (batch.status !== 'reserved') throw conflict('BATCH_CLOSED', 'This feeding batch is already finished.');
    const c = await loadOwnedCampaign(batch.campaign, ownerId, session);

    await Challenge.updateMany({ batch: batch._id, status: 'open' }, { status: 'cancelled', resolvedAt: new Date() }, { session });
    batch.status = 'cancelled';
    batch.activeChallengeId = null;
    c.inventory.unfedReserved -= batch.fishCount;
    c.inventory.unfedAvailable += batch.fishCount;
    c.state = 'at_camp';
    c.activeFeedingBatchId = null;
    c.activeChallengeId = null;
    await batch.save({ session });
    await c.save({ session });
    return toCampaignDTO(c);
  });
}

/** Used by the Fish Pen page to resume a batch after a page refresh. */
export async function getActiveFeeding(campaignId: Types.ObjectId, ownerId: Types.ObjectId): Promise<{ batchId: string; challenge: FeedingChallengeDTO } | null> {
  const c = await loadOwnedCampaign(campaignId, ownerId);
  if (!c.activeFeedingBatchId || !c.activeChallengeId) return null;
  const challenge = await Challenge.findOne({ _id: c.activeChallengeId, owner: ownerId });
  if (!challenge || challenge.type !== 'feeding') return null;
  return { batchId: c.activeFeedingBatchId.toString(), challenge: toFeedingChallengeDTO(challenge) };
}

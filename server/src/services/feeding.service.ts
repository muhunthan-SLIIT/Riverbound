// Feeding batches (rules v2.5): built from a Fish API puzzle.
//   - You need at least 12 unfed fish to start (12 is the most fish a feeding puzzle has).
//   - The server claims a Fish API puzzle for feeding and reserves exactly its fish count F (1-12).
//   - The question uses F fish and the puzzle's chest count as food chests; the server picks the
//     pellet numbers so the answer is a whole number. The puzzle picture is shown with the question.
//   - Correct: F fed fish + 5 coins (once). Wrong: worked steps, then a new question for the same batch.
//
// Fish never disappear or duplicate (F = batch.fishCount):
//   start   : unfedAvailable -F, unfedReserved +F
//   correct : unfedReserved  -F, fedAvailable  +F, coins +5 (once)
//   cancel  : unfedReserved  -F, unfedAvailable +F
//   wrong   : nothing moves; a fresh question can be requested
import type { ClientSession, Types } from 'mongoose';
import {
  FEED_BONUS_COINS,
  FEED_MIN_UNFED,
  FEED_PUZZLE_FISH_MAX,
  correctAnswer,
  createRng,
  feedingDifficultyFor,
  generateQuestionFromPuzzle,
  isCorrect,
  parseFeedingAnswer,
  type CampaignDTO,
  type FeedingAnswer,
  type FeedingChallengeDTO,
} from '@riverbound/shared';
import { Challenge, Content, FeedingBatch, type CampaignDoc, type FeedingBatchDoc } from '../models/index.ts';
import { AppError, badRequest, conflict, notFound } from '../utils/errors.ts';
import { randomSeed } from '../utils/security.ts';
import { runAction } from './action.service.ts';
import { assertAtCampAndFree, loadOwnedCampaign } from './campaign.service.ts';
import { claimPuzzle } from './content.service.ts';
import { toCampaignDTO, toFeedingChallengeDTO } from './dto.ts';

type FeedingResult = { batchId: string; challenge: FeedingChallengeDTO; campaign: CampaignDTO };

/** Chest counts a feeding puzzle may have (the question needs at least one food chest). */
const FEED_PUZZLE_CHEST_MAX = 12;

type Puzzle = { _id: Types.ObjectId; fishCount: number; chestCount: number };

async function issueQuestion(c: CampaignDoc, batch: FeedingBatchDoc, puzzle: Puzzle, session: ClientSession) {
  const question = generateQuestionFromPuzzle(
    createRng(randomSeed()),
    feedingDifficultyFor(c.regionsCleared.length),
    puzzle.fishCount,
    puzzle.chestCount,
  );
  const [challenge] = await Challenge.create(
    [{ campaign: c._id, owner: c.owner, type: 'feeding', batch: batch._id, content: puzzle._id, feeding: question }],
    { session },
  );
  if (!challenge) throw new Error('Challenge was not created');
  batch.activeChallengeId = challenge._id;
  batch.attempts += 1;
  c.activeChallengeId = challenge._id;
  return challenge;
}

/** The puzzle a batch was built from (its fish count always equals the batch size). */
async function loadBatchPuzzle(batch: FeedingBatchDoc, session: ClientSession): Promise<Puzzle> {
  const puzzle = batch.content ? await Content.findById(batch.content).select('fishCount chestCount').session(session) : null;
  if (!puzzle || puzzle.fishCount !== batch.fishCount) {
    throw new AppError(503, 'PUZZLE_MISSING', 'The picture for this batch is no longer available. Exit feeding to get your fish back, then start again.');
  }
  return puzzle;
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
    const missing = FEED_MIN_UNFED - c.inventory.unfedAvailable;
    if (missing > 0) {
      throw conflict('NOT_ENOUGH_FISH', `You need ${FEED_MIN_UNFED} unfed fish to start feeding. Catch ${missing} more first.`);
    }

    // A Fish API puzzle for feeding (never one used for a crossing). Its fish count is the batch size.
    const puzzle = await claimPuzzle({
      campaignId: c._id,
      use: 'feeding',
      fishMax: FEED_PUZZLE_FISH_MAX,
      chestMax: FEED_PUZZLE_CHEST_MAX,
      session,
    });
    if (!puzzle) throw new AppError(503, 'NO_PUZZLES', 'Feeding pictures are still being prepared. Please try again in a minute. Nothing was lost.');
    const batchSize = puzzle.fishCount;

    c.inventory.unfedAvailable -= batchSize;
    c.inventory.unfedReserved += batchSize;
    c.state = 'feeding';
    const [batch] = await FeedingBatch.create([{ campaign: c._id, owner: ownerId, fishCount: batchSize, content: puzzle._id }], { session });
    if (!batch) throw new Error('Batch was not created');
    c.activeFeedingBatchId = batch._id;
    const challenge = await issueQuestion(c, batch, puzzle, session);
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

/** After a wrong answer: a brand-new question (new pellet numbers) for the same reserved fish and picture. */
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
    const challenge = await issueQuestion(c, batch, await loadBatchPuzzle(batch, session), session);
    await batch.save({ session });
    await c.save({ session });
    return { batchId: batch._id.toString(), challenge: toFeedingChallengeDTO(challenge), campaign: toCampaignDTO(c) };
  });
}

/** Cancels an unfinished batch and returns its fish. No reward. */
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

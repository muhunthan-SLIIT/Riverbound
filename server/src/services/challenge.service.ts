// Shared entry points for /challenges/:id — sends feeding and crossing challenges to the right service.
import type { Types } from 'mongoose';
import type { ChallengeDTO } from '@riverbound/shared';
import { Challenge } from '../models/index.ts';
import { notFound } from '../utils/errors.ts';
import * as crossing from './crossing.service.ts';
import * as feeding from './feeding.service.ts';

async function challengeType(challengeId: Types.ObjectId, ownerId: Types.ObjectId): Promise<'feeding' | 'crossing'> {
  const found = await Challenge.findOne({ _id: challengeId, owner: ownerId }).select('type').lean();
  if (!found) throw notFound();
  return found.type;
}

export async function getAnyChallenge(challengeId: Types.ObjectId, ownerId: Types.ObjectId): Promise<ChallengeDTO> {
  return (await challengeType(challengeId, ownerId)) === 'crossing'
    ? crossing.getCrossing(challengeId, ownerId)
    : feeding.getChallenge(challengeId, ownerId);
}

export async function answerAnyChallenge(challengeId: Types.ObjectId, ownerId: Types.ObjectId, key: string, body: unknown) {
  return (await challengeType(challengeId, ownerId)) === 'crossing'
    ? crossing.answerCrossing(challengeId, ownerId, key, body)
    : feeding.answerFeeding(challengeId, ownerId, key, body);
}

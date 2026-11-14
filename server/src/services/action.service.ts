// Runs a game action inside a MongoDB transaction, exactly once per Idempotency-Key.
//
// How it works:
// 1. If this key was used before for the same request, return the saved result (no new reward).
// 2. If the key was used for a DIFFERENT request, refuse it.
// 3. Otherwise run the work and save the result in the same transaction.
//    Either everything is saved, or nothing is.
import mongoose, { type ClientSession, type Types } from 'mongoose';
import { ActionLog } from '../models/index.ts';
import { conflict } from '../utils/errors.ts';
import { sha256 } from '../utils/security.ts';

export type ActionContext = { ownerId: Types.ObjectId; key: string; operation: string; payload: unknown };

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 11000;
}

async function replay<T>(ctx: ActionContext, payloadHash: string): Promise<T | null> {
  const previous = await ActionLog.findOne({ owner: ctx.ownerId, key: ctx.key }).lean();
  if (!previous) return null;
  if (previous.operation !== ctx.operation || previous.payloadHash !== payloadHash) {
    throw conflict('KEY_REUSED', 'This request key was already used for a different action.');
  }
  return previous.response as T;
}

export async function runAction<T>(ctx: ActionContext, work: (session: ClientSession) => Promise<T>): Promise<T> {
  const payloadHash = sha256(JSON.stringify({ operation: ctx.operation, payload: ctx.payload }));

  const earlier = await replay<T>(ctx, payloadHash);
  if (earlier !== null) return earlier;

  const session = await mongoose.startSession();
  try {
    let result: T | undefined;
    // withTransaction retries automatically if two requests collide on the same document.
    await session.withTransaction(async () => {
      result = await work(session);
      // Store a plain JSON copy so a replay returns exactly the same response.
      const response = JSON.parse(JSON.stringify(result)) as unknown;
      await ActionLog.create([{ owner: ctx.ownerId, key: ctx.key, operation: ctx.operation, payloadHash, response }], { session });
    });
    return result as T;
  } catch (error) {
    // Two identical requests at the same moment: one wins, the other returns the winner's result.
    if (isDuplicateKeyError(error)) {
      const winner = await replay<T>(ctx, payloadHash);
      if (winner !== null) return winner;
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

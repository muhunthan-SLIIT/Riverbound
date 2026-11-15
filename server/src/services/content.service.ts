// Picks a Fish API puzzle for a feeding question or a river crossing, and claims it for that use.
//
// Why "claim": feeding SHOWS the puzzle's fish and chest counts in its question, while a crossing
// keeps the same counts SECRET as its answer. So a puzzle is given to one use only (`usedFor`).
// A feeding puzzle can never come back as a crossing (that would leak the answer), and the reverse.
// The claim happens inside the caller's transaction, so two players racing for the same puzzle
// cannot both claim it for different uses (MongoDB rejects one transaction and it retries).
import type { ClientSession, Types } from 'mongoose';
import { Challenge, Content, type ContentDoc } from '../models/index.ts';

export type PuzzleUse = 'feeding' | 'crossing';

type Options = {
  campaignId: Types.ObjectId;
  use: PuzzleUse;
  fishMax: number;
  chestMax: number;
  session: ClientSession;
  exclude?: Types.ObjectId[];
};

export async function claimPuzzle({ campaignId, use, fishMax, chestMax, session, exclude = [] }: Options): Promise<ContentDoc | null> {
  const fits = {
    status: 'ready',
    usedFor: { $in: [null, use] }, // not handed out yet, or already used for this same purpose
    fishCount: { $gte: 1, $lte: fishMax },
    chestCount: { $gte: 1, $lte: chestMax },
  };
  // Prefer pictures this player has not seen for this purpose before.
  const seen = (await Challenge.distinct('content', { campaign: campaignId, type: use }).session(session)) as Types.ObjectId[];

  for (const avoid of [[...seen, ...exclude], exclude]) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const [picked] = await Content.aggregate<{ _id: Types.ObjectId }>([
        { $match: { ...fits, _id: { $nin: avoid } } },
        { $sample: { size: 1 } },
        { $project: { _id: 1 } },
      ]).session(session);
      if (!picked) break;
      const claimed = await Content.findOneAndUpdate(
        { _id: picked._id, usedFor: { $in: [null, use] } },
        { $set: { usedFor: use } },
        { new: true, session },
      ).select('fishCount chestCount usedFor');
      if (claimed) return claimed;
    }
  }
  return null;
}

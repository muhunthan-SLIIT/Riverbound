// Leaderboard: explorers who FINISHED the game (reached the rescue dock), ranked by score,
// plus the signed-in player's own row if they have finished.
// Scores come only from saved campaigns (the server's data); the browser can never send one.
// Only public game data leaves the server: explorer name, character, score, perfect % and finish date.
// Never an email address, account ID or campaign ID.
import type { Types } from 'mongoose';
import { LEADERBOARD_SIZE, perfectRate, rankLeaderboard, type LeaderboardDTO, type LeaderboardEntryDTO } from '@riverbound/shared';
import { Campaign } from '../models/index.ts';

export async function getLeaderboard(viewerId: Types.ObjectId): Promise<LeaderboardDTO> {
  // Finished journeys only. The { state, score } index serves this query.
  const finished = await Campaign.find({ state: 'completed' })
    .select('owner character characterName score stats scoreReachedAt updatedAt')
    .lean();

  const ranked = rankLeaderboard(
    finished.map((c) => {
      // The final region's bonus is the last score change, so scoreReachedAt is the finish time.
      const finishedAt = c.scoreReachedAt ?? c.updatedAt;
      return { ownerId: c.owner.toString(), score: c.score, finishedAt: finishedAt.getTime(), campaign: c };
    }),
  );

  const viewer = viewerId.toString();
  const toEntry = (row: (typeof ranked)[number]): LeaderboardEntryDTO => ({
    rank: row.rank,
    explorerName: row.campaign.characterName,
    character: row.campaign.character,
    score: row.score,
    perfectRate: perfectRate(row.campaign.stats?.crossingPerfect ?? 0, row.campaign.stats?.crossingAnswers ?? 0),
    finishedAt: new Date(row.finishedAt).toISOString(),
    isYou: row.ownerId === viewer,
  });

  const mine = ranked.find((row) => row.ownerId === viewer);
  return {
    entries: ranked.slice(0, LEADERBOARD_SIZE).map(toEntry),
    you: mine ? toEntry(mine) : null,
    totalPlayers: ranked.length,
  };
}

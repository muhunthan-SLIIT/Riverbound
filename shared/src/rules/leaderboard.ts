// Leaderboard ranking rules (decided by the server; the browser never sends a score).
// Only journeys that FINISHED the game (reached the rescue dock) are on the board.
// 1. Higher score first.  2. Equal score: whoever finished first.  One row per account: its best finished journey.

export type LeaderboardCandidate = {
  ownerId: string;
  score: number;
  finishedAt: number; // milliseconds since 1970; earlier wins a tie
};

export function compareLeaderboard(a: LeaderboardCandidate, b: LeaderboardCandidate): number {
  if (a.score !== b.score) return b.score - a.score;
  return a.finishedAt - b.finishedAt;
}

/** Sorts, keeps each account's best journey only, and numbers the ranks from 1. */
export function rankLeaderboard<T extends LeaderboardCandidate>(rows: readonly T[]): (T & { rank: number })[] {
  const seen = new Set<string>();
  const best: T[] = [];
  for (const row of [...rows].sort(compareLeaderboard)) {
    if (seen.has(row.ownerId)) continue;
    seen.add(row.ownerId);
    best.push(row);
  }
  return best.map((row, i) => ({ ...row, rank: i + 1 }));
}

/** Perfect crossings as a whole percentage, or null when the player has not answered a crossing yet. */
export function perfectRate(perfect: number, answers: number): number | null {
  if (answers <= 0) return null;
  return Math.round((perfect / answers) * 100);
}

/** How many rows the leaderboard shows. */
export const LEADERBOARD_SIZE = 20;

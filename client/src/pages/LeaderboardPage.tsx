// Leaderboard (added 15 November 2026 at the author's request; no Figma frame, Living River style).
// Shows only explorers who FINISHED the game (reached the rescue dock), ranked by score, and your own rank.
// The data comes from GET /api/leaderboard; the server decides every score and rank, and sends only
// public game data (no emails or IDs).
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LEADERBOARD_SIZE, type CampaignDTO, type LeaderboardDTO, type LeaderboardEntryDTO } from '@riverbound/shared';
import { portraits } from '../assets/art.ts';
import { GameLayout } from '../components/game/GameLayout.tsx';
import { leaderboardApi } from '../services/gameApi.ts';
import { paths } from '../routes/paths.ts';
import '../styles/pages/leaderboard.css';

type Load = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; board: LeaderboardDTO };

const number = (n: number) => n.toLocaleString('en-GB');
const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export function LeaderboardPage() {
  return <GameLayout scene="expeditionMap" className="board">{(c) => <Leaderboard campaign={c} />}</GameLayout>;
}

function Leaderboard({ campaign: c }: { campaign: CampaignDTO }) {
  const [load, setLoad] = useState<Load>({ status: 'loading' });

  const fetchBoard = useCallback((signal?: AbortSignal) => {
    setLoad({ status: 'loading' });
    leaderboardApi
      .get(signal)
      .then((board) => setLoad({ status: 'ready', board }))
      .catch((err: unknown) => {
        if (signal?.aborted) return;
        setLoad({ status: 'error', message: err instanceof Error ? err.message : 'Could not load the leaderboard.' });
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchBoard(controller.signal);
    return () => controller.abort();
  }, [fetchBoard]);

  return (
    <main className="board__main">
      <header className="board__head">
        <div>
          <p className="eyebrow board__eyebrow">The river records</p>
          <h1 className="board__title">Explorers who made it home.</h1>
        </div>
        {load.status === 'ready' && load.board.you && (
          <dl className="board__me" aria-label="Your standing">
            <div>
              <dt>Your rank</dt>
              <dd>
                #{load.board.you.rank} <span>of {load.board.totalPlayers}</span>
              </dd>
            </div>
            <div>
              <dt>Your score</dt>
              <dd>{number(load.board.you.score)}</dd>
            </div>
          </dl>
        )}
      </header>

      {load.status === 'ready' && !load.board.you && (
        <p className="board__join" role="status">
          You're not on the board yet. Reach the rescue dock with your crew to join.
          <span className="board__join-score">Your score so far: {number(c.score)}</span>
          {c.state !== 'completed' && (
            <Link to={paths.map(c.id)} className="btn btn-link board__join-link">
              Open River Map
            </Link>
          )}
        </p>
      )}

      <section className="panel board__panel" aria-labelledby="board-caption" aria-busy={load.status === 'loading'}>
        {load.status === 'loading' && <BoardSkeleton />}

        {load.status === 'error' && (
          <div className="board__state" role="alert">
            <p>{load.message}</p>
            <button type="button" className="btn btn-primary" onClick={() => fetchBoard()}>
              Retry
            </button>
          </div>
        )}

        {load.status === 'ready' && load.board.entries.length === 0 && (
          <div className="board__state" role="status">
            <p className="board__empty-title">No explorer has made it home yet.</p>
            <p>Be the first to reach the rescue dock with your whole crew.</p>
            <Link to={paths.map(c.id)} className="btn btn-primary">
              Open River Map
            </Link>
          </div>
        )}

        {load.status === 'ready' && load.board.entries.length > 0 && <BoardTable board={load.board} />}
      </section>

      <p className="board__note">
        Only finished journeys are ranked. Scores come from cleared crossings and region bonuses, checked by the server. One row per explorer: their best
        journey. Equal scores: whoever finished first. Top {LEADERBOARD_SIZE} shown.
      </p>
    </main>
  );
}

function BoardTable({ board }: { board: LeaderboardDTO }) {
  const youOutside = board.you && !board.entries.some((e) => e.isYou) ? board.you : null;
  return (
    <table className="board__table">
      <caption id="board-caption" className="visually-hidden">
        Leaderboard: top {board.entries.length} of {board.totalPlayers} explorers who finished the game
      </caption>
      <thead>
        <tr>
          <th scope="col">Rank</th>
          <th scope="col">Explorer</th>
          <th scope="col">Score</th>
          <th scope="col">Perfect crossings</th>
          <th scope="col">Finished</th>
        </tr>
      </thead>
      <tbody>
        {board.entries.map((entry) => (
          <Row key={entry.rank} entry={entry} />
        ))}
        {youOutside && (
          <>
            <tr className="board__gap" aria-hidden="true">
              <td colSpan={5}>⋯</td>
            </tr>
            <Row entry={youOutside} />
          </>
        )}
      </tbody>
    </table>
  );
}

function Row({ entry }: { entry: LeaderboardEntryDTO }) {
  const medal = entry.rank <= 3 ? ` board__rank--${entry.rank}` : '';
  return (
    <tr className={entry.isYou ? 'board__row board__row--you' : 'board__row'}>
      <td data-label="Rank">
        <span className={`board__rank${medal}`}>{entry.rank}</span>
      </td>
      <th scope="row" data-label="Explorer">
        <span className="board__explorer">
          <img src={portraits[entry.character]} alt="" width={40} height={40} />
          {entry.explorerName}
          {entry.isYou && <span className="board__you">You</span>}
        </span>
      </th>
      <td data-label="Score" className="board__score">
        {number(entry.score)}
      </td>
      <td data-label="Perfect">{entry.perfectRate === null ? <span className="board__muted">—</span> : `${entry.perfectRate}%`}</td>
      <td data-label="Finished" className="board__date">
        <time dateTime={entry.finishedAt}>{day(entry.finishedAt)}</time>
      </td>
    </tr>
  );
}

function BoardSkeleton() {
  return (
    <div className="board__skeleton" role="status">
      <span className="visually-hidden">Loading the leaderboard…</span>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="skeleton board__skeleton-row" />
      ))}
    </div>
  );
}

// Page 10: Fishing Area / Direct Catch (Figma node 18:530).
// "Catch Fish" sends ONE request to POST /api/campaigns/:id/fish/catch with an Idempotency-Key.
// The server decides how many fish you get (bare hands: 1 per catch). There is no quiz and no Fish API here.
// If the connection drops, "Retry" re-sends the SAME key, so an uncertain catch can never count twice.
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CATCH_YIELD, FEED_BATCH_SIZE, type CampaignDTO } from '@riverbound/shared';
import { GameLayout } from '../components/game/GameLayout.tsx';
import { SpriteIcon } from '../components/SpriteIcon.tsx';
import { useSound } from '../hooks/SoundContext.tsx';
import { ApiError, newActionKey } from '../services/apiClient.ts';
import { campApi } from '../services/gameApi.ts';
import { paths } from '../routes/paths.ts';
import '../styles/pages/fishing.css';

type CatchState =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'caught'; caught: number; count: number }
  | { kind: 'error'; message: string; canRetry: boolean };

export function FishingPage() {
  return <GameLayout scene="fishingRiverbank" className="fishing">{(c, set) => <FishingContent campaign={c} setCampaign={set} />}</GameLayout>;
}

function FishingContent({ campaign: c, setCampaign }: { campaign: CampaignDTO; setCampaign: (c: CampaignDTO) => void }) {
  const { play } = useSound();
  const [state, setState] = useState<CatchState>({ kind: 'idle' });
  const actionKey = useRef(newActionKey());
  const catchCount = useRef(0);

  const inv = c.inventory;
  const blocked = c.state !== 'at_camp' || c.activeFeedingBatchId !== null || c.activeChallengeId !== null;
  const batchProgress = Math.min(inv.unfedAvailable, FEED_BATCH_SIZE);
  const readyToFeed = inv.unfedAvailable >= FEED_BATCH_SIZE;
  const missing = FEED_BATCH_SIZE - batchProgress;

  const doCatch = async () => {
    if (state.kind === 'pending' || blocked) return;
    setState({ kind: 'pending' });
    try {
      const result = await campApi.catchFish(c.id, actionKey.current);
      actionKey.current = newActionKey(); // success: the next catch is a new action
      catchCount.current += 1;
      setCampaign(result.campaign);
      setState({ kind: 'caught', caught: result.caught, count: catchCount.current });
      play('catch');
    } catch (error) {
      const uncertain = error instanceof ApiError && (error.code === 'NETWORK' || error.status >= 500);
      // Keep the same key only when we do not know if the catch happened. Otherwise start fresh.
      if (!uncertain) actionKey.current = newActionKey();
      setState({ kind: 'error', message: error instanceof Error ? error.message : 'The catch failed.', canRetry: uncertain });
    }
  };

  return (
    <main className="fishing__main">
      <p className="eyebrow fishing__eyebrow">The dock</p>
      <h1 className="fishing__title">A little patience. A fresh start.</h1>

      <section className="panel fishing__loadout" aria-labelledby="loadout-title">
        <h2 id="loadout-title" className="fishing__loadout-title">
          Bare hands
        </h2>
        <p className="fishing__loadout-text">
          One accepted catch → {CATCH_YIELD} unfed fish
        </p>
        <dl className="fishing__counts">
          <div>
            <dt>Unfed available:</dt>
            <dd>{inv.unfedAvailable}</dd>
          </div>
          <div>
            <dt>Feeding batch:</dt>
            <dd>
              {batchProgress} / {FEED_BATCH_SIZE}
            </dd>
          </div>
        </dl>
      </section>

      <div className="fishing__action">
        <p className="fishing__hint">Catch directly. The river keeps count for you.</p>

        <div className="panel fishing__status" role="status" aria-live="polite">
          {state.kind === 'caught' && (
            <span key={state.count} className="fishing__splash" aria-hidden="true">
              <SpriteIcon name="fish" size={40} /> +{state.caught}
            </span>
          )}
          <StatusText state={state} blocked={blocked} campaign={c} readyToFeed={readyToFeed} batchProgress={batchProgress} />
        </div>

        <div className="fishing__buttons">
          <button
            type="button"
            className="btn btn-primary fishing__catch"
            onClick={() => void doCatch()}
            disabled={state.kind === 'pending' || blocked}
            aria-busy={state.kind === 'pending'}
          >
            {state.kind === 'pending' ? 'Catching…' : state.kind === 'caught' ? 'Catch Again' : 'Catch Fish'}
          </button>
          <Link
            to={paths.feeding(c.id)}
            className={`btn fishing__continue${readyToFeed ? ' btn-secondary fishing__continue--ready' : ' btn-muted'}`}
            aria-describedby={readyToFeed ? undefined : 'feed-need'}
          >
            Continue to Feeding
          </Link>
          {!readyToFeed && (
            <span id="feed-need" className="visually-hidden">
              You need {missing} more unfed fish for a feeding batch.
            </span>
          )}
        </div>
      </div>
    </main>
  );
}

function StatusText({
  state,
  blocked,
  campaign: c,
  readyToFeed,
  batchProgress,
}: {
  state: CatchState;
  blocked: boolean;
  campaign: CampaignDTO;
  readyToFeed: boolean;
  batchProgress: number;
}) {
  if (blocked) {
    return (
      <p className="fishing__status-text">
        {c.activeFeedingBatchId ? (
          <>
            Finish your feeding batch first.{' '}
            <Link to={paths.feedingBatch(c.id, c.activeFeedingBatchId)}>Resume feeding</Link>
          </>
        ) : (
          <>
            Fishing is only possible at camp. <Link to={paths.camp(c.id)}>Back to camp</Link>
          </>
        )}
      </p>
    );
  }
  if (state.kind === 'pending') return <p className="fishing__status-text">Reaching into the shallows…</p>;
  if (state.kind === 'error') {
    return (
      <p className="fishing__status-text fishing__status-text--error">
        {state.message}
        {state.canRetry && ' Press Catch Fish to retry. It will not count twice.'}
      </p>
    );
  }
  if (state.kind === 'caught') {
    return (
      <p className="fishing__status-text">
        Caught {state.caught} unfed fish · Batch {batchProgress} / {FEED_BATCH_SIZE}
        {readyToFeed && <span className="fishing__ready"> · Ready to feed!</span>}
      </p>
    );
  }
  return <p className="fishing__status-text">Ready when you are.</p>;
}

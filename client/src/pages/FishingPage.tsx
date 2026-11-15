// Page 10: Fishing Area / Direct Catch (Figma node 18:530).
// "Catch Fish" sends ONE request to POST /api/campaigns/:id/fish/catch with an Idempotency-Key.
// The server decides how many fish you get (hand net: 1 per catch). There is no quiz and no Fish API here.
// If the connection drops, "Retry" re-sends the SAME key, so an uncertain catch can never count twice.
//
// Animation (15 Nov 2026): the explorer casts a hand net, waits for a bite and lifts it. The request is
// sent at the start of the cast; the fish appears in the net only once the server has confirmed the catch,
// and an empty net comes up if it failed. With reduced motion the catch is shown instantly instead.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CATCH_YIELD, FEED_BATCH_SIZE, type CampaignDTO } from '@riverbound/shared';
import { GameLayout } from '../components/game/GameLayout.tsx';
import { NET_TIMING, NetCastAnimation, prefersReducedMotion, type NetPhase } from '../components/game/NetCastAnimation.tsx';
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
  const [phase, setPhase] = useState<NetPhase>('idle');
  const [run, setRun] = useState(0);
  const actionKey = useRef(newActionKey());
  const catchCount = useRef(0);
  const timers = useRef<number[]>([]);

  // Stop any running animation timers when leaving the page.
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);
  const wait = (ms: number) => new Promise<void>((resolve) => timers.current.push(window.setTimeout(resolve, ms)));

  const inv = c.inventory;
  const blocked = c.state !== 'at_camp' || c.activeFeedingBatchId !== null || c.activeChallengeId !== null;
  const batchProgress = Math.min(inv.unfedAvailable, FEED_BATCH_SIZE);
  const readyToFeed = inv.unfedAvailable >= FEED_BATCH_SIZE;
  const missing = FEED_BATCH_SIZE - batchProgress;
  const busy = state.kind === 'pending' || phase !== 'idle';

  const doCatch = async () => {
    if (busy || blocked) return;
    const animate = !prefersReducedMotion();
    setState({ kind: 'pending' });

    // 1. Send the request now, so the server works while the net is in the air.
    const request = campApi.catchFish(c.id, actionKey.current).then(
      (result) => ({ ok: true as const, result }),
      (error: unknown) => ({ ok: false as const, error }),
    );

    // 2. Cast the net and let it sit in the water for a moment.
    if (animate) {
      setRun((r) => r + 1);
      setPhase('cast');
      await wait(NET_TIMING.cast);
      setPhase('wait');
      await wait(NET_TIMING.minDip);
    }

    // 3. Only now look at the server's answer.
    const outcome = await request;
    if (outcome.ok) {
      actionKey.current = newActionKey(); // success: the next catch is a new action
      if (animate) {
        setPhase('lift'); // the fish is in the net: the server has confirmed it
        await wait(NET_TIMING.lift);
        setPhase('caught');
      }
      catchCount.current += 1;
      setCampaign(outcome.result.campaign);
      setState({ kind: 'caught', caught: outcome.result.caught, count: catchCount.current });
      play('catch');
      if (animate) {
        await wait(NET_TIMING.caught);
        setPhase('idle');
      }
      return;
    }

    const { error } = outcome;
    const uncertain = error instanceof ApiError && (error.code === 'NETWORK' || error.status >= 500);
    // Keep the same key only when we do not know if the catch happened. Otherwise start fresh.
    if (!uncertain) actionKey.current = newActionKey();
    if (animate) {
      setPhase('missed'); // the net comes up empty
      await wait(NET_TIMING.missed);
      setPhase('idle');
    }
    setState({ kind: 'error', message: error instanceof Error ? error.message : 'The catch failed.', canRetry: uncertain });
  };

  return (
    <main className="fishing__main">
      <NetCastAnimation phase={phase} run={run} />
      <p className="eyebrow fishing__eyebrow">The dock</p>
      <h1 className="fishing__title">A little patience. A fresh start.</h1>

      <section className="panel fishing__loadout" aria-labelledby="loadout-title">
        <h2 id="loadout-title" className="fishing__loadout-title">
          Hand net
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
          {state.kind === 'caught' && phase === 'idle' && (
            <span key={state.count} className="fishing__splash" aria-hidden="true">
              <SpriteIcon name="fish" size={40} /> +{state.caught}
            </span>
          )}
          <StatusText state={state} phase={phase} blocked={blocked} campaign={c} readyToFeed={readyToFeed} batchProgress={batchProgress} />
        </div>

        <div className="fishing__buttons">
          <button
            type="button"
            className={`btn fishing__catch ${readyToFeed ? 'btn-secondary' : 'btn-primary'}`}
            onClick={() => void doCatch()}
            disabled={busy || blocked}
            aria-busy={busy}
          >
            {busy ? 'Casting the net…' : state.kind === 'caught' ? 'Catch Again' : 'Catch Fish'}
          </button>
          <Link
            to={paths.feeding(c.id)}
            className={`btn fishing__continue${readyToFeed ? ' btn-primary fishing__continue--ready' : ' btn-muted'}`}
            aria-describedby={readyToFeed ? 'feed-ready' : 'feed-need'}
          >
            Continue to Feeding →
          </Link>
          {readyToFeed && (
            <span id="feed-ready" className="visually-hidden">
              You have {inv.unfedAvailable} unfed fish. A feeding batch needs {FEED_BATCH_SIZE}.
            </span>
          )}
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
  phase,
  blocked,
  campaign: c,
  readyToFeed,
  batchProgress,
}: {
  state: CatchState;
  phase: NetPhase;
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
  if (phase === 'cast') return <p className="fishing__status-text">Casting the net…</p>;
  if (phase === 'wait') return <p className="fishing__status-text">Waiting for a bite…</p>;
  if (phase === 'lift') return <p className="fishing__status-text">Something is in the net!</p>;
  if (phase === 'missed') return <p className="fishing__status-text">The net came up empty…</p>;
  if (state.kind === 'pending') return <p className="fishing__status-text">Casting the net…</p>;
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
        {readyToFeed ? (
          <>
            {unfedCount(c)} fish ready! <span className="fishing__ready">Take them to the fish pen to feed them.</span>
          </>
        ) : (
          <>
            Caught {state.caught} unfed fish · Batch {batchProgress} / {FEED_BATCH_SIZE}
          </>
        )}
      </p>
    );
  }
  if (readyToFeed) {
    return (
      <p className="fishing__status-text">
        {unfedCount(c)} fish ready! <span className="fishing__ready">Take them to the fish pen to feed them.</span>
      </p>
    );
  }
  return <p className="fishing__status-text">Ready when you are.</p>;
}

const unfedCount = (c: CampaignDTO) => c.inventory.unfedAvailable;

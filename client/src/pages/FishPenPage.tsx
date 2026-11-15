// Page 11: Feeding Preparation / Fish Pen (Figma node 18:532).
// Rules v2.5: you need at least 12 unfed fish. "Start Feeding" (POST /api/campaigns/:id/feeding/start)
// makes the server pick a Fish API picture and reserve exactly the number of fish in that picture
// (1-12). With fewer than 12 fish the page explains the shortage and links back to the dock.
// If a batch already exists, the player resumes it instead of starting another.
import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FEED_MIN_UNFED, type CampaignDTO } from '@riverbound/shared';
import { GameLayout } from '../components/game/GameLayout.tsx';
import { SpriteIcon } from '../components/SpriteIcon.tsx';
import { ApiError, newActionKey } from '../services/apiClient.ts';
import { feedingApi } from '../services/gameApi.ts';
import { paths } from '../routes/paths.ts';
import '../styles/pages/feeding.css';

export function FishPenPage() {
  return <GameLayout scene="fishPen" className="pen">{(c) => <FishPenContent campaign={c} />}</GameLayout>;
}

function headline(unfed: number, reserved: number, hasBatch: boolean): string {
  if (hasBatch) return `${reserved} fish are waiting for their food.`;
  if (unfed >= FEED_MIN_UNFED) return 'Your hungry fish are ready.';
  if (unfed === 0) return 'The fish pen is empty.';
  return `${unfed} fish waiting. Catch ${FEED_MIN_UNFED - unfed} more.`;
}

function FishPenContent({ campaign: c }: { campaign: CampaignDTO }) {
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const actionKey = useRef(newActionKey());

  const inv = c.inventory;
  const batchId = c.activeFeedingBatchId;
  const enough = inv.unfedAvailable >= FEED_MIN_UNFED;
  const missing = Math.max(0, FEED_MIN_UNFED - inv.unfedAvailable);
  const shownFish = batchId ? inv.unfedReserved : Math.min(inv.unfedAvailable, FEED_MIN_UNFED);
  const busyElsewhere = !batchId && (c.state !== 'at_camp' || c.activeChallengeId !== null);

  const start = async () => {
    if (pending || !enough) return;
    setPending(true);
    setError(null);
    try {
      const result = await feedingApi.start(c.id, actionKey.current);
      navigate(paths.feedingBatch(c.id, result.batchId));
    } catch (err) {
      const uncertain = err instanceof ApiError && (err.code === 'NETWORK' || err.status >= 500);
      if (!uncertain) actionKey.current = newActionKey();
      setError(err instanceof Error ? err.message : 'Could not start feeding.');
      setPending(false);
    }
  };

  return (
    <main className="pen__main">
      <div className="pen__intro">
        <p className="eyebrow pen__eyebrow">The fish pen</p>
        <h1 className="pen__title">{headline(inv.unfedAvailable, inv.unfedReserved, batchId !== null)}</h1>

        <ul
          className="pen__fish"
          aria-label={batchId ? `${shownFish} fish reserved` : `${shownFish} of ${FEED_MIN_UNFED} fish needed to start feeding`}
        >
          {Array.from({ length: FEED_MIN_UNFED }, (_, i) => (
            <li key={i} className={`pen__tile${i < shownFish ? '' : ' pen__tile--empty'}`}>
              {i < shownFish ? <SpriteIcon name="fish" size={72} /> : <span className="pen__tile-label">Empty</span>}
            </li>
          ))}
        </ul>
      </div>

      <section className="panel pen__panel" aria-labelledby="batch-title">
        <h2 id="batch-title" className="pen__panel-title">
          {batchId ? 'Your batch is waiting' : 'Prepare a feeding batch'}
        </h2>
        <p className="pen__counts">
          Unfed {inv.unfedAvailable} <span aria-hidden="true">·</span> Reserved {inv.unfedReserved}{' '}
          <span aria-hidden="true">·</span> Fed {inv.fedAvailable}
        </p>
        <p className="pen__rules">
          {batchId ? (
            <>
              These {inv.unfedReserved} fish are reserved for you.
              <br />
              Answer one maths question to feed them.
            </>
          ) : enough ? (
            <>
              The river picture decides how many fish you feed (1 to 12). Food is free.
              <br />
              Starting holds those fish until you finish or exit.
            </>
          ) : (
            <>
              You need {FEED_MIN_UNFED} unfed fish to start feeding.
              <br />
              You need {missing} more. Catch them at the dock.
            </>
          )}
        </p>

        <div className="pen__crate">
          <span className="pen__crate-tile">
            <SpriteIcon name="food_crate" size={88} />
          </span>
          <p>
            A river picture shows fish and food chests.
            <br />
            Each chest holds food pellets. Next: a maths question.
          </p>
        </div>

        {error && (
          <p className="form-alert" role="alert">
            {error}
          </p>
        )}
        {busyElsewhere && (
          <p className="form-alert" role="alert">
            Finish your river crossing first.
          </p>
        )}

        <div className="pen__actions">
          {batchId ? (
            <Link to={paths.feedingBatch(c.id, batchId)} className="btn btn-primary pen__start">
              Resume Feeding
            </Link>
          ) : (
            <button
              type="button"
              className="btn btn-primary pen__start"
              onClick={() => void start()}
              disabled={!enough || pending || busyElsewhere}
              aria-busy={pending}
              aria-describedby={enough ? undefined : 'pen-missing'}
            >
              {pending ? 'Reserving fish…' : 'Start Feeding'}
            </button>
          )}
          {!enough && !batchId && (
            <span id="pen-missing" className="visually-hidden">
              You need {missing} more unfed fish.
            </span>
          )}
          <Link to={paths.fishing(c.id)} className="btn btn-link pen__more">
            Need more fish?
          </Link>
        </div>
      </section>
    </main>
  );
}

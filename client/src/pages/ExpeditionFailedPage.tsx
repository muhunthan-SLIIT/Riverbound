// Page 22: Expedition Failed (Figma node 18:554). No camp navigation, like the crossing page.
// Shown after the last heart is lost (campaign state "failed"). Nothing is taken away:
// coins, fish, gear, companions and score stay; only the unfinished route restarts.
// Each button first moves the campaign back to camp (POST /return-to-camp), then:
//   Return to Camp -> camp page
//   Free Rest      -> also POST /camp/rest (3 hearts, free), stays here to show it worked
//   Prepare Again  -> Route Details for the same route
import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MAX_HEARTS, getRegion, type CampaignDTO, type RegionId } from '@riverbound/shared';
import { GameLayout } from '../components/game/GameLayout.tsx';
import { useSound } from '../hooks/SoundContext.tsx';
import { ApiError, newActionKey } from '../services/apiClient.ts';
import { campApi, crossingApi } from '../services/gameApi.ts';
import { paths } from '../routes/paths.ts';
import { resumePath } from '../routes/resume.ts';
import '../styles/pages/failed.css';

type Busy = null | 'camp' | 'rest' | 'prepare';

export function ExpeditionFailedPage() {
  return (
    <GameLayout scene="riverAccident" className="failed" nav={false}>
      {(c, setCampaign) => <Failed campaign={c} setCampaign={setCampaign} />}
    </GameLayout>
  );
}

function Failed({ campaign: c, setCampaign }: { campaign: CampaignDTO; setCampaign: (c: CampaignDTO) => void }) {
  const navigate = useNavigate();
  const { play } = useSound();
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [rested, setRested] = useState(false);
  const returnKey = useRef(newActionKey());
  // Remember which route failed: the server clears it once the player is back at camp.
  const [lastRoute] = useState<RegionId | null>(c.expedition?.regionId ?? null);

  // Still on the river (or the game is over): this page does not apply.
  if (c.state === 'crossing' || c.state === 'completed' || c.state === 'feeding') {
    return (
      <main className="failed__card" role="status">
        <h1 className="failed__title failed__title--small">Your journey has moved on.</h1>
        <div className="failed__actions">
          <Link to={resumePath(c)} className="btn btn-primary failed__primary">
            Continue
          </Link>
        </div>
      </main>
    );
  }

  /** Puts the campaign back at camp (only needed the first time; safe to repeat). */
  const ensureAtCamp = async (): Promise<CampaignDTO> => {
    if (c.state !== 'failed') return c;
    try {
      const { campaign } = await crossingApi.returnToCamp(c.id, returnKey.current);
      setCampaign(campaign);
      return campaign;
    } catch (err) {
      if (err instanceof ApiError && err.code === 'NOT_ON_EXPEDITION') return c; // already back (another tab)
      throw err;
    }
  };

  const run = async (kind: Exclude<Busy, null>) => {
    setBusy(kind);
    setError(null);
    try {
      const atCamp = await ensureAtCamp();
      if (kind === 'camp') return navigate(paths.camp(c.id));
      if (kind === 'prepare') return navigate(lastRoute ? paths.route(c.id, lastRoute) : paths.map(c.id));
      if (atCamp.hearts < MAX_HEARTS) {
        const { campaign } = await campApi.rest(c.id);
        setCampaign(campaign);
      }
      setRested(true);
      play('button');
      setBusy(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setBusy(null);
    }
  };

  const full = c.hearts >= MAX_HEARTS;
  const routeName = lastRoute ? getRegion(lastRoute).name : null;

  return (
    <main className="failed__card" aria-labelledby="failed-title">
      <p className="eyebrow failed__eyebrow">The river got the better of you</p>
      <h1 id="failed-title" className="failed__title">
        Rest up. The river
        <br />
        will still be there.
      </h1>
      <p className="failed__text">
        Your coins, fish, equipment, companions, and committed score are safe.
        <br />
        Only unfinished route traversal resets. There is no paid revive.
      </p>
      <p className="failed__hearts" aria-live="polite">
        Hearts {c.hearts} / {MAX_HEARTS} · {full ? 'Fully rested and ready.' : 'Recover for free at camp.'}
      </p>

      <div className="failed__actions">
        <button type="button" className="btn btn-primary failed__primary" onClick={() => void run('camp')} disabled={busy !== null} aria-busy={busy === 'camp'}>
          {busy === 'camp' ? 'Heading back…' : 'Return to Camp'}
        </button>
        <button type="button" className="btn btn-secondary failed__rest" onClick={() => void run('rest')} disabled={busy !== null || full} aria-busy={busy === 'rest'}>
          {busy === 'rest' ? 'Resting…' : full ? 'Hearts full' : 'Free Rest'}
        </button>
        <button type="button" className="btn btn-link failed__prepare" onClick={() => void run('prepare')} disabled={busy !== null}>
          {busy === 'prepare' ? 'Please wait…' : 'Prepare Again'}
        </button>
      </div>

      {error ? (
        <p className="form-alert failed__note" role="alert">
          {error}
        </p>
      ) : (
        <p className="failed__note" aria-live="polite">
          {rested
            ? 'You rested by the campfire. Hearts 3 / 3.'
            : routeName
              ? `Prepare Again opens ${routeName}, starting from the first crossing. Every expedition starts with full hearts.`
              : 'Every expedition starts with full hearts.'}
        </p>
      )}
    </main>
  );
}

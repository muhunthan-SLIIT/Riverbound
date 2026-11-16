// Page 18: Treasure-Counting Crossing (Figma node 18:546). No camp navigation: the player stays focused.
// - Loads the crossing (GET /api/challenges/:id). The picture comes from our own route
//   (/api/challenges/:id/image), so the provider's file name, which holds the answers, is never seen.
// - Sends both counts together in ONE answer (POST /api/challenges/:id/answer). The server decides:
//     both right  -> full loot, no heart lost
//     one right   -> half loot, one heart lost (no loot on the last heart)
//     both wrong  -> no loot, one heart lost, a fresh picture
//     time up     -> same as both wrong (timed mode only; the deadline is kept on the server)
// - Scout (Mira) reveals the fish count once per region; Medic (Jonah) restores one heart once per trip.
// - If the picture really is broken on the server, it is swapped with no penalty.
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  MAX_HEARTS,
  getRegion,
  type CampaignDTO,
  type CompanionId,
  type CrossingAnswerResult,
  type CrossingChallengeDTO,
} from '@riverbound/shared';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { GameLayout } from '../components/game/GameLayout.tsx';
import { WeatherBadge, WeatherEffects } from '../components/game/RiverWeather.tsx';
import { useSound } from '../hooks/SoundContext.tsx';
import { ApiError, newActionKey } from '../services/apiClient.ts';
import { crossingApi } from '../services/gameApi.ts';
import { paths } from '../routes/paths.ts';
import '../styles/pages/crossing.css';

/** Extra wait after the deadline before telling the server time is up (the server allows 2 s for network delay). */
const TIMEOUT_REPORT_DELAY_MS = 2500;

type Load = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; challenge: CrossingChallengeDTO };
type Picture = 'loading' | 'ok' | 'replacing' | 'unavailable';

const isUncertain = (err: unknown) => err instanceof ApiError && (err.code === 'NETWORK' || err.status >= 500);
const message = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

export function CrossingPage() {
  return (
    <GameLayout scene="crossingGorge" className="cross" nav={false}>
      {(c, setCampaign) => <CrossingContent campaign={c} setCampaign={setCampaign} />}
    </GameLayout>
  );
}

function CrossingContent({ campaign: c, setCampaign }: { campaign: CampaignDTO; setCampaign: (c: CampaignDTO) => void }) {
  const navigate = useNavigate();
  const { challengeId = '' } = useParams();
  const { play } = useSound();
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [result, setResult] = useState<CrossingAnswerResult | null>(null);
  const [submitted, setSubmitted] = useState<{ fish: number; chests: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [busy, setBusy] = useState<null | 'answer' | 'next' | 'leave' | CompanionId>(null);
  const answerKey = useRef(newActionKey());
  const actionKey = useRef(newActionKey());

  // The saved campaign is the source of truth: an old link jumps to the crossing that is really open.
  useEffect(() => {
    if (c.state === 'crossing' && c.activeChallengeId && c.activeChallengeId !== challengeId) {
      navigate(paths.crossing(c.id, c.activeChallengeId), { replace: true });
    }
  }, [c.state, c.activeChallengeId, c.id, challengeId, navigate]);

  useEffect(() => {
    const controller = new AbortController();
    setLoad({ status: 'loading' });
    setResult(null);
    setSubmitted(null);
    crossingApi
      .get(challengeId, controller.signal)
      .then(({ challenge }) => setLoad({ status: 'ready', challenge }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setLoad({ status: 'error', message: message(err, 'Could not load this crossing.') });
      });
    return () => controller.abort();
  }, [challengeId]);

  const challenge = load.status === 'ready' ? load.challenge : null;
  const region = challenge ? getRegion(challenge.regionId) : null;

  const sendAnswer = useCallback(
    async (body: { fish: number; chests: number } | { timeout: true }) => {
      if (!challenge) return;
      setBusy('answer');
      setError(null);
      try {
        const res = await crossingApi.answer(challenge.id, body, answerKey.current);
        answerKey.current = newActionKey();
        setResult(res);
        setSubmitted('fish' in body ? body : null);
        setLoad({ status: 'ready', challenge: res.challenge });
        setCampaign(res.campaign);
        if (res.regionCleared) play('rescue');
        else if (res.cleared) play('crossing_clear');
        if (res.heartsLost > 0) setTimeout(() => play('heart_lost'), res.cleared ? 400 : 0);
        if (res.coinsAwarded > 0) setTimeout(() => play('coins'), 700);
      } catch (err) {
        if (err instanceof ApiError && err.code === 'ALREADY_ANSWERED') {
          // Answered in another tab or before a refresh: show the saved outcome.
          const fresh = await crossingApi.get(challenge.id).catch(() => null);
          if (fresh) setLoad({ status: 'ready', challenge: fresh.challenge });
        }
        if (!isUncertain(err)) answerKey.current = newActionKey(); // same key after a lost connection: never paid twice
        setError(message(err, 'Could not send your answer.'));
      } finally {
        setBusy(null);
      }
    },
    [challenge, play, setCampaign],
  );

  /** Next picture: after a cleared crossing, or a fresh picture after a miss. */
  const nextPicture = async () => {
    setBusy('next');
    setError(null);
    try {
      const res = await crossingApi.next(c.id, actionKey.current);
      actionKey.current = newActionKey();
      setCampaign(res.campaign);
      navigate(paths.crossing(c.id, res.challenge.id), { replace: true });
    } catch (err) {
      if (!isUncertain(err)) actionKey.current = newActionKey();
      setError(message(err, 'Could not load the next crossing.'));
    } finally {
      setBusy(null);
    }
  };

  const goToCamp = async () => {
    setBusy('leave');
    setError(null);
    try {
      const { campaign } = await crossingApi.returnToCamp(c.id, actionKey.current);
      actionKey.current = newActionKey();
      setCampaign(campaign);
      navigate(paths.camp(c.id), { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'NOT_ON_EXPEDITION') return navigate(paths.camp(c.id), { replace: true });
      if (!isUncertain(err)) actionKey.current = newActionKey();
      setError(message(err, 'Could not return to camp.'));
      setLeaveOpen(false);
      setBusy(null);
    }
  };

  const useCompanion = async (companion: CompanionId) => {
    setBusy(companion);
    setError(null);
    try {
      const res = await crossingApi.useCompanion(c.id, companion, actionKey.current);
      actionKey.current = newActionKey();
      setCampaign(res.campaign);
      if (res.challenge) setLoad({ status: 'ready', challenge: res.challenge });
      play('button');
    } catch (err) {
      if (!isUncertain(err)) actionKey.current = newActionKey();
      setError(message(err, 'That ability could not be used.'));
    } finally {
      setBusy(null);
    }
  };

  if (load.status === 'loading') return <p className="cross__status" role="status">Loading the crossing…</p>;
  if (load.status === 'error' || !challenge || !region) {
    return (
      <div className="cross__status" role="alert">
        <p>{load.status === 'error' ? load.message : 'This crossing is not available.'}</p>
        <div className="cross__status-actions">
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            Try again
          </button>
          <Link to={paths.camp(c.id)} className="btn btn-secondary">
            Back to camp
          </Link>
        </div>
      </div>
    );
  }

  const open = challenge.status === 'open';
  const onExpedition = c.state === 'crossing';

  return (
    <main className="cross__main">
      {/* Rain / storm behind the panels (looks only; the timer change is decided by the server). */}
      <WeatherEffects weather={c.expedition?.weather} />
      <header className="cross__head">
        <p className="eyebrow cross__eyebrow">
          {region.name} · Crossing {challenge.encounterIndex + 1} of {challenge.encounters}
        </p>
        <h1 className="cross__title">{headline(open, result)}</h1>
        <WeatherBadge weather={c.expedition?.weather} />
      </header>

      <PictureCard key={challenge.id} challenge={challenge} setCampaign={setCampaign} onReplaced={(id) => navigate(paths.crossing(c.id, id), { replace: true })} />

      <section className="panel cross__panel" aria-labelledby="cross-panel-title">
        {open ? (
          <AnswerForm challenge={challenge} campaign={c} busy={busy === 'answer'} disabled={busy !== null} onAnswer={sendAnswer} />
        ) : (
          <Outcome challenge={challenge} campaign={c} result={result} submitted={submitted} busy={busy} onNext={nextPicture} />
        )}
        {error && (
          <p className="form-alert cross__error" role="alert">
            {error}
          </p>
        )}
      </section>

      <footer className="cross__footer">
        {onExpedition && (
          <button type="button" className="btn btn-chip cross__chip" onClick={() => setLeaveOpen(true)} disabled={busy !== null}>
            Leave Expedition
          </button>
        )}
        <CompanionChips campaign={c} challenge={challenge} busy={busy} onUse={useCompanion} />
      </footer>

      <ConfirmDialog
        open={leaveOpen}
        title="Leave this expedition?"
        confirmLabel="Leave and return to camp"
        cancelLabel="Stay on the river"
        danger
        pending={busy === 'leave'}
        onConfirm={() => void goToCamp()}
        onCancel={() => setLeaveOpen(false)}
      >
        <p>
          You will return to camp and start {region.name} again from the first crossing next time. Your coins, fish, gear, crew and points are kept, and
          crossings you already cleared will not pay again.
        </p>
      </ConfirmDialog>
    </main>
  );
}

function headline(open: boolean, result: CrossingAnswerResult | null): string {
  if (open || !result) return open ? 'Look closely. Cross with confidence.' : 'This crossing is finished.';
  if (result.regionCleared) return result.completed ? 'The rescue dock is in sight!' : 'You made it across the region!';
  if (result.failed) return 'The river was too strong this time.';
  if (result.result === 'perfect') return 'A perfect count. Across you go!';
  if (result.result === 'partial') return 'Close enough to cross.';
  if (result.result === 'timeout') return 'Time ran out.';
  return 'Not quite. Look again.';
}

// ---------------------------------------------------------------- picture

function PictureCard({
  challenge,
  setCampaign,
  onReplaced,
}: {
  challenge: CrossingChallengeDTO;
  setCampaign: (c: CampaignDTO) => void;
  onReplaced: (id: string) => void;
}) {
  const [picture, setPicture] = useState<Picture>('loading');
  const [version, setVersion] = useState(0);
  const replaceKey = useRef(newActionKey());

  // The picture did not load: ask the server to check it. Only a picture that is really broken
  // on the server is swapped (free, new deadline); otherwise it is a connection problem on our side.
  const onError = async () => {
    if (challenge.status !== 'open') return setPicture('unavailable');
    setPicture('replacing');
    try {
      const res = await crossingApi.replace(challenge.id, replaceKey.current);
      setCampaign(res.campaign);
      onReplaced(res.challenge.id);
    } catch (err) {
      if (!isUncertain(err)) replaceKey.current = newActionKey();
      setPicture('unavailable');
    }
  };

  return (
    <section className="cross__picture" aria-labelledby="picture-label">
      <p id="picture-label" className="cross__picture-label">
        Count only what is inside this picture
      </p>
      <div className="cross__frame">
        <img
          key={version}
          src={`${challenge.imageUrl}${version ? `?retry=${version}` : ''}`}
          alt="River crossing picture with fish and treasure chests to count. A text version is not available yet."
          width={660}
          height={360}
          className={`cross__image${picture === 'ok' ? '' : ' cross__image--hidden'}`}
          onLoad={() => setPicture('ok')}
          onError={() => void onError()}
        />
        {picture !== 'ok' && (
          <div className="cross__frame-state" role={picture === 'unavailable' ? 'alert' : 'status'}>
            {picture === 'loading' && 'Loading the picture…'}
            {picture === 'replacing' && 'Checking the picture…'}
            {picture === 'unavailable' && (
              <>
                <p>The picture did not load. Check your connection, then try again.</p>
                {challenge.timed && challenge.status === 'open' && <p>Your timer keeps running while you reconnect.</p>}
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setPicture('loading');
                    setVersion((v) => v + 1);
                  }}
                >
                  Reload picture
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- answer form

function useCountdown(deadline: string | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadline) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [deadline]);
  if (!deadline) return null;
  return new Date(deadline).getTime() - now;
}

function parseCount(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d{1,2}$/.test(trimmed)) return null;
  return Number(trimmed);
}

function AnswerForm({
  challenge,
  campaign: c,
  busy,
  disabled,
  onAnswer,
}: {
  challenge: CrossingChallengeDTO;
  campaign: CampaignDTO;
  busy: boolean;
  disabled: boolean;
  onAnswer: (body: { fish: number; chests: number } | { timeout: true }) => void;
}) {
  const [fish, setFish] = useState('');
  const [chests, setChests] = useState('');
  const [invalid, setInvalid] = useState<{ fish?: string; chests?: string }>({});
  const msLeft = useCountdown(challenge.deadline);
  const timeoutSent = useRef(false);
  const hinted = challenge.hintFish !== null;

  // When time runs out, tell the server once. The server checks its own deadline before accepting it.
  useEffect(() => {
    if (msLeft === null || timeoutSent.current || disabled) return;
    if (msLeft <= -TIMEOUT_REPORT_DELAY_MS) {
      timeoutSent.current = true;
      onAnswer({ timeout: true });
    }
  }, [msLeft, disabled, onAnswer]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const f = hinted ? challenge.hintFish : parseCount(fish);
    const ch = parseCount(chests);
    const errors: { fish?: string; chests?: string } = {};
    if (f === null) errors.fish = 'Enter a whole number from 0 to 99.';
    if (ch === null) errors.chests = 'Enter a whole number from 0 to 99.';
    setInvalid(errors);
    if (f === null || ch === null) return;
    onAnswer({ fish: f, chests: ch });
  };

  const seconds = msLeft === null ? null : Math.max(0, Math.ceil(msLeft / 1000));
  const status = seconds === null ? 'Untimed' : seconds > 0 ? `${seconds}s left` : "Time's up";

  return (
    <form className="cross__form" onSubmit={submit} noValidate aria-busy={busy}>
      <h2 id="cross-panel-title" className="cross__panel-title">
        Your crossing counts
      </h2>
      <p className="cross__meta">
        <span className={seconds !== null && seconds <= 10 ? 'cross__timer cross__timer--low' : 'cross__timer'} role="timer" aria-live="off">
          {status}
        </span>{' '}
        · Hearts {c.hearts} / {MAX_HEARTS}
      </p>
      {/* Announce the timer only once, near the end (not every second). */}
      <p className="visually-hidden" aria-live="polite">
        {seconds !== null && seconds <= 10 && seconds > 0 ? 'Ten seconds or less left.' : ''}
      </p>

      <label className="cross__field">
        <span className="cross__label">Number of fish</span>
        {hinted ? (
          <>
            <input className="cross__input" value={String(challenge.hintFish)} readOnly aria-describedby="hint-note" />
            <span id="hint-note" className="cross__hint">
              Mira counted the fish for you.
            </span>
          </>
        ) : (
          <input
            className="cross__input"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            placeholder="Enter whole number"
            value={fish}
            onChange={(e) => setFish(e.target.value)}
            aria-invalid={invalid.fish ? true : undefined}
            aria-describedby={invalid.fish ? 'fish-error' : undefined}
            disabled={disabled}
          />
        )}
        {invalid.fish && (
          <span id="fish-error" className="field__error">
            {invalid.fish}
          </span>
        )}
      </label>

      <label className="cross__field">
        <span className="cross__label">Number of treasure chests</span>
        <input
          className="cross__input"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          placeholder="Enter whole number"
          value={chests}
          onChange={(e) => setChests(e.target.value)}
          aria-invalid={invalid.chests ? true : undefined}
          aria-describedby={invalid.chests ? 'chest-error' : undefined}
          disabled={disabled}
        />
        {invalid.chests && (
          <span id="chest-error" className="field__error">
            {invalid.chests}
          </span>
        )}
      </label>

      <button type="submit" className="btn btn-primary cross__submit" disabled={disabled} aria-busy={busy}>
        {busy ? 'Checking…' : 'Submit Answer'}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------- outcome

function Outcome({
  challenge,
  campaign: c,
  result,
  submitted,
  busy,
  onNext,
}: {
  challenge: CrossingChallengeDTO;
  campaign: CampaignDTO;
  result: CrossingAnswerResult | null;
  submitted: { fish: number; chests: number } | null;
  busy: string | null;
  onNext: () => void;
}) {
  const solution = challenge.solution;
  const lines: string[] = [];
  if (solution) lines.push(`The picture had ${solution.fish} fish and ${solution.chests} ${solution.chests === 1 ? 'chest' : 'chests'}.`);

  if (result) {
    if (submitted) lines.push(`You counted ${submitted.fish} fish and ${submitted.chests} ${submitted.chests === 1 ? 'chest' : 'chests'}.`);
    if (result.cleared && result.alreadyRewarded) lines.push('You cleared this crossing on an earlier trip, so its reward is already claimed.');
    else if (result.coinsAwarded > 0 || result.pointsAwarded > 0) lines.push(`+${result.coinsAwarded} coins · +${result.pointsAwarded} points`);
    if (result.heartsLost > 0) lines.push(`You lost ${result.heartsLost} heart. Hearts ${result.campaign.hearts} / ${MAX_HEARTS}.`);
    if (result.result === 'partial' && result.failed) lines.push('One count was right, but that was your last heart, so there is no loot.');
    if (result.regionCleared) lines.push(`Region bonus: +${result.regionCleared.bonusPoints} points for the hearts you kept.`);
    if (result.failed) lines.push('Your coins, fish, gear and crew are safe.');
  }

  // What happens next comes from the saved campaign, so it also works after a page refresh.
  let action: { label: string; run?: () => void; to?: string };
  if (result?.regionCleared || c.state === 'completed') {
    // Region summary first (Page 21); it leads on to the rescue or the escape.
    action = { label: 'See region results', to: paths.checkpoint(c.id) };
  } else if (c.state === 'failed') {
    action = { label: 'Continue', to: paths.failed(c.id) };
  } else if (c.state === 'crossing') {
    const cleared = result ? result.cleared : challenge.status === 'correct' || challenge.status === 'partial';
    action = { label: cleared ? 'Next crossing' : 'Try a fresh picture', run: onNext };
  } else {
    action = { label: 'Back to camp', to: paths.camp(c.id) };
  }

  return (
    <div className="cross__outcome" role="status">
      <h2 id="cross-panel-title" className="cross__panel-title">
        {outcomeTitle(challenge.status)}
      </h2>
      {lines.map((line) => (
        <p key={line} className="cross__outcome-line">
          {line}
        </p>
      ))}
      {action.to ? (
        <Link to={action.to} className="btn btn-primary cross__submit">
          {action.label}
        </Link>
      ) : (
        <button type="button" className="btn btn-primary cross__submit" onClick={action.run} disabled={busy !== null} aria-busy={busy !== null}>
          {busy === 'next' || busy === 'leave' ? 'Please wait…' : action.label}
        </button>
      )}
    </div>
  );
}

function outcomeTitle(status: CrossingChallengeDTO['status']): string {
  switch (status) {
    case 'correct':
      return 'Both counts correct';
    case 'partial':
      return 'One count correct';
    case 'wrong':
      return 'Both counts were off';
    case 'timeout':
      return 'Out of time';
    default:
      return 'Crossing closed';
  }
}

// ---------------------------------------------------------------- companions

function CompanionChips({
  campaign: c,
  challenge,
  busy,
  onUse,
}: {
  campaign: CampaignDTO;
  challenge: CrossingChallengeDTO;
  busy: string | null;
  onUse: (companion: CompanionId) => void;
}) {
  const open = challenge.status === 'open' && c.state === 'crossing';
  const has = (id: CompanionId) => c.companions.includes(id);

  let scout: { label: string; usable: boolean };
  if (!has('mira')) scout = { label: 'Scout · Not rescued', usable: false };
  else if (c.scoutUsedRegions.includes(challenge.regionId)) scout = { label: 'Scout · Used in this region', usable: false };
  else scout = { label: 'Scout · Reveal fish count', usable: open };

  let medic: { label: string; usable: boolean };
  if (!has('jonah')) medic = { label: 'Medic · Not rescued', usable: false };
  else if (c.expedition?.medicUsed) medic = { label: 'Medic · Used this trip', usable: false };
  else if (c.hearts >= MAX_HEARTS) medic = { label: 'Medic · Hearts full', usable: false };
  else medic = { label: 'Medic · Restore 1 heart', usable: c.state === 'crossing' };

  const total = challenge.encounters;
  const nextLeft = total - challenge.encounterIndex - (challenge.status === 'correct' || challenge.status === 'partial' ? 1 : 0);
  const navigator = has('tess') ? `Navigator · ${nextLeft > 0 ? `${nextLeft} crossing${nextLeft === 1 ? '' : 's'} to go` : 'Region ahead is clear'}` : 'Navigator · Not rescued';

  return (
    <>
      <button type="button" className="btn btn-chip cross__chip" disabled={!scout.usable || busy !== null} onClick={() => onUse('mira')} aria-busy={busy === 'mira'}>
        {busy === 'mira' ? 'Mira is counting…' : scout.label}
      </button>
      <button type="button" className="btn btn-chip cross__chip" disabled={!medic.usable || busy !== null} onClick={() => onUse('jonah')} aria-busy={busy === 'jonah'}>
        {busy === 'jonah' ? 'Jonah is helping…' : medic.label}
      </button>
      <p className={`cross__chip cross__chip--info${has('tess') ? ' cross__chip--on' : ''}`}>{navigator}</p>
    </>
  );
}

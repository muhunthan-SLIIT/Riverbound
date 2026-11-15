// Page 12: Feeding Maths Challenge (Figma node 18:534). No camp navigation: the player stays focused.
// - Loads the open question for the active batch (GET /api/campaigns/:id/feeding/active).
// - Sends ONE answer (POST /api/challenges/:id/answer). The server checks it and gives the reward:
//     correct -> the batch's fish become fed, +5 coins once, reward chest shown
//     wrong   -> worked solution, nothing lost, fish stay reserved, "Try a new question"
// - "Exit feeding" asks first, then gives the fish back (POST /api/feeding-batches/:id/cancel).
// Rules v2.5: the question is built from a Fish API picture. The picture is shown here (served by
// our server, never the provider's file name). Its fish are your batch; its chests are food chests.
// Untimed by design: this is a learning activity.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  feedingDifficultyFor,
  type CampaignDTO,
  type FeedingAnswer,
  type FeedingChallengeDTO,
  type FeedingType,
} from '@riverbound/shared';
import { items } from '../assets/art.ts';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { GameLayout } from '../components/game/GameLayout.tsx';
import { SpriteIcon } from '../components/SpriteIcon.tsx';
import { useSound } from '../hooks/SoundContext.tsx';
import { ApiError, newActionKey } from '../services/apiClient.ts';
import { feedingApi, type FeedingAnswerResponse } from '../services/gameApi.ts';
import { paths } from '../routes/paths.ts';
import '../styles/pages/feeding.css';

/** Wording for each question type. The numbers themselves always come from the server's question. */
const COPY: Record<FeedingType, { tag: string; title: string; label: string; hint: string }> = {
  total_food: { tag: 'Total food', title: 'Count every pellet.', label: 'Total pellets', hint: 'Multiply chests by pellets in each chest.' },
  equal_share: { tag: 'Fair share', title: 'A fair share for every fish.', label: 'Pellets per fish', hint: 'No decimals or fractions needed.' },
  enough_food: { tag: 'Enough food?', title: 'Is there enough for everyone?', label: 'Is there enough food?', hint: 'Compare the pellets you have with the pellets you need.' },
  leftover: { tag: 'Leftovers', title: 'What is left after dinner?', label: 'Pellets left over', hint: 'Work out what the fish eat, then subtract.' },
  share_remainder: { tag: 'Share and remainder', title: 'Share fairly. Count what is left.', label: 'Pellets per fish', hint: 'Whole pellets only. Give the share and the remainder.' },
  extra_crates: { tag: 'Extra chests', title: 'How many more chests?', label: 'Extra chests needed', hint: 'A part-chest still means one more chest.' },
};

type Load =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'closed' } // no open batch (already fed, cancelled or never started)
  | { status: 'ready'; batchId: string; challenge: FeedingChallengeDTO };

export function FeedingChallengePage() {
  return (
    <GameLayout scene="fishPen" className="feed" nav={false}>
      {(c, setCampaign) => <FeedingContent campaign={c} setCampaign={setCampaign} />}
    </GameLayout>
  );
}

function FeedingContent({ campaign: c, setCampaign }: { campaign: CampaignDTO; setCampaign: (c: CampaignDTO) => void }) {
  const navigate = useNavigate();
  const { batchId: urlBatchId } = useParams();
  const { play } = useSound();
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [result, setResult] = useState<FeedingAnswerResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  const [exiting, setExiting] = useState(false);
  const answerKey = useRef(newActionKey());

  // Load the open question for this batch (also used after a page refresh).
  useEffect(() => {
    let cancelled = false;
    feedingApi
      .active(c.id)
      .then(({ active }) => {
        if (cancelled) return;
        if (!active) return setLoad({ status: 'closed' });
        // The URL may hold an old batch id: always follow the server's active batch.
        if (active.batchId !== urlBatchId) navigate(paths.feedingBatch(c.id, active.batchId), { replace: true });
        setLoad({ status: 'ready', batchId: active.batchId, challenge: active.challenge });
      })
      .catch((err: unknown) => !cancelled && setLoad({ status: 'error', message: err instanceof Error ? err.message : 'Could not load the question.' }));
    return () => {
      cancelled = true;
    };
    // Only on first load; later updates come from the answer / retry responses.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (answer: FeedingAnswer) => {
    if (load.status !== 'ready' || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await feedingApi.answer(load.challenge.id, answer, answerKey.current);
      answerKey.current = newActionKey();
      setResult(response);
      setCampaign(response.campaign);
      play(response.result === 'correct' ? 'feed_correct' : 'feed_wrong');
      if (response.result === 'correct') setTimeout(() => play('coins'), 400);
    } catch (err) {
      const uncertain = err instanceof ApiError && (err.code === 'NETWORK' || err.status >= 500);
      if (!uncertain) answerKey.current = newActionKey();
      setError(err instanceof Error ? err.message : 'Could not send your answer.');
    } finally {
      setSubmitting(false);
    }
  };

  const newQuestion = async () => {
    if (load.status !== 'ready') return;
    setRetrying(true);
    setError(null);
    try {
      const fresh = await feedingApi.retry(load.batchId);
      setCampaign(fresh.campaign);
      setResult(null);
      setLoad({ status: 'ready', batchId: fresh.batchId, challenge: fresh.challenge });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not get a new question.');
    } finally {
      setRetrying(false);
    }
  };

  const exitFeeding = async () => {
    if (load.status !== 'ready') return;
    setExiting(true);
    try {
      const { campaign } = await feedingApi.cancel(load.batchId);
      setCampaign(campaign);
      navigate(paths.feeding(c.id), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not exit feeding.');
      setExitOpen(false);
      setExiting(false);
    }
  };

  if (load.status === 'loading') return <p className="feed__status" role="status">Loading your feeding batch…</p>;
  if (load.status === 'error') {
    return (
      <div className="feed__status" role="alert">
        <p>{load.message}</p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          Try again
        </button>
      </div>
    );
  }
  if (load.status === 'closed' && !result) {
    return (
      <div className="feed__status" role="status">
        <p>This feeding batch is finished. Your fish are safe.</p>
        <div className="feed__status-actions">
          <Link to={paths.inventory(c.id)} className="btn btn-primary">
            Go to inventory
          </Link>
          <Link to={paths.feeding(c.id)} className="btn btn-secondary">
            Back to the fish pen
          </Link>
        </div>
      </div>
    );
  }
  if (load.status !== 'ready') return null;

  const q = load.challenge.question;
  const copy = COPY[q.type];
  const difficulty = feedingDifficultyFor(c.regionsCleared.length);
  const correct = result?.result === 'correct';

  return (
    <>
      <main className="feed__main">
        <p className="eyebrow feed__eyebrow">
          Feeding maths · {difficulty} · {copy.tag}
        </p>
        <h1 className="feed__title">{correct ? `${q.params.fish} happy fish!` : copy.title}</h1>

        <section className="feed__card" aria-labelledby="batch-label">
          <div className="feed__batch">
            <p id="batch-label" className="feed__batch-label">
              Your reserved batch · {q.params.fish} fish · {q.params.crates} food chest{q.params.crates === 1 ? '' : 's'}
            </p>
            {load.challenge.imageUrl ? (
              <figure className={`feed__picture${correct ? ' feed__picture--happy' : ''}`}>
                {/* The counts are already in the question, so the alt text may say them. */}
                <img
                  src={load.challenge.imageUrl}
                  alt={`River picture with ${q.params.fish} fish and ${q.params.crates} food chest${q.params.crates === 1 ? '' : 's'}.`}
                  width={660}
                  height={360}
                />
                <figcaption>The fish in this picture are your batch. Each chest holds food pellets.</figcaption>
              </figure>
            ) : (
              <ul className={`feed__fish${correct ? ' feed__fish--happy' : ''}`} aria-label={`${q.params.fish} fish`}>
                {Array.from({ length: q.params.fish }, (_, i) => (
                  <li key={i}>
                    <SpriteIcon name="fish" size={q.params.fish > 4 ? 64 : 112} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="feed__supply">
            <span className="feed__supply-tile">
              <SpriteIcon name="food_crate" size={96} />
            </span>
            <div>
              <p className="feed__supply-title">
                {q.params.crates} food chest{q.params.crates === 1 ? '' : 's'}
              </p>
              <p className="feed__supply-text">{q.params.perCrate} pellets in each chest</p>
              {(q.type === 'enough_food' || q.type === 'leftover' || q.type === 'extra_crates') && (
                <p className="feed__supply-text">Each fish needs {q.params.needPerFish}</p>
              )}
            </div>
          </div>

          {correct && result ? (
            <RewardPanel result={result} campaignId={c.id} />
          ) : result?.result === 'wrong' ? (
            <WrongPanel result={result} onRetry={() => void newQuestion()} retrying={retrying} />
          ) : (
            <QuestionForm key={load.challenge.id} challenge={load.challenge} label={copy.label} hint={copy.hint} submitting={submitting} onSubmit={submit} />
          )}

          {error && (
            <p className="form-alert feed__error" role="alert">
              {error}
            </p>
          )}
        </section>
      </main>

      <footer className="feed__footer">
        {correct ? (
          <Link to={paths.camp(c.id)} className="btn btn-chip feed__exit">
            Back to camp
          </Link>
        ) : (
          <button type="button" className="btn btn-chip feed__exit" onClick={() => setExitOpen(true)}>
            Exit feeding
          </button>
        )}
        <p className="feed__note">
          {correct ? `Fed ${c.inventory.fedAvailable}` : `Reserved ${c.inventory.unfedReserved}`} · No timer · Wrong answers never cost hearts.
        </p>
      </footer>

      <ConfirmDialog
        open={exitOpen}
        title="Exit feeding?"
        confirmLabel="Exit and release fish"
        cancelLabel="Keep feeding"
        pending={exiting}
        onConfirm={() => void exitFeeding()}
        onCancel={() => setExitOpen(false)}
      >
        <p>Your four reserved fish go back to your unfed fish. You can start a new batch any time.</p>
        <p>No coins are given for an unfinished batch.</p>
      </ConfirmDialog>
    </>
  );
}

/** The answer controls change with the question: a number, Yes / No, or share + remainder. */
function QuestionForm({
  challenge,
  label,
  hint,
  submitting,
  onSubmit,
}: {
  challenge: FeedingChallengeDTO;
  label: string;
  hint: string;
  submitting: boolean;
  onSubmit: (answer: FeedingAnswer) => void;
}) {
  const q = challenge.question;
  const [value, setValue] = useState('');
  const [remainder, setRemainder] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  const toCount = (text: string): number | null => (/^\d{1,4}$/.test(text.trim()) ? Number(text.trim()) : null);

  const submitNumber = (event: FormEvent) => {
    event.preventDefault();
    if (q.answerKind === 'number') {
      const n = toCount(value);
      if (n === null) return setFieldError('Enter a whole number, like 6.');
      onSubmit({ kind: 'number', value: n });
    } else if (q.answerKind === 'quotient_remainder') {
      const a = toCount(value);
      const b = toCount(remainder);
      if (a === null || b === null) return setFieldError('Enter whole numbers in both boxes.');
      onSubmit({ kind: 'quotient_remainder', quotient: a, remainder: b });
    }
  };

  return (
    <form className="feed__question" onSubmit={submitNumber} noValidate aria-busy={submitting}>
      <div className="feed__ask">
        <p className="feed__ask-text">{q.text}</p>
        <p className="feed__ask-hint">{hint}</p>
      </div>

      <div className="feed__answer">
        {q.answerKind === 'boolean' ? (
          <fieldset className="feed__yesno">
            <legend className="feed__label">{label}</legend>
            <button type="button" className="btn btn-primary" disabled={submitting} onClick={() => onSubmit({ kind: 'boolean', value: true })}>
              Yes, there is enough
            </button>
            <button type="button" className="btn btn-secondary feed__no" disabled={submitting} onClick={() => onSubmit({ kind: 'boolean', value: false })}>
              No, not enough
            </button>
          </fieldset>
        ) : (
          <>
            <div className="feed__inputs">
              <label className="feed__field">
                <span className="feed__label">{label}</span>
                <input
                  ref={inputRef}
                  className="feed__input"
                  inputMode="numeric"
                  autoComplete="off"
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value);
                    setFieldError(null);
                  }}
                  aria-invalid={fieldError ? true : undefined}
                  aria-describedby={fieldError ? 'feed-error' : undefined}
                  disabled={submitting}
                />
              </label>
              {q.answerKind === 'quotient_remainder' && (
                <label className="feed__field">
                  <span className="feed__label">Pellets left over</span>
                  <input
                    className="feed__input"
                    inputMode="numeric"
                    autoComplete="off"
                    value={remainder}
                    onChange={(e) => {
                      setRemainder(e.target.value);
                      setFieldError(null);
                    }}
                    aria-invalid={fieldError ? true : undefined}
                    disabled={submitting}
                  />
                </label>
              )}
            </div>
            {fieldError && (
              <p id="feed-error" className="field__error">
                {fieldError}
              </p>
            )}
            <button type="submit" className="btn btn-primary feed__submit" disabled={submitting} aria-busy={submitting}>
              {submitting ? 'Checking…' : 'Submit Answer'}
            </button>
          </>
        )}
      </div>
    </form>
  );
}

function answerText(a: FeedingAnswer): string {
  if (a.kind === 'boolean') return a.value ? 'Yes' : 'No';
  if (a.kind === 'quotient_remainder') return `${a.quotient} each, ${a.remainder} left over`;
  return String(a.value);
}

/** Correct: the server has ALREADY saved the reward. The chest is only a picture of it. */
function RewardPanel({ result, campaignId }: { result: FeedingAnswerResponse; campaignId: string }) {
  return (
    <div className="feed__result feed__result--reward" role="status">
      <img src={items.rewardChestOpen} alt="An open treasure chest full of coins" className="feed__chest" width={180} height={180} />
      <div>
        <p className="feed__result-title">Correct! The fish are fed.</p>
        <p className="feed__coins">+{result.coinsAwarded} coins</p>
        <p className="feed__result-text">{result.challenge.question.params.fish} fish ready to sell at 10 coins each.</p>
        <div className="feed__result-actions">
          <Link to={paths.inventory(campaignId)} className="btn btn-primary">
            Sell fed fish
          </Link>
          <Link to={paths.fishing(campaignId)} className="btn btn-secondary">
            Catch more fish
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Wrong: show the working. Nothing is lost; the next try is a NEW question for the same fish. */
function WrongPanel({ result, onRetry, retrying }: { result: FeedingAnswerResponse; onRetry: () => void; retrying: boolean }) {
  return (
    <div className="feed__result feed__result--wrong" role="alert">
      <p className="feed__result-title">Not quite. Here is how it works:</p>
      <ol className="feed__steps">
        {(result.workedSolution ?? []).map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p className="feed__result-text">
        The answer was <strong>{answerText(result.correctAnswer)}</strong>. No hearts or coins lost. Your fish are still reserved.
      </p>
      <button type="button" className="btn btn-primary" onClick={onRetry} disabled={retrying} aria-busy={retrying}>
        {retrying ? 'Preparing…' : 'Try a new question'}
      </button>
    </div>
  );
}

// Page 05: Campaign Selection — "Your expedition journal" (Figma node 18:520).
// Loads the player's saved journeys from GET /api/campaigns.
// Rules (App Spec page 5):
//   - One unfinished journey per account. "Continue Adventure" resumes it exactly where it was saved.
//   - To start again, the player must confirm "Abandon and start new". The old journey is archived
//     (POST /api/campaigns/:id/abandon), never deleted, and stays listed read-only.
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CHARACTERS, MAX_HEARTS, campNameFor, type CampaignDTO } from '@riverbound/shared';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { Emblem } from '../components/Emblem.tsx';
import { Portrait } from '../components/Portrait.tsx';
import { SceneBackground } from '../components/SceneBackground.tsx';
import { useSession } from '../hooks/SessionContext.tsx';
import { campaignApi } from '../services/gameApi.ts';
import { isUnfinished, resumePath } from '../routes/resume.ts';
import { paths } from '../routes/paths.ts';
import '../styles/pages/campaigns.css';

type Load = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; campaigns: CampaignDTO[] };

const GENDER_LABEL = { female: 'Female explorer', male: 'Male explorer' } as const;

function regionsText(count: number): string {
  if (count === 0) return 'No regions completed';
  return `${count} region${count === 1 ? '' : 's'} completed`;
}

/** Shown on the card when the journey was saved in the middle of something. */
function statusBadge(c: CampaignDTO): string | null {
  if (c.state === 'feeding') return 'Feeding in progress';
  if (c.state === 'crossing') return 'River crossing in progress';
  if (c.state === 'failed') return 'Swept back to camp';
  if (c.state === 'completed') return 'Escaped together';
  if (c.state === 'abandoned') return 'Abandoned';
  return null;
}

export function CampaignSelectionPage() {
  const navigate = useNavigate();
  const { signOut } = useSession();
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [abandoning, setAbandoning] = useState(false);
  const [abandonError, setAbandonError] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    setLoad({ status: 'loading' });
    try {
      const { campaigns } = await campaignApi.list();
      setLoad({ status: 'ready', campaigns });
    } catch (error) {
      setLoad({ status: 'error', message: error instanceof Error ? error.message : 'Could not load your journal.' });
    }
  }, []);

  useEffect(() => {
    void fetchCampaigns();
  }, [fetchCampaigns]);

  const campaigns = load.status === 'ready' ? load.campaigns : [];
  const current = campaigns.find(isUnfinished) ?? null;
  const earlier = campaigns.filter((c) => c !== current);

  const confirmAbandon = async () => {
    if (!current) return;
    setAbandoning(true);
    setAbandonError(null);
    try {
      await campaignApi.abandon(current.id);
      setConfirmOpen(false);
      navigate(paths.newCampaign);
    } catch (error) {
      setAbandonError(error instanceof Error ? error.message : 'Could not abandon this journey.');
    } finally {
      setAbandoning(false);
    }
  };

  return (
    <div className="scene journal">
      <SceneBackground scene="campHub" />
      <div className="journal__backdrop" aria-hidden="true" />

      <header className="journal__header">
        <Link to={paths.welcome} aria-label="Riverbound home">
          <Emblem size={64} />
        </Link>
        <button type="button" className="btn btn-chip" onClick={() => void signOut().then(() => navigate(paths.welcome))}>
          Sign out
        </button>
      </header>

      <main className="journal__main">
        <h1 className="journal__title">Your expedition journal</h1>
        <p className="journal__subtitle">Choose where your story continues.</p>

        {load.status === 'loading' && (
          <div className="journal__cards" role="status" aria-label="Loading your journal">
            <div className="skeleton journal__skeleton" />
            <div className="skeleton journal__skeleton journal__skeleton--narrow" />
          </div>
        )}

        {load.status === 'error' && (
          <div className="journal__error" role="alert">
            <p>{load.message}</p>
            <button type="button" className="btn btn-primary" onClick={() => void fetchCampaigns()}>
              Try again
            </button>
          </div>
        )}

        {load.status === 'ready' && (
          <>
            <div className="journal__cards">
              {current ? (
                <SavedJourneyCard campaign={current} onContinue={() => navigate(resumePath(current))} />
              ) : (
                <section className="journey-card journey-card--empty" aria-labelledby="empty-title">
                  <h2 id="empty-title" className="journey-card__title">
                    {earlier.length ? 'No journey in progress' : 'Your journal is empty'}
                  </h2>
                  <p className="journey-card__details">
                    {earlier.length
                      ? 'Your earlier journeys are kept below. Start a new one when you are ready.'
                      : 'Your saved journey will appear here, so you can continue from any device.'}
                  </p>
                </section>
              )}

              <section className="new-card" aria-labelledby="new-title">
                <h2 id="new-title" className="new-card__title">
                  A new beginning
                </h2>
                {current ? (
                  <p className="new-card__text">
                    You can keep one journey at a time. Starting again archives your current journey. It stays in your
                    journal, but cannot be continued.
                  </p>
                ) : (
                  <p className="new-card__text">
                    {earlier.length ? 'Ready for another river?' : 'First visit? Your journal is empty.'} Begin with 0 coins,
                    0 fish, 3 hearts, and no purchased equipment.
                  </p>
                )}
                <div className="new-card__actions">
                  {current ? (
                    <button
                      type="button"
                      className="btn btn-primary new-card__button"
                      onClick={() => {
                        setAbandonError(null);
                        setConfirmOpen(true);
                      }}
                    >
                      Abandon and start new
                    </button>
                  ) : (
                    <Link to={paths.newCampaign} className="btn btn-primary new-card__button">
                      New Campaign
                    </Link>
                  )}
                </div>
              </section>
            </div>

            {earlier.length > 0 && (
              <section className="journal__earlier" aria-labelledby="earlier-title">
                <h2 id="earlier-title" className="journal__earlier-title">
                  Earlier journeys
                </h2>
                <ul className="earlier-list">
                  {earlier.map((c) => (
                    <li key={c.id} className="earlier-list__item">
                      <Portrait who={c.character} decorative className="earlier-list__portrait" />
                      <span className="earlier-list__name">{c.characterName}</span>
                      <span className="earlier-list__meta">
                        {statusBadge(c)} · Crew {c.companions.length} / 3 · Score {c.score}
                      </span>
                      {c.state === 'completed' && (
                        <Link to={paths.complete(c.id)} className="btn btn-link">
                          View journey
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>

      <footer className="journal__note">
        Saved adventures are single-player journals. Starting again always asks first, and nothing is deleted.
      </footer>

      {current && (
        <ConfirmDialog
          open={confirmOpen}
          title="Abandon this journey?"
          confirmLabel="Abandon and start new"
          danger
          pending={abandoning}
          error={abandonError}
          onConfirm={() => void confirmAbandon()}
          onCancel={() => setConfirmOpen(false)}
        >
          <p>
            {current.characterName}&rsquo;s journey will be archived. You will keep it in your journal, but you cannot continue it.
          </p>
          <p>
            Its coins ({current.coins}), fish and equipment stay with that journey and do not carry over.
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}

function SavedJourneyCard({ campaign: c, onContinue }: { campaign: CampaignDTO; onContinue: () => void }) {
  const badge = statusBadge(c);
  const defaultName = CHARACTERS[c.character].defaultName;
  return (
    <section className="journey-card" aria-labelledby="journey-title">
      <Portrait who={c.character} className="journey-card__portrait" decorative />
      <div className="journey-card__body">
        <h2 id="journey-title" className="journey-card__title">
          {c.characterName}&rsquo;s journey
        </h2>
        {badge && <p className="journey-card__badge">{badge}</p>}
        <p className="journey-card__details">
          {c.characterName === defaultName ? defaultName : `${c.characterName} (${defaultName})`} · {GENDER_LABEL[c.character]}
          <br />
          {campNameFor(c.regionsCleared.length)} · Crew rescued {c.companions.length} / 3
          <br />
          {regionsText(c.regionsCleared.length)} · {c.coins} coins · Hearts {c.hearts} / {MAX_HEARTS}
        </p>
        <button type="button" className="btn btn-primary journey-card__button" onClick={onContinue}>
          Continue Adventure
        </button>
      </div>
    </section>
  );
}

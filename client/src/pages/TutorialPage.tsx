// Page 08: Tutorial — "Learn the river's rhythm" (Figma node 18:526).
// Six guide cards explain the game loop. "Next step" highlights them one by one.
// The tutorial only explains: the real catching, feeding and buying happen in the game itself,
// so the player can skip it and still do everything. Start Playing / Skip save tutorialDone.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FEED_BONUS_COINS, FEED_MIN_UNFED, FISH_SALE_PRICE } from '@riverbound/shared';
import { PageStatus } from '../components/PageStatus.tsx';
import { SceneBackground } from '../components/SceneBackground.tsx';
import { SpriteIcon, type IconName } from '../components/SpriteIcon.tsx';
import { useCampaign } from '../hooks/useCampaign.ts';
import { campaignApi } from '../services/gameApi.ts';
import { paths } from '../routes/paths.ts';
import '../styles/pages/tutorial.css';

// Text uses the shared rule numbers, so the tutorial can never disagree with the real game.

const STEPS: Array<{ icon: IconName; title: string; text: string }> = [
  { icon: 'fish', title: 'Catch fish', text: 'One direct action. Fish are recorded for you.' },
  { icon: 'food_crate', title: 'Prepare a batch', text: `With ${FEED_MIN_UNFED} unfed fish, a river picture picks how many you feed. Food is free.` },
  { icon: 'food_crate', title: 'Solve feeding maths', text: `Correct maths feeds the batch and earns +${FEED_BONUS_COINS} once.` },
  { icon: 'coin', title: 'Sell fed fish', text: `Only fed fish sell, at ${FISH_SALE_PRICE} coins each.` },
  { icon: 'river_map', title: 'Map, then compass', text: 'Your first tools unlock the river journey.' },
  { icon: 'compass', title: 'Find your crew', text: 'Equip tools, cross safely, rescue your teammates.' },
];

export function TutorialPage() {
  const navigate = useNavigate();
  const { campaignId, load, reload } = useCampaign();
  const [active, setActive] = useState(0);
  const [read, setRead] = useState(1); // how many steps the player has looked at
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (load.status !== 'ready') return <PageStatus load={load} onRetry={() => void reload()} />;

  const allRead = read >= STEPS.length;

  const nextStep = () => {
    const next = Math.min(active + 1, STEPS.length - 1);
    setActive(next);
    setRead((r) => Math.max(r, next + 1));
  };

  const finish = async () => {
    setSaving(true);
    setError(null);
    try {
      await campaignApi.storyStep(campaignId, 'tutorial');
      navigate(paths.camp(campaignId), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your progress.');
      setSaving(false);
    }
  };

  return (
    <div className="scene tutorial">
      <SceneBackground scene="campHub" />
      <div className="tutorial__scrim" aria-hidden="true" />

      <main className="tutorial__main">
        <h1 className="tutorial__title">Learn the river&rsquo;s rhythm</h1>
        <p className="tutorial__subtitle">Six simple steps. A whole adventure ahead.</p>

        <ol className="tutorial__steps">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className={`step-card${i === active ? ' step-card--active' : ''}`}
              aria-current={i === active ? 'step' : undefined}
            >
              <button type="button" className="step-card__hit" onClick={() => {
                setActive(i);
                setRead((r) => Math.max(r, i + 1));
              }}>
                <span className="step-card__icon">
                  <SpriteIcon name={step.icon} size={80} />
                </span>
                <span className="step-card__title">
                  <span className="step-card__number">{String(i + 1).padStart(2, '0')}</span> {step.title}
                </span>
                <span className="step-card__text">{step.text}</span>
              </button>
            </li>
          ))}
        </ol>

        {error && (
          <p className="form-alert tutorial__error" role="alert">
            {error}
          </p>
        )}
      </main>

      <nav className="tutorial__controls" aria-label="Tutorial">
        <button type="button" className="btn btn-chip tutorial__back" onClick={() => navigate(paths.intro(campaignId))} disabled={saving}>
          Back
        </button>
        <button type="button" className="btn btn-chip tutorial__skip" onClick={() => void finish()} disabled={saving}>
          Skip tutorial
        </button>
        <button
          type="button"
          className="btn btn-chip tutorial__progress"
          onClick={nextStep}
          disabled={saving || allRead}
          aria-live="polite"
        >
          {allRead ? `All ${STEPS.length} steps read ✓` : `Next step · ${read} / ${STEPS.length} read`}
        </button>
        <button type="button" className="btn btn-primary tutorial__start" onClick={() => void finish()} disabled={saving} aria-busy={saving}>
          {saving ? 'Saving…' : 'Start Playing'}
        </button>
      </nav>
    </div>
  );
}

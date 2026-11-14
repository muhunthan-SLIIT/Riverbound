// Page 07: Story Introduction (Figma node 18:524 = panel 1).
// Three panels: the raft accident, the scattered crew, the riverbank trader.
// "Skip introduction" and the last "Continue" save introDone on the server
// (POST /api/campaigns/:id/story) and open the tutorial. Skipping never grants anything.
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageStatus } from '../components/PageStatus.tsx';
import { SceneBackground } from '../components/SceneBackground.tsx';
import { useCampaign } from '../hooks/useCampaign.ts';
import { campaignApi } from '../services/gameApi.ts';
import { paths } from '../routes/paths.ts';
import type { scenes } from '../assets/art.ts';
import '../styles/pages/story.css';

type Panel = { label: string; scene: keyof typeof scenes; title: string; lines: [string, string] };

const PANELS: Panel[] = [
  {
    label: 'THE CURRENT',
    scene: 'riverAccident',
    title: 'One moment changes everything.',
    lines: ['The raft tips. The river pulls your crew apart.', 'You reach the bank, but the others are gone.'],
  },
  {
    label: 'THE CREW',
    scene: 'reedMarsh',
    title: 'Somewhere upriver, they wait.',
    lines: ['Mira, Jonah and Tess were swept in different directions.', 'A lantern still glows on the marsh path. They survived.'],
  },
  {
    label: 'THE TRADER',
    scene: 'mapHandover',
    title: 'A friendly face at the riverbank.',
    lines: ['A trader buys fed fish and sells supplies.', 'Earn your first map, then go and find your crew.'],
  },
];

export function StoryIntroPage() {
  const navigate = useNavigate();
  const { campaignId, load, reload } = useCampaign();
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const panel = PANELS[index] ?? PANELS[0]!;
  const isLast = index === PANELS.length - 1;

  const finish = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      await campaignApi.storyStep(campaignId, 'intro');
      navigate(paths.tutorial(campaignId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your progress.');
      setSaving(false);
    }
  }, [campaignId, navigate]);

  const next = useCallback(() => (isLast ? void finish() : setIndex((i) => i + 1)), [isLast, finish]);
  const back = useCallback(() => (index === 0 ? navigate(paths.campaigns) : setIndex((i) => i - 1)), [index, navigate]);

  // Keyboard: right arrow = next, left arrow = back (only when not typing in a field).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (saving || (event.target as HTMLElement).closest('input, textarea')) return;
      if (event.key === 'ArrowRight') next();
      if (event.key === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, back, saving]);

  if (load.status !== 'ready') return <PageStatus load={load} onRetry={() => void reload()} />;

  return (
    <div className="scene story">
      {/* key: restart the fade each time the panel changes */}
      <div key={panel.scene} className="story__art">
        <SceneBackground scene={panel.scene} />
      </div>

      <main className="story__narration" aria-live="polite">
        <p className="story__step">
          {String(index + 1).padStart(2, '0')} / {String(PANELS.length).padStart(2, '0')}
          <span className="story__step-label">{panel.label}</span>
        </p>
        <h1 className="story__title">{panel.title}</h1>
        <p className="story__text">
          {panel.lines[0]}
          <br />
          {panel.lines[1]}
        </p>
        {error && (
          <p className="form-alert" role="alert">
            {error}
          </p>
        )}
      </main>

      <nav className="story__controls" aria-label="Story">
        <button type="button" className="btn btn-chip story__back" onClick={back} disabled={saving}>
          Back
        </button>
        <div className="story__forward">
          <button type="button" className="btn btn-primary story__next" onClick={next} disabled={saving} aria-busy={saving}>
            {saving ? 'Saving…' : isLast ? 'Continue' : 'Next'} {!saving && <span aria-hidden="true">→</span>}
          </button>
          <button type="button" className="btn btn-chip story__skip" onClick={() => void finish()} disabled={saving}>
            Skip introduction
          </button>
        </div>
        <ol className="story__dots" aria-label={`Panel ${index + 1} of ${PANELS.length}`}>
          {PANELS.map((p, i) => (
            <li key={p.label} className={i === index ? 'is-active' : undefined} />
          ))}
        </ol>
      </nav>

      <Link to={paths.help} className="visually-hidden">
        Help and rules
      </Link>
    </div>
  );
}

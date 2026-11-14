// Page 23: Final Escape (Figma node 18:556). Full painting, no HUD or navigation.
// Shown only when the server has marked the campaign "completed" (all regions cleared, boat owned,
// crew complete). Every number comes from the saved campaign; nothing is granted here.
import { Link } from 'react-router-dom';
import { REGIONS, type CompanionId } from '@riverbound/shared';
import { portraits } from '../assets/art.ts';
import { PageStatus } from '../components/PageStatus.tsx';
import { SceneBackground } from '../components/SceneBackground.tsx';
import { useCampaign } from '../hooks/useCampaign.ts';
import { paths } from '../routes/paths.ts';
import { resumePath } from '../routes/resume.ts';
import '../styles/pages/escape.css';

const CREW: { id: CompanionId; name: string }[] = [
  { id: 'mira', name: 'Mira' },
  { id: 'jonah', name: 'Jonah' },
  { id: 'tess', name: 'Tess' },
];

const number = (n: number) => n.toLocaleString('en-GB');

export function EscapeSummaryPage() {
  const { load, reload } = useCampaign();
  if (load.status !== 'ready') return <PageStatus load={load} onRetry={() => void reload()} />;
  const c = load.campaign;

  if (c.state !== 'completed') {
    return (
      <div className="scene escape">
        <SceneBackground scene="finalEscape" scrim />
        <main className="escape__card escape__card--notice" role="status">
          <h1 className="escape__title escape__title--small">The rescue dock is still ahead.</h1>
          <p className="escape__text">Rescue your whole crew and clear the final crossing to make it home.</p>
          <Link to={resumePath(c)} className="btn btn-primary escape__primary">
            Continue your journey
          </Link>
        </main>
      </div>
    );
  }

  const regionPoints = c.regionResults.reduce((sum, r) => sum + r.bonusPoints, 0);
  const encounterPoints = c.score - regionPoints;
  const crossings = REGIONS.reduce((sum, r) => sum + r.encounters, 0);

  return (
    <div className="scene escape">
      <SceneBackground scene="finalEscape" />
      <main className="escape__main">
        <section className="escape__card" aria-labelledby="escape-title">
          <p className="eyebrow escape__eyebrow">Together, at last</p>
          <h1 id="escape-title" className="escape__title">
            You made
            <br />
            it home.
          </h1>
          <p className="escape__text">
            Four explorers.
            <br />
            One extraordinary journey.
          </p>
          <p className="escape__score">{number(c.score)}</p>
          <p className="escape__breakdown">
            <span className="escape__label">Total score</span> · {crossings} crossings · {REGIONS.length} regions
            <br />
            {number(encounterPoints)} encounter + {number(regionPoints)} region points
          </p>
          <ul className="escape__crew" aria-label="Your crew">
            <li>
              <img src={portraits[c.character]} alt={c.characterName} width={72} height={72} />
            </li>
            {CREW.map((m) => (
              <li key={m.id}>
                <img src={portraits[m.id]} alt={m.name} width={72} height={72} />
              </li>
            ))}
          </ul>
          <Link to={paths.campaigns} className="btn btn-primary escape__primary">
            Campaign Selection
          </Link>
        </section>
        <Link to={paths.newCampaign} className="btn btn-chip escape__new">
          Start New Campaign
        </Link>
      </main>
    </div>
  );
}

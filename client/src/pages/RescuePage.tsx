// Page 19: Teammate Rescue (Figma node 18:548 shows Mira; Jonah and Tess use the same layout).
// The teammate was already recruited by the server when the region was cleared (in the same
// transaction as the last crossing), so this page only celebrates and explains the new ability.
// "Join Team" changes nothing on the server; it returns to camp. Reloading the page is safe.
import { Link, useNavigate, useParams } from 'react-router-dom';
import { COMPANIONS, type CompanionId } from '@riverbound/shared';
import { portraits, type scenes } from '../assets/art.ts';
import { PageStatus } from '../components/PageStatus.tsx';
import { SceneBackground } from '../components/SceneBackground.tsx';
import { useCampaign } from '../hooks/useCampaign.ts';
import { useSound } from '../hooks/SoundContext.tsx';
import { paths } from '../routes/paths.ts';
import '../styles/pages/rescue.css';

type Rescue = {
  found: string;
  scene: keyof typeof scenes;
  quote: string;
  story: [string, string];
  abilityLabel: string;
  ability: [string, string];
};

const RESCUES: Record<CompanionId, Rescue> = {
  mira: {
    found: 'First crew member found',
    scene: 'scoutRescue',
    quote: '“I knew you’d find me.”',
    story: ['A familiar voice cuts through the river’s roar.', 'Mira is safe. Your crew is coming back together.'],
    abilityLabel: 'Scout ability',
    ability: ['Reveal the fish count once per region.', 'Treasure chests remain yours to count.'],
  },
  jonah: {
    found: 'Second crew member found',
    scene: 'reedMarsh',
    quote: '“You followed the smoke. Good.”',
    story: ['A small signal fire flickers through the fog.', 'Jonah is safe. Two of your crew are back.'],
    abilityLabel: 'Medic ability',
    ability: ['Restore one heart once per expedition.', 'He cannot heal above three hearts.'],
  },
  tess: {
    found: 'Third crew member found',
    scene: 'crossingGorge',
    quote: '“The way home is downriver.”',
    story: ['Tess waves from the broken crossing.', 'The whole crew is together. Only the escape remains.'],
    abilityLabel: 'Navigator ability',
    ability: ['Shows how many crossings are left on a route.', 'She never gives you the answers.'],
  },
};

const isCompanionId = (v: unknown): v is CompanionId => v === 'mira' || v === 'jonah' || v === 'tess';

export function RescuePage() {
  const navigate = useNavigate();
  const { play } = useSound();
  const { companionId } = useParams();
  const { campaignId, load, reload } = useCampaign();
  if (load.status !== 'ready') return <PageStatus load={load} onRetry={() => void reload()} />;
  const c = load.campaign;

  // Only show a rescue the server has really recorded.
  if (!isCompanionId(companionId) || !c.companions.includes(companionId)) {
    return (
      <div className="scene rescue">
        <SceneBackground scene="expeditionMap" scrim />
        <main className="rescue__card rescue__card--notice" role="alert">
          <h1 className="rescue__quote">{isCompanionId(companionId) ? `${COMPANIONS[companionId].name} has not been found yet.` : 'This teammate does not exist.'}</h1>
          <p className="rescue__story">Clear their region on the river map to bring them home.</p>
          <Link to={paths.map(campaignId)} className="btn btn-primary rescue__join">
            Open River Map
          </Link>
        </main>
      </div>
    );
  }

  const mate = COMPANIONS[companionId];
  const r = RESCUES[companionId];

  return (
    <div className="scene rescue">
      <SceneBackground scene={r.scene} />
      <main className="rescue__main">
        <p className="rescue__found">{r.found}</p>
        <section className="rescue__card" aria-labelledby="rescue-quote">
          <div className="rescue__who">
            <img className="rescue__portrait" src={portraits[companionId]} alt={`${mate.name}, the ${mate.role}`} width={88} height={88} />
            <div>
              <p className="eyebrow rescue__name">
                {mate.name} · {mate.role}
              </p>
              <h1 id="rescue-quote" className="rescue__quote">
                {r.quote}
              </h1>
            </div>
          </div>
          <p className="rescue__story">
            {r.story[0]}
            <br />
            {r.story[1]}
          </p>
          <h2 className="eyebrow rescue__ability-label">{r.abilityLabel}</h2>
          <p className="rescue__ability">
            {r.ability[0]}
            <br />
            {r.ability[1]}
          </p>
          <button
            type="button"
            className="btn btn-primary rescue__join"
            onClick={() => {
              play('button');
              navigate(paths.camp(campaignId));
            }}
            autoFocus
          >
            Join Team
          </button>
        </section>
      </main>
    </div>
  );
}

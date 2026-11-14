// Page 17: Route Details & Preparation (Figma node 18:544).
// Shows the route's story, the gear checklist, hearts, companion abilities and the expedition mode.
// "Start Expedition" asks the server to start (POST /api/campaigns/:id/route/start). The server checks
// the route order and the gear again, starts the player fully rested, and returns the first picture.
// Timed or untimed is chosen here, before leaving; it cannot be changed mid-trip.
import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  COMPANIONS,
  MAX_HEARTS,
  getRegion,
  getShopItem,
  isRegionId,
  missingGear,
  routeStatus,
  type CampaignDTO,
  type RegionId,
} from '@riverbound/shared';
import { scenes } from '../assets/art.ts';
import { GameLayout } from '../components/game/GameLayout.tsx';
import { useSound } from '../hooks/SoundContext.tsx';
import { ApiError, newActionKey } from '../services/apiClient.ts';
import { crossingApi } from '../services/gameApi.ts';
import { paths } from '../routes/paths.ts';
import '../styles/pages/route.css';

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'];

/** Story text for each route (Figma shows Shallow Bend; the others follow the same pattern). */
const STORY: Record<RegionId, { title: string; art: keyof typeof scenes; artAlt: string; goal: string; text: (n: string) => string }> = {
  shallow_bend: {
    title: 'The sandbank beyond the current.',
    art: 'fishingRiverbank',
    artAlt: 'An explorer kneels at a wooden jetty on a calm jungle river.',
    goal: 'Find Mira, your Scout',
    text: (n) => `Reach the far bank through ${n} encounters. Her trail ends at the sunlit sandbank.`,
  },
  reed_marsh: {
    title: 'Fog lies low over the reeds.',
    art: 'reedMarsh',
    artAlt: 'Tall reeds and mist over a slow green marsh.',
    goal: 'Find Jonah, your Medic',
    text: (n) => `Cross the marsh through ${n} encounters. His signal fire is somewhere in the fog.`,
  },
  rapid_gorge: {
    title: 'The gorge roars ahead.',
    art: 'crossingGorge',
    artAlt: 'White water rushing between steep rock walls.',
    goal: 'Find Tess, your Navigator',
    text: (n) => `Survive ${n} encounters among the rapids. She is waiting at the broken crossing.`,
  },
  final_crossing: {
    title: 'One last stretch to the rescue dock.',
    art: 'finalEscape',
    artAlt: 'A boat heading towards a dock at the river mouth.',
    goal: 'Bring your crew home',
    text: (n) => `${n.charAt(0).toUpperCase() + n.slice(1)} hard encounters stand between your crew and the rescue dock.`,
  },
};

export function RouteDetailsPage() {
  return (
    <GameLayout scene="crossingGorge" className="route">
      {(c, setCampaign) => <RouteContent campaign={c} setCampaign={setCampaign} />}
    </GameLayout>
  );
}

function RouteContent({ campaign: c, setCampaign }: { campaign: CampaignDTO; setCampaign: (c: CampaignDTO) => void }) {
  const { routeId } = useParams();
  if (!isRegionId(routeId)) {
    return (
      <main className="route__notice panel" role="alert">
        <h1 className="route__panel-title">This route does not exist.</h1>
        <Link to={paths.map(c.id)} className="btn btn-primary">
          Open River Map
        </Link>
      </main>
    );
  }
  return <RouteDetails campaign={c} setCampaign={setCampaign} regionId={routeId} />;
}

function RouteDetails({ campaign: c, setCampaign, regionId }: { campaign: CampaignDTO; setCampaign: (c: CampaignDTO) => void; regionId: RegionId }) {
  const navigate = useNavigate();
  const { play } = useSound();
  const region = getRegion(regionId);
  const story = STORY[regionId];
  const owned = c.inventory.ownedItems;
  const status = routeStatus(regionId, c.regionsCleared);
  const missing = missingGear(regionId, owned);
  const [timed, setTimed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const actionKey = useRef(newActionKey());

  const onThisTrip = c.state === 'crossing' && c.expedition?.regionId === regionId;
  const encounterWord = NUMBER_WORDS[region.encounters] ?? String(region.encounters);

  /** Why the Start button is disabled (null = ready to go). */
  let blocker: string | null = null;
  if (status === 'cleared') blocker = 'You have already cleared this route.';
  else if (status === 'locked') blocker = 'Clear the earlier routes first.';
  else if (c.state === 'failed') blocker = 'Your last expedition ended. Return to camp first.';
  else if (c.state === 'feeding') blocker = 'Finish or cancel your feeding batch first.';
  else if (c.state === 'crossing' && !onThisTrip) blocker = 'You are already on another route.';
  else if (missing.length > 0) blocker = `Still needed: ${missing.map((m) => getShopItem(m).name.toLowerCase()).join(', ')}.`;

  const go = async (action: 'start' | 'continue') => {
    setPending(true);
    setError(null);
    try {
      const res = action === 'start' ? await crossingApi.start(c.id, regionId, timed, actionKey.current) : await crossingApi.next(c.id, actionKey.current);
      actionKey.current = newActionKey();
      setCampaign(res.campaign);
      play('button');
      navigate(paths.crossing(c.id, res.challenge.id));
    } catch (err) {
      // After a lost connection keep the same key, so pressing again can never start two trips.
      const uncertain = err instanceof ApiError && (err.code === 'NETWORK' || err.status >= 500);
      if (!uncertain) actionKey.current = newActionKey();
      setError(err instanceof Error ? err.message : 'Could not start the expedition.');
      setPending(false);
    }
  };

  const rescued = c.companions.map((id) => `${COMPANIONS[id].name}, ${COMPANIONS[id].role}: ${COMPANIONS[id].ability}`);

  return (
    <main className="route__main">
      <header className="route__head">
        <p className="eyebrow route__eyebrow">
          {region.name} · {region.difficulty}
        </p>
        <h1 className="route__title">{story.title}</h1>
      </header>

      <div className="route__story">
        <img className="route__art" src={scenes[story.art]} alt={story.artAlt} width={624} height={336} />
        <section className="panel route__goal" aria-labelledby="route-goal">
          <h2 id="route-goal" className="route__panel-title">
            {story.goal}
          </h2>
          <p className="route__text">{story.text(encounterWord)}</p>
        </section>
      </div>

      <section className="panel route__ready" aria-labelledby="route-ready">
        <h2 id="route-ready" className="route__panel-title">
          {onThisTrip ? 'Your expedition is under way.' : 'Ready for the river?'}
        </h2>

        <ul className="route__gear" aria-label="Required gear">
          {region.requiredItems.map((item) => {
            const has = owned.includes(item);
            return (
              <li key={item} className={has ? 'route__gear-item' : 'route__gear-item route__gear-item--missing'}>
                <span className="route__check" aria-hidden="true">
                  {has ? '✓' : '✕'}
                </span>
                {getShopItem(item).name}
                <span className="visually-hidden">{has ? ': owned' : ': missing'}</span>
              </li>
            );
          })}
        </ul>

        <p className="route__text route__facts">
          {onThisTrip && c.expedition
            ? `Crossing ${c.expedition.encounterIndex + 1} of ${region.encounters} · Hearts ${c.hearts} / ${MAX_HEARTS}`
            : `${region.encounters} encounters · Hearts ${MAX_HEARTS} / ${MAX_HEARTS}${c.hearts < MAX_HEARTS ? ' (you set off fully rested)' : ''}`}
          <br />
          {rescued.length === 0 ? 'Companion abilities: none rescued yet.' : 'Companion abilities:'}
        </p>
        {rescued.length > 0 && (
          <ul className="route__abilities">
            {rescued.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}

        {!onThisTrip && (
          <fieldset className="route__mode" disabled={pending || blocker !== null}>
            <legend className="eyebrow route__mode-label">Expedition mode</legend>
            <div className="route__mode-options">
            <label className={`route__mode-option${!timed ? ' route__mode-option--on' : ''}`}>
              <input type="radio" name="mode" checked={!timed} onChange={() => setTimed(false)} />
              Untimed
            </label>
            <label className={`route__mode-option${timed ? ' route__mode-option--on' : ''}`}>
              <input type="radio" name="mode" checked={timed} onChange={() => setTimed(true)} />
              Timed · {region.timerSeconds}s each
            </label>
            </div>
          </fieldset>
        )}

        <div className="route__actions">
          {onThisTrip ? (
            <button type="button" className="btn btn-primary route__start" onClick={() => void go('continue')} disabled={pending} aria-busy={pending}>
              {pending ? 'Please wait…' : 'Continue Expedition'}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary route__start"
              onClick={() => void go('start')}
              disabled={pending || blocker !== null}
              aria-busy={pending}
              aria-describedby="route-note"
            >
              {pending ? 'Setting off…' : 'Start Expedition'}
            </button>
          )}
          <Link to={onThisTrip ? paths.map(c.id) : paths.camp(c.id)} className="btn btn-chip route__back">
            {onThisTrip ? 'River Map' : 'Return to Camp'}
          </Link>
        </div>

        {error ? (
          <p className="form-alert route__note" role="alert">
            {error}
          </p>
        ) : (
          <p id="route-note" className="route__note" aria-live="polite">
            {onThisTrip ? (
              'Your progress is saved. Continue to the next crossing.'
            ) : blocker ? (
              <>
                {blocker}{' '}
                {status === 'available' && missing.length > 0 && c.state === 'at_camp' && <Link to={paths.shop(c.id)}>Open the shop</Link>}
                {status !== 'available' && <Link to={paths.map(c.id)}>Open the river map</Link>}
                {c.state === 'failed' && <Link to={paths.failed(c.id)}>Go back to camp</Link>}
              </>
            ) : (
              'Choose before leaving; settings do not pause a timer.'
            )}
          </p>
        )}
      </section>
    </main>
  );
}

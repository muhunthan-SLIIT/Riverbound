// Page 16: River Map (Figma node 18:542).
// Before the map is bought: a locked explanation with a Shop link.
// After: four route markers on the painted map (cleared / available / locked) and a details panel.
// Without a compass the map is readable, but travel is blocked ("Buy a compass to follow the route").
// Selecting a marker only shows information. It never starts a crossing or spends anything.
// "Accessible route list" shows the same routes as plain text (spec: text equivalent for the map).
// Each route also shows its river weather (Open-Meteo live weather from a real river place, or a labelled backup).
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  COMPANIONS,
  REGIONS,
  getShopItem,
  missingGear,
  routeStatus,
  type CampaignDTO,
  type Region,
  type RegionId,
  type RegionWeather,
  type RouteStatus,
} from '@riverbound/shared';
import { GameLayout } from '../components/game/GameLayout.tsx';
import { WeatherLine, WeatherSummary } from '../components/game/RiverWeather.tsx';
import { useRegionWeather } from '../hooks/useRegionWeather.ts';
import { SpriteIcon } from '../components/SpriteIcon.tsx';
import { paths } from '../routes/paths.ts';
import '../styles/pages/map.css';

// Marker positions from the Figma frame (1440 x 900), turned into percentages.
const MARKERS: Record<RegionId, { x: number; y: number }> = {
  shallow_bend: { x: 192, y: 616 },
  reed_marsh: { x: 424, y: 424 },
  rapid_gorge: { x: 720, y: 248 },
  final_crossing: { x: 1032, y: 144 },
};

const STATUS_LABEL: Record<RouteStatus, string> = { cleared: 'Cleared', available: 'Available', locked: 'Locked' };
const COUNT_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function markerSubtitle(region: Region, status: RouteStatus): string {
  if (region.id === 'final_crossing') return `${cap(region.difficulty)} · ${status === 'locked' ? 'Full crew + boat' : STATUS_LABEL[status]}`;
  const mate = region.rescues ? COMPANIONS[region.rescues].role : '';
  return `${cap(region.difficulty)} · ${STATUS_LABEL[status]} · ${mate}`;
}

export function RiverMapPage() {
  return <GameLayout scene="expeditionMap" className="rivermap">{(c) => <MapContent campaign={c} />}</GameLayout>;
}

function MapContent({ campaign: c }: { campaign: CampaignDTO }) {
  const owned = c.inventory.ownedItems;
  const firstOpen = REGIONS.find((r) => routeStatus(r.id, c.regionsCleared) === 'available') ?? REGIONS[REGIONS.length - 1]!;
  const [selected, setSelected] = useState<RegionId>(firstOpen.id);
  const [listView, setListView] = useState(false);
  const weather = useRegionWeather();

  if (!owned.includes('river_map')) {
    return (
      <main className="rivermap__locked">
        <section className="panel rivermap__locked-card" aria-labelledby="map-locked-title">
          <SpriteIcon name="river_map" size={120} />
          <h1 id="map-locked-title" className="rivermap__locked-title">
            The river is still a mystery.
          </h1>
          <p>Buy the river map from the merchant to see the regions, camps and routes.</p>
          <p className="rivermap__locked-price">River map · {getShopItem('river_map').price} coins</p>
          <Link to={paths.shop(c.id)} className="btn btn-primary">
            Go to the shop
          </Link>
        </section>
      </main>
    );
  }

  const region = REGIONS.find((r) => r.id === selected) ?? firstOpen;

  return (
    <main className="rivermap__main">
      <div className="rivermap__title-card">
        <h1 className="rivermap__title">The river remembers</h1>
      </div>

      {listView ? (
        <RouteList campaign={c} onClose={() => setListView(false)} weather={weather} />
      ) : (
        <nav className="rivermap__markers" aria-label="River routes">
          {REGIONS.map((r) => {
            const status = routeStatus(r.id, c.regionsCleared);
            const pos = MARKERS[r.id];
            return (
              <button
                key={r.id}
                type="button"
                className={`marker marker--${status}${r.id === selected ? ' marker--selected' : ''}`}
                style={{ left: `${(pos.x / 1440) * 100}%`, top: `${(pos.y / 900) * 100}%` }}
                aria-pressed={r.id === selected}
                onClick={() => setSelected(r.id)}
              >
                <span className="marker__name">
                  {status === 'cleared' && <span aria-hidden="true">✓ </span>}
                  {r.name}
                </span>
                <span className="marker__sub">{markerSubtitle(r, status)}</span>
                {status !== 'cleared' && <WeatherLine weather={weather?.[r.id]} />}
              </button>
            );
          })}
        </nav>
      )}

      <RouteDetails campaign={c} region={region} onShowList={() => setListView(true)} listView={listView} weather={weather?.[region.id]} />
    </main>
  );
}

function RouteDetails({
  campaign: c,
  region,
  onShowList,
  listView,
  weather,
}: {
  campaign: CampaignDTO;
  region: Region;
  onShowList: () => void;
  listView: boolean;
  weather: RegionWeather | undefined;
}) {
  const owned = c.inventory.ownedItems;
  const status = routeStatus(region.id, c.regionsCleared);
  const missing = missingGear(region.id, owned);
  const hasCompass = owned.includes('compass');
  const previous = REGIONS[REGIONS.findIndex((r) => r.id === region.id) - 1];

  const lines: string[] = [`${COUNT_WORDS[region.encounters] ?? region.encounters} crossings · ${cap(region.difficulty)}`];
  if (status === 'cleared') lines.push('Cleared. Rewards already claimed.');
  else if (status === 'locked') lines.push(`Clear ${previous?.name ?? 'the previous region'} first.`);
  else if (!hasCompass) lines.push('Buy a compass to follow the route.');
  else if (missing.length) lines.push(`Need ${missing.map((m) => getShopItem(m).name.toLowerCase()).join(' and ')}.`);
  else lines.push('All required gear owned.');
  if (region.rescues) lines.push(`Rescue ${COMPANIONS[region.rescues].name}, the ${COMPANIONS[region.rescues].role}.`);

  return (
    <section className="panel route-panel" aria-labelledby="route-title" aria-live="polite">
      <h2 id="route-title" className="route-panel__title">
        {region.name}
      </h2>
      <p className="route-panel__text">
        {lines.map((line, i) => (
          <span key={line}>
            {i > 0 && <br />}
            {line}
          </span>
        ))}
      </p>
      {status !== 'cleared' && <WeatherSummary weather={weather} />}
      {status === 'available' ? (
        <Link to={paths.route(c.id, region.id)} className="btn btn-primary route-panel__go">
          Prepare Route
        </Link>
      ) : (
        <button type="button" className="btn btn-primary route-panel__go" disabled>
          {status === 'cleared' ? 'Route cleared' : 'Route locked'}
        </button>
      )}
      {!listView && (
        <button type="button" className="btn btn-link route-panel__list" onClick={onShowList}>
          Accessible route list
        </button>
      )}
    </section>
  );
}

/** The same information as the map, as a plain list (keyboard and screen-reader friendly). */
function RouteList({
  campaign: c,
  onClose,
  weather,
}: {
  campaign: CampaignDTO;
  onClose: () => void;
  weather: Partial<Record<RegionId, RegionWeather>> | null;
}) {
  const owned = c.inventory.ownedItems;
  return (
    <section className="panel route-list" aria-labelledby="route-list-title">
      <h2 id="route-list-title" className="route-list__title">
        Routes in order
      </h2>
      <ol className="route-list__items">
        {REGIONS.map((r) => {
          const status = routeStatus(r.id, c.regionsCleared);
          const missing = missingGear(r.id, owned);
          return (
            <li key={r.id}>
              <strong>{r.name}</strong> — {cap(r.difficulty)}, {r.encounters} crossings, {STATUS_LABEL[status].toLowerCase()}.
              {r.rescues && ` Rescue ${COMPANIONS[r.rescues].name} (${COMPANIONS[r.rescues].role}).`}
              {status !== 'cleared' && missing.length > 0 && ` Missing: ${missing.map((m) => getShopItem(m).name.toLowerCase()).join(', ')}.`}
              {status !== 'cleared' && weather?.[r.id] && ` Weather: ${weather[r.id]?.condition}, wind ${Math.round(weather[r.id]?.windKmh ?? 0)} km/h${weather[r.id]?.source === 'backup' ? ' (backup)' : ` (live, ${weather[r.id]?.place})`}.`}{' '}
              {status === 'available' && <Link to={paths.route(c.id, r.id)}>Prepare route</Link>}
            </li>
          );
        })}
      </ol>
      <button type="button" className="btn btn-link route-list__close" onClick={onClose}>
        Back to the painted map
      </button>
    </section>
  );
}

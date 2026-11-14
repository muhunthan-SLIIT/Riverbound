// Page 15: My Equipment (Figma node 18:3868).
// Three panels: the explorer, how fishing works, and travel readiness for the next route.
// v2.3: the fishing tools (rod, reel, hook, net, trap) were removed at the author's request,
// so the Figma "One fishing method" choice is replaced by a short fishing panel. This page only reads.
import { Link } from 'react-router-dom';
import { CATCH_YIELD, REGIONS, getShopItem, missingGear, type CampaignDTO } from '@riverbound/shared';
import { GameLayout } from '../components/game/GameLayout.tsx';
import { Portrait } from '../components/Portrait.tsx';
import { SpriteIcon } from '../components/SpriteIcon.tsx';
import { paths } from '../routes/paths.ts';
import '../styles/pages/equipment.css';

export function EquipmentPage() {
  return <GameLayout scene="campHub" className="rack">{(c) => <EquipmentContent campaign={c} />}</GameLayout>;
}

function EquipmentContent({ campaign: c }: { campaign: CampaignDTO }) {
  const owned = c.inventory.ownedItems;
  const nextRegion = REGIONS[c.regionsCleared.length] ?? null;
  const missing = nextRegion ? missingGear(nextRegion.id, owned) : [];
  const required = nextRegion?.requiredItems ?? [];

  const ownedSummary =
    owned.length === 0
      ? 'No equipment purchased'
      : owned.includes('river_map') && owned.includes('compass') && owned.length === 2
        ? 'Map + Compass owned'
        : `${owned.length} item${owned.length === 1 ? '' : 's'} owned`;

  return (
    <>
      <main className="rack__main">
        <p className="eyebrow rack__eyebrow">The equipment rack</p>
        <h1 className="rack__title">Pack light. Prepare well.</h1>

        <div className="rack__grid">
          {/* ---------- Explorer ---------- */}
          <section className="panel rack__panel" aria-labelledby="loadout-title">
            <h2 id="loadout-title" className="rack__panel-title">
              {c.characterName}&rsquo;s loadout
            </h2>
            <Portrait who={c.character} className="rack__portrait" />
            <p className="rack__text">
              {ownedSummary}
              <br />
              {owned.length === 0
                ? 'Fishing: bare hands'
                : nextRegion
                  ? `${nextRegion.name} kit: ${missing.length ? 'not ready' : 'ready'}`
                  : 'All regions cleared'}
            </p>
          </section>

          {/* ---------- Fishing ---------- */}
          <section className="panel rack__panel" aria-labelledby="method-title">
            <h2 id="method-title" className="rack__panel-title">
              Fishing
            </h2>
            <p className="rack__method">
              <span>Bare hands — {CATCH_YIELD} fish per catch</span>
              <span className="rack__method-state">Always available</span>
            </p>
            <p className="rack__text">Fishing is always free. Each accepted catch adds {CATCH_YIELD} unfed fish to your stock.</p>
            <Link to={paths.fishing(c.id)} className="btn btn-link rack__link">
              Go fishing
            </Link>
          </section>

          {/* ---------- Travel readiness ---------- */}
          <section className="panel rack__panel" aria-labelledby="ready-title">
            <h2 id="ready-title" className="rack__panel-title">
              Travel readiness
            </h2>
            {nextRegion ? (
              <>
                <p className="rack__subtitle">For {nextRegion.name}</p>
                <ul className="checklist">
                  {required.map((id) => {
                    const has = owned.includes(id);
                    return (
                      <li key={id} className={has ? 'is-done' : undefined}>
                        <SpriteIcon name={id} size={36} />
                        <span>{getShopItem(id).name}</span>
                        <span className="checklist__mark">{has ? '✓ Owned' : 'Missing'}</span>
                      </li>
                    );
                  })}
                </ul>
                <p className="rack__text">
                  {!owned.includes('river_map')
                    ? 'Buy the map first, then the compass.'
                    : !owned.includes('compass')
                      ? 'Next: buy the compass.'
                      : missing.length
                        ? `Still needed: ${missing.map((m) => getShopItem(m).name.toLowerCase()).join(' and ')}.`
                        : 'You are ready to travel.'}
                </p>
              </>
            ) : (
              <p className="rack__text">Every region is cleared. Your crew is ready to go home.</p>
            )}
            <div className="rack__actions">
              {missing.length > 0 ? (
                <Link to={paths.shop(c.id)} className="btn btn-primary rack__primary">
                  Open Shop
                </Link>
              ) : (
                <Link to={paths.map(c.id)} className="btn btn-primary rack__primary">
                  Open River Map
                </Link>
              )}
              <Link to={paths.map(c.id)} className="btn btn-link rack__link">
                View River Map
              </Link>
            </div>
          </section>
        </div>
      </main>

    </>
  );
}

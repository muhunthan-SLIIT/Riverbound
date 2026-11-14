// Page 09: Camp Dashboard (Figma node 18:528).
// HUD, current objective, fish stock, seven labelled hotspots on the camp art, and the camp navigation.
// The Campfire gives a free rest (POST /api/campaigns/:id/camp/rest) that refills hearts to 3.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MAX_HEARTS, campNameFor, currentObjective, type CampaignDTO } from '@riverbound/shared';
import { GameLayout } from '../components/game/GameLayout.tsx';
import { useSound } from '../hooks/SoundContext.tsx';
import { useToast } from '../hooks/useToast.ts';
import { campApi } from '../services/gameApi.ts';
import { paths } from '../routes/paths.ts';
import '../styles/pages/camp.css';

// Positions come from the Figma frame (1440 x 900) and are turned into percentages,
// so the labels stay on the right part of the painting at other screen sizes.
const HOTSPOTS = [
  { key: 'companions', label: 'Companion Camp', x: 288, y: 384, to: paths.team },
  { key: 'rack', label: 'Equipment Rack', x: 256, y: 460, to: paths.equipment },
  { key: 'merchant', label: 'Merchant · Shop & Sell', x: 840, y: 304, to: paths.shop },
  { key: 'map', label: 'Map Table', x: 1016, y: 430, to: paths.map },
  { key: 'campfire', label: 'Campfire · Free Rest', x: 576, y: 548, to: null },
  { key: 'dock', label: 'Dock · Catch Fish', x: 202, y: 628, to: paths.fishing },
  { key: 'pen', label: 'Fish Pen · Prepare', x: 1000, y: 682, to: paths.feeding },
] as const;

function equipmentSummary(count: number): string {
  if (count === 0) return 'No equipment purchased';
  return `${count} item${count === 1 ? '' : 's'} owned`;
}

export function CampPage() {
  return <GameLayout scene="campHub" className="camp">{(campaign, setCampaign) => <CampContent campaign={campaign} setCampaign={setCampaign} />}</GameLayout>;
}

function CampContent({ campaign: c, setCampaign }: { campaign: CampaignDTO; setCampaign: (c: CampaignDTO) => void }) {
  const { toast, show } = useToast();
  const { play } = useSound();
  const [resting, setResting] = useState(false);
  const inv = c.inventory;
  const objective = currentObjective({ ...inv, coins: c.coins, regionsCleared: c.regionsCleared, hearts: c.hearts });

  const rest = async () => {
    if (c.hearts >= MAX_HEARTS) {
      show(`Fully rested. Hearts ${MAX_HEARTS} / ${MAX_HEARTS}.`);
      return;
    }
    setResting(true);
    try {
      const { campaign } = await campApi.rest(c.id);
      setCampaign(campaign);
      play('button');
      show(`You rest by the fire. Hearts restored to ${campaign.hearts} / ${MAX_HEARTS}.`);
    } catch (error) {
      show(error instanceof Error ? error.message : 'Could not rest right now.', 'error');
    } finally {
      setResting(false);
    }
  };

  return (
    <>
      <main className="camp__panels">
        <h1 className="visually-hidden">{campNameFor(c.regionsCleared.length)}</h1>
        <section className="panel camp__objective" aria-labelledby="objective-title">
          <p className="panel-eyebrow">Current objective</p>
          <h2 id="objective-title" className="camp__objective-title">
            {objective.title}
          </h2>
          <p className="camp__objective-text">
            {objective.lines[0]}
            <br />
            {objective.lines[1]}
          </p>
        </section>

        <section className="panel camp__stock" aria-labelledby="stock-title">
          <h2 id="stock-title" className="camp__stock-eyebrow">
            Your fish
          </h2>
          <p className="camp__stock-counts">
            <span>Unfed {inv.unfedAvailable}</span>
            <span>Reserved {inv.unfedReserved}</span>
            <span>Fed {inv.fedAvailable}</span>
          </p>
          <p className="camp__stock-meta">
            Crew {c.companions.length} / 3 · {equipmentSummary(inv.ownedItems.length)}
          </p>
        </section>
      </main>

      <CampBanner campaign={c} />

      <nav className="camp__hotspots" aria-label="Camp places">
        {HOTSPOTS.map((spot) => {
          const style = { left: `${(spot.x / 1440) * 100}%`, top: `${(spot.y / 900) * 100}%` };
          if (spot.to === null) {
            return (
              <button key={spot.key} type="button" className="hotspot" style={style} onClick={() => void rest()} disabled={resting}>
                {resting ? 'Resting…' : spot.label}
              </button>
            );
          }
          return (
            <Link key={spot.key} to={spot.to(c.id)} className="hotspot" style={style}>
              {spot.label}
            </Link>
          );
        })}
      </nav>

      <p className="camp__place" aria-hidden="true">
        {campNameFor(c.regionsCleared.length).toUpperCase()}
      </p>

      {toast && (
        <p className={`toast${toast.kind === 'error' ? ' toast--error' : ''}`} role="status">
          {toast.text}
        </p>
      )}
    </>
  );
}

/** A message when the save is in the middle of something (feeding batch, failed expedition, finished). */
function CampBanner({ campaign: c }: { campaign: CampaignDTO }) {
  if (c.activeFeedingBatchId) {
    return (
      <p className="camp__banner" role="status">
        A feeding batch is waiting for you.{' '}
        <Link to={paths.feedingBatch(c.id, c.activeFeedingBatchId)}>Resume feeding</Link>
      </p>
    );
  }
  if (c.state === 'failed') {
    return (
      <p className="camp__banner" role="status">
        The current pushed you back. <Link to={paths.failed(c.id)}>Return to camp</Link>
      </p>
    );
  }
  if (c.state === 'completed') {
    return (
      <p className="camp__banner" role="status">
        Your crew escaped together. <Link to={paths.complete(c.id)}>View your journey</Link>
      </p>
    );
  }
  if (c.state === 'abandoned') {
    return (
      <p className="camp__banner" role="status">
        This journey was abandoned and is read-only. <Link to={paths.campaigns}>Back to your journal</Link>
      </p>
    );
  }
  return null;
}

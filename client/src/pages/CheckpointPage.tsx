// Page 21: Region Complete / Checkpoint (Figma node 18:552).
// Shows the summary the server saved when the region was cleared (campaign.regionResults):
// each crossing's result, coins and points, the heart bonus, and the wallet change.
// Nothing is calculated or granted here; reloading the page shows the same numbers.
import { Link } from 'react-router-dom';
import { COMPANIONS, POINTS_PER_HEART_REGION_BONUS, getRegion, type CampaignDTO, type RegionId } from '@riverbound/shared';
import { GameLayout } from '../components/game/GameLayout.tsx';
import { paths } from '../routes/paths.ts';
import '../styles/pages/checkpoint.css';

const COPY: Record<RegionId, { title: string; next: string }> = {
  shallow_bend: { title: 'The far bank is yours.', next: 'Mira is waiting on the sandbank. Go bring her home.' },
  reed_marsh: { title: 'The marsh is behind you.', next: 'Jonah is waiting by his signal fire. Go bring him home.' },
  rapid_gorge: { title: 'The gorge could not stop you.', next: 'Tess is waiting at the broken crossing. Go bring her home.' },
  final_crossing: { title: 'The rescue dock is in sight.', next: 'Your whole crew is aboard. One last stretch to safety.' },
};

export function CheckpointPage() {
  return (
    <GameLayout scene="expeditionMap" className="checkpoint">
      {(c) => <Checkpoint campaign={c} />}
    </GameLayout>
  );
}

function Checkpoint({ campaign: c }: { campaign: CampaignDTO }) {
  const summary = c.regionResults.at(-1);
  if (!summary) {
    return (
      <main className="checkpoint__card checkpoint__card--empty" role="status">
        <h1 className="checkpoint__title checkpoint__title--small">No region cleared yet.</h1>
        <p className="checkpoint__text">Clear all the crossings on a route to see its results here.</p>
        <Link to={paths.map(c.id)} className="btn btn-primary checkpoint__primary">
          Open River Map
        </Link>
      </main>
    );
  }

  const region = getRegion(summary.regionId);
  const copy = COPY[summary.regionId];
  const mate = region.rescues ? COMPANIONS[region.rescues] : null;
  const walletBefore = summary.walletAfter - summary.coinsEarned;
  const hearts = summary.heartsRemaining;

  return (
    <main className="checkpoint__card" aria-labelledby="checkpoint-title">
      <p className="eyebrow checkpoint__eyebrow">{region.name} complete</p>
      <h1 id="checkpoint-title" className="checkpoint__title">
        {copy.title}
      </h1>

      <div className="checkpoint__results">
        <table className="checkpoint__table">
          <caption className="visually-hidden">Crossing results</caption>
          <thead className="visually-hidden">
            <tr>
              <th scope="col">Crossing</th>
              <th scope="col">Result</th>
              <th scope="col">Coins</th>
              <th scope="col">Points</th>
            </tr>
          </thead>
          <tbody>
            {summary.crossings.map((x) => (
              <tr key={x.index}>
                <th scope="row">Crossing {x.index + 1}</th>
                <td>{x.result === 'perfect' ? 'Perfect' : 'Partial'}</td>
                {x.alreadyRewarded ? (
                  <td colSpan={2} className="checkpoint__claimed">
                    Reward already claimed
                  </td>
                ) : (
                  <>
                    <td>+{x.coins} coins</td>
                    <td>+{x.points} points</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        <p className="checkpoint__bonus">
          {hearts} {hearts === 1 ? 'heart' : 'hearts'} remaining
          <br />
          Region bonus: {POINTS_PER_HEART_REGION_BONUS} × {hearts} = {summary.bonusPoints}
          <br />
          Total score earned: {summary.pointsEarned}
        </p>
      </div>

      <p className="checkpoint__text">
        {summary.coinsEarned} coins earned · Wallet {walletBefore} → {summary.walletAfter}
        <br />
        {copy.next}
      </p>

      <div className="checkpoint__actions">
        {mate && region.rescues ? (
          <Link to={paths.rescue(c.id, region.rescues)} className="btn btn-primary checkpoint__primary">
            Rescue {mate.name}
          </Link>
        ) : (
          <Link to={paths.complete(c.id)} className="btn btn-primary checkpoint__primary">
            Reach the Dock
          </Link>
        )}
        {c.state !== 'completed' && (
          <Link to={paths.camp(c.id)} className="btn btn-secondary checkpoint__secondary">
            Return to Camp
          </Link>
        )}
        <Link to={paths.map(c.id)} className="btn btn-link checkpoint__link">
          View River Map
        </Link>
      </div>

      <p className="checkpoint__note">Encounter rewards and the region bonus are recorded once.</p>
    </main>
  );
}

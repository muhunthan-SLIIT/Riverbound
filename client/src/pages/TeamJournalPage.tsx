// Page 20: Team Journal / Crew (Figma node 18:6361 shows all three teammates rescued).
// One card per teammate. Rescued: portrait, region, ability and whether it can be used right now
// (from the saved campaign: Mira once per region, Jonah once per expedition, Tess always).
// Not rescued yet: a dimmed card that says where to look. This page only reads; it changes nothing.
import { COMPANIONS, REGIONS, type CampaignDTO, type CompanionId, type RegionId } from '@riverbound/shared';
import { portraits } from '../assets/art.ts';
import { GameLayout } from '../components/game/GameLayout.tsx';
import '../styles/pages/team.css';

const ORDER: CompanionId[] = ['mira', 'jonah', 'tess'];

const ABILITY: Record<CompanionId, string[]> = {
  mira: ['Reveals fish count once per region.'],
  jonah: ['Restores 1 heart once per expedition.', 'Maximum health: 3 hearts.'],
  tess: ['Provides route guidance.', 'Does not reveal puzzle answers.'],
};

/** The region where each teammate is found (from the shared region rules). */
function homeRegion(id: CompanionId) {
  const region = REGIONS.find((r) => r.rescues === id);
  if (!region) throw new Error(`No region rescues ${id}`);
  return region;
}

/** "Can I use it now?" line under a rescued teammate. */
function availability(id: CompanionId, c: CampaignDTO): string {
  if (id === 'mira') {
    const current: RegionId | undefined = c.expedition?.regionId ?? REGIONS[c.regionsCleared.length]?.id;
    if (!current) return 'Every region is cleared';
    const left = c.scoutUsedRegions.includes(current) ? 0 : 1;
    return `Hint available: ${left} / 1 this region`;
  }
  if (id === 'jonah') {
    return c.expedition?.medicUsed ? 'Heal available: 0 / 1 on this expedition' : 'Heal available: 1 / 1 per expedition';
  }
  return 'Route guidance available';
}

export function TeamJournalPage() {
  return (
    <GameLayout scene="campHub" className="team">
      {(c) => (
        <main className="team__main">
          <header>
            <p className="eyebrow team__eyebrow">The crew journal</p>
            <h1 className="team__title">No one gets left behind.</h1>
            <p className="visually-hidden">
              {c.companions.length} of {ORDER.length} teammates rescued.
            </p>
          </header>
          <ul className="team__cards">
            {ORDER.map((id) => {
              const mate = COMPANIONS[id];
              const region = homeRegion(id);
              const rescued = c.companions.includes(id);
              return (
                <li key={id} className={`team__card${rescued ? '' : ' team__card--missing'}`}>
                  <img className="team__portrait" src={portraits[id]} alt={rescued ? `${mate.name}, the ${mate.role}` : `${mate.name}, not yet rescued`} width={384} height={224} />
                  <h2 className="team__name">
                    {mate.name} · {mate.role}
                  </h2>
                  <p className="team__status">
                    <span className="team__flag">{rescued ? 'Rescued' : 'Missing'}</span> · {region.name}
                  </p>
                  <p className="team__ability">
                    {rescued
                      ? ABILITY[id].map((line, i) => (
                          <span key={line}>
                            {i > 0 && <br />}
                            {line}
                          </span>
                        ))
                      : `Last seen near ${region.name}.`}
                  </p>
                  <p className="team__use">{rescued ? availability(id, c) : `Clear ${region.name} to bring ${mate.name} home.`}</p>
                </li>
              );
            })}
          </ul>
        </main>
      )}
    </GameLayout>
  );
}

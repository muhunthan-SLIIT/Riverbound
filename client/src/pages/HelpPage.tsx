// Page 25: Help, Rules & Credits (Figma node 18:560). Open to everyone, signed in or not.
// The numbers (prices, rewards, timers) come from the shared game rules, so this guide
// always matches what the server actually does.
import {
  CHEST_LOOT_COINS,
  FEED_MIN_UNFED,
  FEED_BONUS_COINS,
  FISH_SALE_PRICE,
  MAX_HEARTS,
  POINTS_PARTIAL,
  POINTS_PERFECT,
  POINTS_PER_HEART_REGION_BONUS,
  REGIONS,
  getShopItem,
} from '@riverbound/shared';
import { AccountFrame } from '../components/game/AccountFrame.tsx';
import '../styles/pages/help.css';

const price = (id: Parameters<typeof getShopItem>[0]) => getShopItem(id).price;
const timer = (id: (typeof REGIONS)[number]['id']) => REGIONS.find((r) => r.id === id)?.timerSeconds ?? 0;

const SECTIONS: { title: string; lines: string[] }[] = [
  {
    title: 'Catch & prepare',
    lines: [
      'Catch with your free hand net: a random 1 to 4 fish per catch.',
      `You need at least ${FEED_MIN_UNFED} unfed fish. A river picture (from the Fish API) decides how many you feed: its fish are your batch and its chests are food chests. Food is free.`,
      'Unfed / Reserved / Fed remain separate.',
    ],
  },
  {
    title: 'Feed & trade',
    lines: [
      'Solve whole-number maths; wrong answers cost no hearts.',
      `Correct: every fish in the batch becomes fed, +${FEED_BONUS_COINS} coins, once per batch.`,
      `Only fed fish sell: ${FISH_SALE_PRICE} coins each.`,
    ],
  },
  {
    title: 'Equip & explore',
    lines: [
      `Buy the map first (${price('river_map')}), compass second (${price('compass')}).`,
      'Then the travel gear each route needs (goggles, outfit, life jacket, rope, boat).',
      'Own the full route kit before leaving.',
    ],
  },
  {
    title: 'Crossing outcomes',
    lines: [
      `Count the fish and the treasure chests. Both right: chests × ${CHEST_LOOT_COINS} coins, +${POINTS_PERFECT} points.`,
      `One right: half loot (rounded down), +${POINTS_PARTIAL} points, −1 heart.`,
      'Both wrong or time out: −1 heart, no loot, a fresh picture.',
      'Each crossing pays only the first time you clear it.',
    ],
  },
  {
    title: 'Hearts & companions',
    lines: [
      'Losing your last heart (even with one count right) gives no loot: back to camp. Coins, fish, gear and crew are kept, and rest is free.',
      `Scout: fish count once per region. Medic: +1 heart once per expedition (max ${MAX_HEARTS}). Navigator: route guidance.`,
      `Region bonus: ${POINTS_PER_HEART_REGION_BONUS} points for each heart you keep.`,
    ],
  },
  {
    title: 'Controls & internet',
    lines: [
      'Tab / Shift+Tab to move, Enter / Space to press. Counts are whole numbers.',
      'Riverbound needs an internet connection: your journey is saved on the server after every action.',
    ],
  },
];

export function HelpPage() {
  return (
    <AccountFrame scene="expeditionMap" className="help">
      {() => (
        <main className="help__card" aria-labelledby="help-title">
          <h1 id="help-title" className="help__title">
            A field guide to the river
          </h1>
          <p className="help__intro">Your objective: rescue Mira the Scout, Jonah the Medic and Tess the Navigator, buy a boat, and bring the whole crew home.</p>

          <div className="help__sections">
            {SECTIONS.map((section) => (
              <section key={section.title} className="help__section" aria-labelledby={`help-${section.title}`}>
                <h2 id={`help-${section.title}`} className="help__heading">
                  {section.title}
                </h2>
                {section.lines.map((line) => (
                  <p key={line} className="help__line">
                    {line}
                  </p>
                ))}
              </section>
            ))}
          </div>

          <p className="help__timers">
            Timers: Easy {timer('shallow_bend')}s · Medium {timer('reed_marsh')}s · Hard/final {timer('rapid_gorge')}s. Settings or reloading never reset a running
            timer. A picture that is really broken is replaced with no penalty.
          </p>

          <section id="credits" className="help__credits" aria-labelledby="credits-title">
            <h2 id="credits-title" className="help__heading">
              Credits
            </h2>
            <ul>
              <li>
                Crossing pictures: <a href="https://marcconrad.com/uob/fish/doc.php">Fish Game API</a> © Marc Conrad, used for a non-commercial university
                project. When it is unavailable, the game uses its own drawn puzzles.
              </li>
              <li>
                Sound effects: <a href="https://freesound.org">Freesound</a>, CC0 (public domain) sounds only. Simple browser tones are used when Freesound is
                unavailable.
              </li>
              <li>
                River weather: <a href="https://open-meteo.com/">Weather data by Open-Meteo.com</a> (CC BY 4.0), live from four real rivers: the
                Nile at Aswan (easy), the Atrato at Quibdó (medium), the Zambezi at Victoria Falls (hard) and the Catatumbo at Lake Maracaibo
                (final). When the live weather does not fit a level, the game shows a backup and says so.
              </li>
              <li>Fonts: Fraunces and Inter, from Google Fonts (SIL Open Font License).</li>
              <li>Artwork: provisional illustrations from the Riverbound Figma design.</li>
              <li>Riverbound by Ulaganesan Muhunthan (UOB 2541667), Distributed Service Architecture.</li>
            </ul>
          </section>
        </main>
      )}
    </AccountFrame>
  );
}

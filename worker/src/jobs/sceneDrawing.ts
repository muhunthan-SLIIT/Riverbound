// Draws simple fish-and-chest SVG pictures with known counts (used as fallback puzzles).
import { createRng, randomInt, type Rng } from '@riverbound/shared';

const WIDTH = 660;
const HEIGHT = 360;

function fishSvg(x: number, y: number, flip: boolean): string {
  const s = flip ? -1 : 1;
  return `<g transform="translate(${x} ${y}) scale(${s} 1)"><ellipse rx="22" ry="12" fill="#F2BD52" stroke="#102531" stroke-width="2"/><polygon points="20,0 36,-11 36,11" fill="#E56B65" stroke="#102531" stroke-width="2"/><circle cx="-11" cy="-3" r="3" fill="#102531"/></g>`;
}

function chestSvg(x: number, y: number): string {
  return `<g transform="translate(${x - 22} ${y - 16})"><rect width="44" height="30" rx="4" fill="#694632" stroke="#102531" stroke-width="2"/><rect y="0" width="44" height="10" rx="4" fill="#8a5a3c" stroke="#102531" stroke-width="2"/><rect x="18" y="8" width="8" height="10" fill="#F2BD52" stroke="#102531" stroke-width="1.5"/></g>`;
}

/** Places objects on a grid with jitter so they never overlap (counting must be fair). */
function placeObjects(rng: Rng, total: number): Array<{ x: number; y: number }> {
  const cols = 8;
  const rows = 4;
  const cells = Array.from({ length: cols * rows }, (_, i) => i);
  for (let i = cells.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [cells[i], cells[j]] = [cells[j] as number, cells[i] as number];
  }
  return cells.slice(0, total).map((cell) => ({
    x: 50 + (cell % cols) * 80 + randomInt(rng, -10, 10),
    y: 55 + Math.floor(cell / cols) * 80 + randomInt(rng, -8, 8),
  }));
}

export function drawScene(seed: number, fish: number, chests: number): string {
  const rng = createRng(seed);
  const spots = placeObjects(rng, fish + chests);
  const parts = spots.map((spot, i) => (i < fish ? fishSvg(spot.x, spot.y, rng() < 0.5) : chestSvg(spot.x, spot.y)));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}"><rect width="${WIDTH}" height="${HEIGHT}" fill="#147D64"/><path d="M0 300 Q165 280 330 300 T660 300 V360 H0Z" fill="#073B3A"/>${parts.join('')}</svg>`;
}

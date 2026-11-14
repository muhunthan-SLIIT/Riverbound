// One icon cut from the Figma equipment sprite sheet (4 x 4 grid, 1536 x 1536).
// Rows 1-3 follow the original shop order (the fishing-tool cells are no longer used, v2.3);
// the last row holds fish, food crate, treasure chest and coin.
import type { ItemId } from '@riverbound/shared';
import { items } from '../assets/art.ts';

export type IconName = ItemId | 'fish' | 'food_crate' | 'treasure_chest' | 'coin';

const GRID: Record<IconName, [col: number, row: number]> = {
  river_map: [0, 0],
  compass: [1, 0],
  swimming_goggles: [2, 0],
  swimming_outfit: [3, 0],
  life_jacket: [1, 2],
  rescue_rope: [2, 2],
  boat: [3, 2],
  fish: [0, 3],
  food_crate: [1, 3],
  treasure_chest: [2, 3],
  coin: [3, 3],
};

type Props = { name: IconName; size?: number; label?: string; className?: string };

export function SpriteIcon({ name, size = 48, label, className = '' }: Props) {
  const [col, row] = GRID[name];
  return (
    <span
      className={`sprite-icon ${className}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${items.equipmentSprites})`,
        backgroundSize: '400% 400%',
        backgroundPosition: `${(col / 3) * 100}% ${(row / 3) * 100}%`,
      }}
    />
  );
}

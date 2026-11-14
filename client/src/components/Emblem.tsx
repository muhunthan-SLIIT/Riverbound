// The Riverbound emblem: folded map, river wave and brass compass star (no lettering).
// Exported from the Figma frame. Decorative, so screen readers skip it unless a label is given.
import { emblem as emblemUrl } from '../assets/art.ts';

type Props = { size: number; label?: string; className?: string };

export function Emblem({ size, label, className }: Props) {
  return (
    <img
      src={emblemUrl}
      width={size}
      height={size}
      className={className}
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      draggable={false}
    />
  );
}

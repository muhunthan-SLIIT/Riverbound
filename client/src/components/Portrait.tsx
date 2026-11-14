// A character portrait (Alex, Finn, Mira, Jonah or Tess) from the Figma art sheet.
import { portraits } from '../assets/art.ts';

const NAMES: Record<keyof typeof portraits, string> = {
  female: 'Alex',
  male: 'Finn',
  mira: 'Mira',
  jonah: 'Jonah',
  tess: 'Tess',
};

type Props = { who: keyof typeof portraits; className?: string; decorative?: boolean };

export function Portrait({ who, className, decorative = false }: Props) {
  return (
    <img
      src={portraits[who]}
      className={className}
      alt={decorative ? '' : `Portrait of ${NAMES[who]}`}
      aria-hidden={decorative || undefined}
      width={512}
      height={512}
      loading="lazy"
      decoding="async"
    />
  );
}

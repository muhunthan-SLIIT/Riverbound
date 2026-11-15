// Fishing animation (presentation only): the explorer swings a hand net into the river, waits for a bite,
// then lifts it. The fish only appears in the net AFTER the server has confirmed the catch; if the
// request fails, the net comes up empty. The animation never decides or grants anything.
//
// The SVG uses the painting's own coordinates (1440 x 900) with preserveAspectRatio="xMidYMid slice",
// which crops and scales exactly like the background image (object-fit: cover, centred). So the net
// always starts at the explorer's hands in the painting, on any screen size.

export type NetPhase = 'idle' | 'cast' | 'wait' | 'lift' | 'caught' | 'missed';

/** How long each phase lasts (ms). The page waits for these before moving on. */
export const NET_TIMING = { cast: 700, minDip: 600, lift: 650, caught: 900, missed: 900 } as const;

// Points in the painting (1440 x 900): the explorer's hands and where the net lands in the water.
const HANDS = { x: 925, y: 655 };
const HOOP = { x: 760, y: 735 };

// Where each fish sits in the net, and how big, for a catch of 1, 2, 3 or 4 (rules v2.4).
const FISH_LAYOUT: Record<number, { scale: number; spots: [number, number][] }> = {
  1: { scale: 1.15, spots: [[-2, 22]] },
  2: { scale: 0.95, spots: [[-16, 14], [14, 32]] },
  3: { scale: 0.85, spots: [[-20, 10], [18, 14], [-2, 38]] },
  4: { scale: 0.8, spots: [[-22, 8], [20, 8], [-18, 36], [18, 38]] },
};

export function NetCastAnimation({ phase, run, caught = 1 }: { phase: NetPhase; run: number; caught?: number }) {
  if (phase === 'idle') return null;
  const showFish = phase === 'lift' || phase === 'caught';
  const layout = FISH_LAYOUT[Math.min(4, Math.max(1, caught))] ?? FISH_LAYOUT[1]!;

  return (
    <svg
      key={run}
      className={`netcast netcast--${phase}`}
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern id="net-mesh" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 0 L0 9 M0 0 L9 0" stroke="rgb(244 232 204 / 85%)" strokeWidth="1.4" />
        </pattern>
      </defs>

      {/* Ripples where the net enters the water */}
      <g className="netcast__ripples">
        {[0, 1, 2].map((i) => (
          <ellipse key={i} className={`netcast__ripple netcast__ripple--${i}`} cx={HOOP.x} cy={HOOP.y + 8} rx="14" ry="5" />
        ))}
      </g>

      {/* Splash droplets on entry */}
      <g className="netcast__splash">
        {[-34, -14, 6, 26, 40].map((dx, i) => (
          <circle key={dx} className={`netcast__drop netcast__drop--${i}`} cx={HOOP.x + dx} cy={HOOP.y} r={i % 2 ? 3 : 4} />
        ))}
      </g>

      {/* The hand net: pole from the hands, an oval hoop and a mesh bag. It rotates around the hands. */}
      <g className="netcast__net">
        <line className="netcast__pole" x1={HANDS.x} y1={HANDS.y} x2={HOOP.x + 44} y2={HOOP.y - 14} />
        <path
          className="netcast__bag"
          d={`M${HOOP.x - 50} ${HOOP.y} Q ${HOOP.x - 46} ${HOOP.y + 62} ${HOOP.x} ${HOOP.y + 68} Q ${HOOP.x + 46} ${HOOP.y + 62} ${HOOP.x + 50} ${HOOP.y} Z`}
          fill="url(#net-mesh)"
        />
        {showFish &&
          layout.spots.map(([dx, dy], i) => (
            <g key={i} className="netcast__fish" transform={`translate(${HOOP.x + dx} ${HOOP.y + dy}) scale(${layout.scale})`}>
              {/* each fish wriggles slightly out of step with the others */}
              <g className="netcast__fish-body" style={{ animationDelay: `${i * 70}ms` }}>
                <path d="M-22 0 C -12 -11, 10 -11, 18 0 C 10 11, -12 11, -22 0 Z" fill="#7fb7c9" stroke="#2f5d6b" strokeWidth="2" />
                <path d="M18 0 L 30 -9 L 28 0 L 30 9 Z" fill="#5f9bb0" stroke="#2f5d6b" strokeWidth="2" />
                <circle cx="-13" cy="-2" r="2.4" fill="#102531" />
                <path d="M-4 -6 C -1 -2, -1 2, -4 6" fill="none" stroke="#2f5d6b" strokeWidth="1.6" />
              </g>
            </g>
          ))}
        <ellipse className="netcast__hoop" cx={HOOP.x} cy={HOOP.y} rx="51" ry="17" />
      </g>

      {/* Water dripping from the lifted net */}
      {(phase === 'lift' || phase === 'caught' || phase === 'missed') && (
        <g className="netcast__drips">
          {[-18, 0, 16].map((dx, i) => (
            <circle key={dx} className={`netcast__drip netcast__drip--${i}`} cx={HOOP.x + dx} cy={HOOP.y + 40} r="3" />
          ))}
        </g>
      )}

      {/* "+1 fish" after a confirmed catch */}
      {phase === 'caught' && (
        <text className="netcast__plus" x={HOOP.x + 40} y={HOOP.y - 120}>
          +{caught} fish
        </text>
      )}
    </svg>
  );
}

/** True when the player asked for less motion (Settings or the computer's setting). */
export function prefersReducedMotion(): boolean {
  if (typeof document !== 'undefined' && document.documentElement.hasAttribute('data-reduced-motion')) return true;
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

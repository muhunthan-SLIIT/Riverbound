// Comfort settings (Settings page): readable interface, extra-visible keyboard focus, reduced motion.
// They are presentation-only, so they live in this browser (localStorage), not on the server.
// They are applied as attributes on <html>, and global.css reacts to them.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Comfort = { readable: boolean; strongFocus: boolean; reducedMotion: boolean };

const KEY = 'riverbound.comfort';

function systemPrefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

function readComfort(): Comfort {
  const fallback: Comfort = { readable: false, strongFocus: true, reducedMotion: systemPrefersReducedMotion() };
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (!raw || typeof raw !== 'object') return fallback;
    const r = raw as Partial<Comfort>;
    return {
      readable: r.readable === true,
      strongFocus: r.strongFocus !== false,
      reducedMotion: typeof r.reducedMotion === 'boolean' ? r.reducedMotion : fallback.reducedMotion,
    };
  } catch {
    return fallback;
  }
}

function apply(c: Comfort) {
  const root = document.documentElement;
  root.toggleAttribute('data-readable', c.readable);
  root.toggleAttribute('data-strong-focus', c.strongFocus);
  root.toggleAttribute('data-reduced-motion', c.reducedMotion);
}

type ComfortValue = { comfort: Comfort; setComfort: (c: Comfort) => void };
const ComfortContext = createContext<ComfortValue | null>(null);

export function ComfortProvider({ children }: { children: ReactNode }) {
  const [comfort, setState] = useState<Comfort>(readComfort);
  useEffect(() => apply(comfort), [comfort]);

  const setComfort = useCallback((next: Comfort) => {
    setState(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable: the setting lasts for this visit only */
    }
  }, []);

  const value = useMemo(() => ({ comfort, setComfort }), [comfort, setComfort]);
  return <ComfortContext.Provider value={value}>{children}</ComfortContext.Provider>;
}

export function useComfort(): ComfortValue {
  const value = useContext(ComfortContext);
  if (!value) throw new Error('useComfort must be used inside <ComfortProvider>');
  return value;
}

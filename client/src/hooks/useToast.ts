// A short message that appears for a few seconds (for example "Fully rested").
import { useCallback, useEffect, useRef, useState } from 'react';

export type Toast = { text: string; kind: 'info' | 'error' } | null;

export function useToast(ms = 3500) {
  const [toast, setToast] = useState<Toast>(null);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback(
    (text: string, kind: 'info' | 'error' = 'info') => {
      window.clearTimeout(timer.current);
      setToast({ text, kind });
      timer.current = window.setTimeout(() => setToast(null), ms);
    },
    [ms],
  );

  useEffect(() => () => window.clearTimeout(timer.current), []);
  return { toast, show };
}

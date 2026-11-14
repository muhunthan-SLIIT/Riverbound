// Shares ONE sound setting across all pages (Welcome toggle, HUD toggle, Settings).
import { createContext, useContext, type ReactNode } from 'react';
import { useSoundState, type SoundControls } from './useSound.ts';

const SoundContext = createContext<SoundControls | null>(null);

export function SoundProvider({ children }: { children: ReactNode }) {
  return <SoundContext.Provider value={useSoundState()}>{children}</SoundContext.Provider>;
}

export function useSound(): SoundControls {
  const value = useContext(SoundContext);
  if (!value) throw new Error('useSound must be used inside <SoundProvider>');
  return value;
}

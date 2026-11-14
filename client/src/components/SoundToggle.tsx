// "Sound: Off / On" button from the Figma Welcome screen and the in-game HUD.
import { useSound } from '../hooks/SoundContext.tsx';

export function SoundToggle({ className = '' }: { className?: string }) {
  const { enabled, setEnabled } = useSound();
  const toggle = () => setEnabled(!enabled);

  return (
    <button type="button" className={`btn btn-chip ${className}`} aria-pressed={enabled} onClick={toggle}>
      Sound: {enabled ? 'On' : 'Off'}
    </button>
  );
}

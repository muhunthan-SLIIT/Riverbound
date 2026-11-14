// Page 01: Splash / Session Loading (Figma node 18:512).
// It checks whether the player is already signed in, then "Enter the adventure" takes them
// to the right place: Campaign selection (signed in) or Welcome (signed out).
// If the server cannot be reached, it shows Retry instead of pretending the player is signed out.
import { useNavigate } from 'react-router-dom';
import { Emblem } from '../components/Emblem.tsx';
import { SceneBackground } from '../components/SceneBackground.tsx';
import { useSession } from '../hooks/SessionContext.tsx';
import { paths } from '../routes/paths.ts';
import '../styles/pages/splash.css';

export function SplashPage() {
  const { status, refresh } = useSession();
  const navigate = useNavigate();

  const checking = status === 'checking';
  const unreachable = status === 'unreachable';
  const destination = status === 'signed_in' ? paths.campaigns : paths.welcome;

  const message = checking
    ? 'Listening to the river…'
    : unreachable
      ? 'We could not reach the game server.'
      : 'The river is calling.';

  return (
    <main className="scene splash">
      <SceneBackground scrim />

      <div className="splash__content">
        <Emblem size={160} className="splash__emblem" />
        <h1 className="splash__title">Riverbound</h1>
        <p className="splash__tagline">Find your crew. Brave the river. Make it home.</p>

        <div className={`splash__ripple${checking ? ' splash__ripple--busy' : ''}`} aria-hidden="true" />
        <p className="splash__status" role="status" aria-live="polite">
          {message}
        </p>

        <div className="splash__actions">
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={checking || unreachable}
            aria-busy={checking}
            onClick={() => navigate(destination, { replace: true })}
          >
            Enter the adventure
          </button>
          {unreachable && (
            <button type="button" className="btn btn-chip btn-block" onClick={() => void refresh()}>
              Trouble loading? Retry
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

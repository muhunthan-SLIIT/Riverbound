// Page 02: Welcome / game front page (Figma node 18:514).
// Start Adventure -> Register, Sign In -> Sign in, How to Play / Credits -> Help page.
// No guest play, social login or multiplayer controls (not in the MVP).
import { Link } from 'react-router-dom';
import { Emblem } from '../components/Emblem.tsx';
import { SceneBackground } from '../components/SceneBackground.tsx';
import { SoundToggle } from '../components/SoundToggle.tsx';
import { paths } from '../routes/paths.ts';
import '../styles/pages/welcome.css';

export function WelcomePage() {
  return (
    <div className="scene welcome">
      <SceneBackground />

      <header className="welcome__header">
        <Link to={paths.welcome} className="welcome__brand" aria-label="Riverbound home">
          <Emblem size={64} />
          <span className="welcome__wordmark">RIVERBOUND</span>
        </Link>
        <SoundToggle className="welcome__sound" />
      </header>

      <main className="welcome__main">
        <p className="eyebrow">A river. A crew. A way home.</p>
        <h1 className="welcome__title">Riverbound</h1>
        <p className="welcome__hero">
          Find your crew. Brave the river.
          <br />
          Make it home.
        </p>

        <div className="welcome__actions">
          <div className="welcome__primary">
            <Link to={paths.register} className="btn btn-primary btn-block">
              Start Adventure <span aria-hidden="true">→</span>
            </Link>
            <Link to={paths.login} className="btn btn-secondary btn-block">
              Sign In
            </Link>
          </div>
          <nav className="welcome__links" aria-label="Game information">
            <Link to={paths.help} className="btn btn-chip">
              How to Play
            </Link>
            <Link to={`${paths.help}#credits`} className="btn btn-chip">
              Credits
            </Link>
          </nav>
        </div>
      </main>

      <footer className="welcome__footer">A story-driven river adventure</footer>
    </div>
  );
}

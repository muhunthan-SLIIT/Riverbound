// Shared layout for Register and Sign in (Figma 18:516 and 18:518):
// brand at the top left, a big welcome message on the left, and the form card on the right.
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { paths } from '../routes/paths.ts';
import { Emblem } from './Emblem.tsx';
import { SceneBackground } from './SceneBackground.tsx';
import '../styles/pages/auth.css';

type Props = {
  headline: [string, string]; // two lines, e.g. ["Welcome back,", "explorer."]
  subline: string;
  cardTitle: string;
  cardIntro: string;
  children: ReactNode;
};

export function AuthLayout({ headline, subline, cardTitle, cardIntro, children }: Props) {
  return (
    <div className="scene auth">
      <SceneBackground />

      <header className="auth__header">
        <Link to={paths.welcome} className="auth__brand" aria-label="Riverbound home">
          <Emblem size={64} />
          <span className="auth__wordmark">RIVERBOUND</span>
        </Link>
      </header>

      <div className="auth__intro">
        <p className="auth__headline" aria-hidden="true">
          {headline[0]}
          <br />
          {headline[1]}
        </p>
        <p className="auth__subline">{subline}</p>
      </div>

      <main className="auth__card">
        <h1 className="auth__card-title">{cardTitle}</h1>
        <p className="auth__card-intro">{cardIntro}</p>
        {children}
      </main>
    </div>
  );
}

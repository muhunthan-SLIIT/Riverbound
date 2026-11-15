// "Continue with Google" and "Continue with Apple" buttons, then an "or" line before the email form.
//
// Google: a normal link to /api/auth/google/start. The SERVER talks to Google (the client secret
// never reaches the browser), then sends the player back signed in.
// Apple: shown but switched off. Apple sign-in needs a paid Apple Developer account and an HTTPS
// website address, which this project does not have yet. The button says so instead of pretending.
//
// Logos: Google and Apple ask apps to use their OFFICIAL logo files (Google: "Don't create your
// own icon"). Save Google's G from https://developers.google.com/static/identity/images/g-logo.png
// as client/public/brand/google.png (or an SVG G from Google's signin-assets.zip as google.svg).
// Until a file is there, the button shows text only.
// The Google button uses Google's "light" button theme (white, grey border, 12px before the G,
// 10px after it), as Google's branding rules require for the colour G.
import { useEffect, useState } from 'react';
import { authApi, GOOGLE_SIGN_IN_URL } from '../services/gameApi.ts';

type Providers = { google: boolean; apple: boolean } | null; // null while loading

/** Shows the first logo file that exists; shows nothing if none do. */
function BrandLogo({ sources, size }: { sources: string[]; size: number }) {
  const [index, setIndex] = useState(0);
  const src = sources[index];
  if (!src) return null;
  return <img src={src} alt="" aria-hidden="true" width={size} height={size} className="social__logo" onError={() => setIndex((i) => i + 1)} />;
}

const GOOGLE_LOGO = ['/brand/google.svg', '/brand/google.png'];
const APPLE_LOGO = ['/brand/apple.svg', '/brand/apple.png'];

export function SocialSignIn() {
  const [providers, setProviders] = useState<Providers>(null);

  useEffect(() => {
    const controller = new AbortController();
    authApi
      .providers(controller.signal)
      .then(setProviders)
      .catch(() => {
        if (!controller.signal.aborted) setProviders({ google: false, apple: false });
      });
    return () => controller.abort();
  }, []);

  const googleReady = providers?.google === true;

  return (
    <div className="social">
      {googleReady ? (
        <a href={GOOGLE_SIGN_IN_URL} className="social__btn social__btn--google">
          <BrandLogo sources={GOOGLE_LOGO} size={24} />
          Continue with Google
        </a>
      ) : (
        <button type="button" className="social__btn social__btn--google" disabled aria-describedby="google-note">
          <BrandLogo sources={GOOGLE_LOGO} size={24} />
          {providers === null ? 'Checking Google…' : 'Continue with Google'}
        </button>
      )}
      {providers !== null && !googleReady && (
        <p id="google-note" className="social__note">
          Google sign-in is not switched on for this server yet.
        </p>
      )}

      <button type="button" className="social__btn" disabled aria-describedby="apple-note">
        <BrandLogo sources={APPLE_LOGO} size={20} />
        Continue with Apple
      </button>
      <p id="apple-note" className="social__note">
        Apple sign-in is coming later.
      </p>

      <div className="social__divider" role="separator" aria-label="or sign in with email">
        <span>or</span>
      </div>
    </div>
  );
}

/** Messages for /login?error=... after coming back from Google. */
export const SOCIAL_ERRORS: Record<string, string> = {
  google_cancelled: 'Google sign-in was cancelled. Nothing changed.',
  google_expired: 'That Google sign-in took too long or was opened in another tab. Please try again.',
  google_failed: 'Google sign-in did not work. Please try again, or sign in with your email.',
  google_email_taken: 'This email is already linked to a different Google account.',
  google_off: 'Google sign-in is not switched on for this server yet.',
};

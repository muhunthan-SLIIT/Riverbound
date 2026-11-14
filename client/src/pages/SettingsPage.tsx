// Page 24: Settings (Figma node 18:558).
// Sound & comfort settings are presentation-only, so they are kept in this browser (localStorage),
// as the build guide says ("local state: sound settings"). Nothing here changes the game on the
// server, and settings can never pause or reset a crossing timer (the deadline lives on the server).
// Changes are a draft until "Save Settings"; "Cancel" throws the draft away.
import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AccountFrame } from '../components/game/AccountFrame.tsx';
import { useComfort, type Comfort } from '../hooks/ComfortContext.tsx';
import { useSession } from '../hooks/SessionContext.tsx';
import { useSound } from '../hooks/SoundContext.tsx';
import type { AudioSettings } from '../hooks/useSound.ts';
import { paths } from '../routes/paths.ts';
import '../styles/pages/settings.css';

type Draft = AudioSettings & Comfort & { effectsOn: boolean };

export function SettingsPage() {
  return (
    <AccountFrame scene="campHub" className="settings">
      {() => <Settings />}
    </AccountFrame>
  );
}

function Settings() {
  const navigate = useNavigate();
  const { user, signOut } = useSession();
  const sound = useSound();
  const { comfort, setComfort } = useComfort();
  // The live saved values. The HUD sound button can change them while this page is open.
  const saved: Draft = { effectsOn: sound.enabled, ...sound.audio, ...comfort };
  // Only the fields changed on this page are kept here; untouched fields always show the live value.
  const [edits, setEdits] = useState<Partial<Draft>>({});
  const draft: Draft = { ...saved, ...edits };
  const [message, setMessage] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const changed = (Object.keys(edits) as (keyof Draft)[]).some((k) => edits[k] !== saved[k]);
  const update = (patch: Partial<Draft>) => {
    setEdits((e) => ({ ...e, ...patch }));
    setMessage(null);
  };

  const save = () => {
    setComfort({ readable: draft.readable, strongFocus: draft.strongFocus, reducedMotion: draft.reducedMotion });
    sound.setAudio({ effectsVolume: draft.effectsVolume, musicOn: draft.musicOn, musicVolume: draft.musicVolume });
    if (edits.effectsOn !== undefined && edits.effectsOn !== sound.enabled) sound.setEnabled(edits.effectsOn);
    setEdits({});
    setMessage('Settings saved.');
  };

  const cancel = () => {
    setEdits({});
    navigate(-1);
  };

  return (
    <main className="settings__main">
      <header>
        <p className="eyebrow settings__eyebrow">Make yourself at home</p>
        <h1 className="settings__title">Settings</h1>
      </header>

      <div className="settings__grid">
        <section className="panel settings__panel" aria-labelledby="comfort-title">
          <h2 id="comfort-title" className="settings__panel-title">
            Sound &amp; comfort
          </h2>

          <AudioRow
            label="Sound effects"
            on={draft.effectsOn}
            volume={draft.effectsVolume}
            onToggle={() => update({ effectsOn: !draft.effectsOn })}
            onVolume={(v) => update({ effectsVolume: v })}
          />
          <AudioRow
            label="Music"
            on={draft.musicOn}
            volume={draft.musicVolume}
            onToggle={() => update({ musicOn: !draft.musicOn })}
            onVolume={(v) => update({ musicVolume: v })}
          />

          <fieldset className="settings__checks">
            <legend className="visually-hidden">Comfort</legend>
            <Check checked={draft.readable} onChange={(v) => update({ readable: v })}>
              Readable interface
            </Check>
            <Check checked={draft.strongFocus} onChange={(v) => update({ strongFocus: v })}>
              Visible keyboard focus
            </Check>
            <Check checked={draft.reducedMotion} onChange={(v) => update({ reducedMotion: v })}>
              Reduced motion
            </Check>
          </fieldset>

          <p className="settings__hint">Reduced motion uses instant swaps and clear text feedback.</p>

          <div className="settings__actions">
            <button type="button" className="btn btn-primary settings__save" onClick={save} disabled={!changed}>
              Save Settings
            </button>
            <button type="button" className="btn btn-secondary settings__cancel" onClick={cancel}>
              Cancel
            </button>
          </div>
          <p className="settings__status" role="status">
            {message ?? (changed ? 'You have unsaved changes.' : '')}
          </p>
        </section>

        <section className="panel settings__panel" aria-labelledby="account-title">
          <h2 id="account-title" className="settings__panel-title">
            Your account
          </h2>
          <p className="settings__text">
            {user ? (
              <>
                {user.explorerName} · {user.email}
                <br />
                Your journey saves automatically after every action.
              </>
            ) : (
              'Loading your account…'
            )}
          </p>
          <p className="settings__text">
            Timed / Untimed mode is chosen before an expedition, never during a crossing. Settings do not pause or reset the timer.
          </p>
          <p className="settings__text">
            <Link to={paths.help} className="settings__link">
              Help, rules &amp; credits
            </Link>
          </p>
          <div className="settings__actions settings__actions--end">
            <button
              type="button"
              className="btn btn-secondary settings__cancel"
              disabled={signingOut}
              aria-busy={signingOut}
              onClick={() => {
                setSigningOut(true);
                void signOut().finally(() => navigate(paths.welcome));
              }}
            >
              {signingOut ? 'Signing out…' : 'Sign Out'}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function AudioRow({ label, on, volume, onToggle, onVolume }: { label: string; on: boolean; volume: number; onToggle: () => void; onVolume: (v: number) => void }) {
  const id = label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="settings__audio">
      <span className="settings__audio-label" id={`${id}-label`}>
        {label}
      </span>
      <button type="button" className={`settings__switch${on ? ' is-on' : ''}`} aria-pressed={on} aria-labelledby={`${id}-label ${id}-state`} onClick={onToggle}>
        <span id={`${id}-state`}>{on ? 'On' : 'Off'}</span>
      </button>
      <label className="settings__volume">
        <span>Volume {volume}%</span>
        <input type="range" min={0} max={100} step={10} value={volume} disabled={!on} onChange={(e) => onVolume(Number(e.target.value))} aria-label={`${label} volume`} />
      </label>
    </div>
  );
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="settings__check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {children}
    </label>
  );
}

// Page 06: Character Selection — "Who will brave the river?" (Figma node 18:522).
// The player picks Alex or Finn (same abilities, appearance only), can rename them,
// then POST /api/campaigns creates the journey and the story introduction starts.
import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CHARACTERS, CHARACTER_NAME_MAX, CHARACTER_NAME_MIN, type CharacterId } from '@riverbound/shared';
import { Portrait } from '../components/Portrait.tsx';
import { SceneBackground } from '../components/SceneBackground.tsx';
import { TextField } from '../components/TextField.tsx';
import { ApiError, newActionKey } from '../services/apiClient.ts';
import { campaignApi } from '../services/gameApi.ts';
import { paths } from '../routes/paths.ts';
import '../styles/pages/character.css';

const EXPLORERS: Array<{ id: CharacterId; label: string; blurb: [string, string] }> = [
  { id: 'male', label: 'Male explorer', blurb: ['Steady. Curious.', 'Ready to find his crew.'] },
  { id: 'female', label: 'Female explorer', blurb: ['Resourceful. Determined.', 'Ready to find her crew.'] },
];

function nameError(name: string): string | null {
  const value = name.trim();
  if (value.length < CHARACTER_NAME_MIN || value.length > CHARACTER_NAME_MAX) {
    return `Character name must be ${CHARACTER_NAME_MIN}-${CHARACTER_NAME_MAX} characters.`;
  }
  return null;
}

export function CharacterSelectionPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<CharacterId | null>(null);
  const [name, setName] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<{ message: string; unfinished: boolean } | null>(null);
  const [pending, setPending] = useState(false);
  // One key per attempt: a double click or network retry can never create two journeys.
  const actionKey = useRef(newActionKey());

  const choose = (id: CharacterId) => {
    // Swap the name only if the player has not typed their own.
    const typedOwnName = name.trim() !== '' && !Object.values(CHARACTERS).some((c) => c.defaultName === name.trim());
    if (!typedOwnName) setName(CHARACTERS[id].defaultName);
    setSelected(id);
    setFormError(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || pending) return;
    const error = nameError(name);
    setFieldError(error);
    if (error) return;

    setPending(true);
    setFormError(null);
    try {
      const { campaign } = await campaignApi.create(selected, name.trim(), actionKey.current);
      navigate(paths.intro(campaign.id), { replace: true });
    } catch (err) {
      const unfinished = err instanceof ApiError && err.code === 'UNFINISHED_EXISTS';
      setFormError({ message: err instanceof Error ? err.message : 'Could not start your journey.', unfinished });
      if (!(err instanceof ApiError && err.code === 'NETWORK')) actionKey.current = newActionKey();
    } finally {
      setPending(false);
    }
  };

  const chosen = EXPLORERS.find((e) => e.id === selected) ?? null;

  return (
    <div className="scene choose">
      <SceneBackground />
      <div className="choose__backdrop" aria-hidden="true" />

      <main className="choose__main">
        <h1 className="choose__title">Who will brave the river?</h1>
        <p className="choose__subtitle">Different explorers. The same adventure.</p>

        <div className="choose__layout">
          <div className="choose__cards" role="radiogroup" aria-label="Choose your explorer">
            {EXPLORERS.map((explorer) => {
              const isSelected = selected === explorer.id;
              const name = CHARACTERS[explorer.id].defaultName;
              return (
                <button
                  key={explorer.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`explorer-card${isSelected ? ' explorer-card--selected' : ''}`}
                  onClick={() => choose(explorer.id)}
                >
                  <Portrait who={explorer.id} decorative className="explorer-card__portrait" />
                  <span className="explorer-card__name">
                    {name} · {explorer.label}
                  </span>
                  <span className="explorer-card__state">{isSelected ? 'SELECTED' : 'Choose explorer'} · Same abilities</span>
                </button>
              );
            })}
          </div>

          <form className="choose__panel" onSubmit={submit} noValidate aria-busy={pending}>
            {chosen ? (
              <>
                <h2 className="choose__panel-title">Meet {CHARACTERS[chosen.id].defaultName}</h2>
                <p className="choose__panel-text">
                  {chosen.blurb[0]}
                  <br />
                  {chosen.blurb[1]}
                </p>
                <TextField
                  label="Character name"
                  name="characterName"
                  autoComplete="off"
                  maxLength={CHARACTER_NAME_MAX}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldError) setFieldError(null);
                  }}
                  error={fieldError}
                  disabled={pending}
                />
              </>
            ) : (
              <>
                <h2 className="choose__panel-title">Choose your explorer</h2>
                <p className="choose__panel-text">
                  Pick Alex or Finn.
                  <br />
                  Both have the same abilities.
                </p>
              </>
            )}

            {formError && (
              <p className="form-alert" role="alert">
                {formError.message}{' '}
                {formError.unfinished && <Link to={paths.campaigns}>Go to your journal</Link>}
              </p>
            )}

            <div className="choose__actions">
              <button type="submit" className="btn btn-primary btn-block" disabled={!selected || pending}>
                {pending ? (
                  'Starting your journey…'
                ) : (
                  <>
                    Continue <span aria-hidden="true">→</span>
                  </>
                )}
              </button>
              <Link to={paths.campaigns} className="btn btn-link btn-block">
                Back to campaigns
              </Link>
            </div>
          </form>
        </div>
      </main>

      <footer className="choose__note">Your choice changes appearance only. Both explorers have the same abilities and start with the same supplies.</footer>
    </div>
  );
}

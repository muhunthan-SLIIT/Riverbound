// A labelled input from the Figma form design: cream field, label above, optional hint and error.
// Password fields get a "Show / Hide" button. Errors are linked to the input for screen readers.
import { useId, useState, type InputHTMLAttributes } from 'react';
import '../styles/components/forms.css';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'> & {
  label: string;
  type?: 'text' | 'email' | 'password';
  hint?: string;
  error?: string | null;
};

export function TextField({ label, type = 'text', hint, error, ...inputProps }: Props) {
  const id = useId();
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === 'password';
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`field${error ? ' field--invalid' : ''}`}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="field__control">
        <input
          {...inputProps}
          id={id}
          type={isPassword && revealed ? 'text' : type}
          className="field__input"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        />
        {isPassword && (
          <button
            type="button"
            className="field__reveal"
            aria-controls={id}
            aria-pressed={revealed}
            aria-label={revealed ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
            onClick={() => setRevealed((v) => !v)}
          >
            {revealed ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {error && (
        <p className="field__error" id={errorId}>
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      )}
    </div>
  );
}

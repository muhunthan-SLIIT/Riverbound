// Page 03: Register (Figma node 18:516).
// Creates a real account through POST /api/auth/register. The server hashes the password and
// starts a session (HttpOnly cookie), so the player goes straight on to their journeys.
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { PASSWORD_HINT, validateRegister, type FieldErrors, type RegisterInput } from '@riverbound/shared';
import { AuthLayout } from '../components/AuthLayout.tsx';
import { TextField } from '../components/TextField.tsx';
import { useSession } from '../hooks/SessionContext.tsx';
import { ApiError } from '../services/apiClient.ts';
import { authApi } from '../services/gameApi.ts';
import { paths } from '../routes/paths.ts';

const EMPTY: RegisterInput = { explorerName: '', email: '', password: '', confirmPassword: '' };

export function RegisterPage() {
  const { status, setUser } = useSession();
  const navigate = useNavigate();
  const [values, setValues] = useState<RegisterInput>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors<RegisterInput>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (status === 'signed_in') return <Navigate to={paths.campaigns} replace />;

  const update = (field: keyof RegisterInput) => (value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    // Clear a field's error as soon as the player starts fixing it.
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    setFormError(null);
    const found = validateRegister(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      focusFirstError();
      return;
    }

    setPending(true);
    try {
      const { user } = await authApi.register({ ...values, explorerName: values.explorerName.trim(), email: values.email.trim() });
      setUser(user);
      navigate(paths.campaigns, { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'EMAIL_TAKEN') {
        setErrors({ email: 'An account with this email already exists. Sign in instead?' });
        focusFirstError();
      } else {
        setFormError(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthLayout
      headline={['Your next adventure', 'starts here.']}
      subline="Your crew is counting on you."
      cardTitle="Create your account"
      cardIntro="Save your journey and continue on any device."
    >
      <form className="auth__form" noValidate onSubmit={submit} aria-busy={pending}>
        {formError && (
          <p className="form-alert" role="alert">
            {formError}
          </p>
        )}
        <TextField
          label="Explorer name"
          name="explorerName"
          autoComplete="nickname"
          placeholder="Alex Morgan"
          maxLength={30}
          value={values.explorerName}
          onChange={(e) => update('explorerName')(e.target.value)}
          error={errors.explorerName}
          disabled={pending}
          required
        />
        <TextField
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="alex@example.com"
          value={values.email}
          onChange={(e) => update('email')(e.target.value)}
          error={errors.email}
          disabled={pending}
          required
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={values.password}
          onChange={(e) => update('password')(e.target.value)}
          hint={PASSWORD_HINT}
          error={errors.password}
          disabled={pending}
          required
        />
        <TextField
          label="Confirm password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={(e) => update('confirmPassword')(e.target.value)}
          error={errors.confirmPassword}
          disabled={pending}
          required
        />

        <button type="submit" className="btn btn-primary auth__submit" disabled={pending}>
          {pending ? 'Creating account…' : 'Create Account'}
        </button>
      </form>

      <div className="auth__links">
        <Link to={paths.login} className="btn btn-chip btn-block">
          Already exploring?&nbsp;<strong>Sign In</strong>
        </Link>
      </div>
    </AuthLayout>
  );
}

/** Moves keyboard focus to the first field with an error, after React has drawn it. */
function focusFirstError() {
  requestAnimationFrame(() => {
    document.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus();
  });
}

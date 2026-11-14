// Page 04: Sign In (Figma node 18:518).
// Signs in through POST /api/auth/login. A wrong email or password always shows the same
// message, so nobody can find out which emails have accounts.
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { validateSignIn, type FieldErrors, type SignInInput } from '@riverbound/shared';
import { AuthLayout } from '../components/AuthLayout.tsx';
import { TextField } from '../components/TextField.tsx';
import { useSession } from '../hooks/SessionContext.tsx';
import { authApi } from '../services/gameApi.ts';
import { paths } from '../routes/paths.ts';

/** Only return to a page inside the game after signing in (never an outside address). */
function safeReturnPath(state: unknown): string {
  const from = (state as { from?: unknown } | null)?.from;
  return typeof from === 'string' && from.startsWith('/campaigns') ? from : paths.campaigns;
}

export function SignInPage() {
  const { status, setUser } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState<SignInInput>({ email: '', password: '' });
  const [errors, setErrors] = useState<FieldErrors<SignInInput>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const returnTo = safeReturnPath(location.state);
  if (status === 'signed_in') return <Navigate to={returnTo} replace />;

  const update = (field: keyof SignInInput) => (value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    setFormError(null);
    const found = validateSignIn(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      requestAnimationFrame(() => document.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus());
      return;
    }

    setPending(true);
    try {
      const { user } = await authApi.login({ email: values.email.trim(), password: values.password });
      setUser(user);
      navigate(returnTo, { replace: true });
    } catch (error) {
      // The server sends a safe message: "Email or password is incorrect.", "Too many requests…" or a connection message.
      setFormError(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthLayout
      headline={['Welcome back,', 'explorer.']}
      subline="Your crew is counting on you."
      cardTitle="Sign In"
      cardIntro="Pick up your journey where you left it."
    >
      <form className="auth__form" noValidate onSubmit={submit} aria-busy={pending}>
        {formError && (
          <p className="form-alert" role="alert">
            {formError}
          </p>
        )}
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
          autoComplete="current-password"
          value={values.password}
          onChange={(e) => update('password')(e.target.value)}
          error={errors.password}
          disabled={pending}
          required
        />

        <button type="submit" className="btn btn-primary auth__submit" disabled={pending}>
          {pending ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <div className="auth__links">
        <Link to={paths.register} className="btn btn-chip btn-block">
          New here?&nbsp;<strong>Register</strong>
        </Link>
      </div>
    </AuthLayout>
  );
}

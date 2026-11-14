// Account form rules. The browser uses them for instant feedback;
// the server checks the same rules again, because browser checks can be skipped.
import { EXPLORER_NAME_MAX, EXPLORER_NAME_MIN, PASSWORD_MAX, PASSWORD_MIN } from './constants.ts';

export type RegisterInput = { explorerName: string; email: string; password: string; confirmPassword: string };
export type SignInInput = { email: string; password: string };
export type FieldErrors<T> = Partial<Record<keyof T, string>>;

export const PASSWORD_HINT = `At least ${PASSWORD_MIN} characters, with letters and numbers.`;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailError(email: string): string | null {
  const value = email.trim();
  if (!value) return 'Enter your email address.';
  if (value.length > 254 || !EMAIL_PATTERN.test(value)) return 'Enter a valid email address, like name@example.com.';
  return null;
}

export function passwordError(password: string): string | null {
  if (!password) return 'Enter a password.';
  if (password.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters.`;
  if (password.length > PASSWORD_MAX) return `Password must be ${PASSWORD_MAX} characters or fewer.`;
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return 'Password must contain letters and numbers.';
  return null;
}

export function explorerNameError(name: string): string | null {
  const value = name.trim();
  if (!value) return 'Enter your explorer name.';
  if (value.length < EXPLORER_NAME_MIN || value.length > EXPLORER_NAME_MAX) {
    return `Explorer name must be ${EXPLORER_NAME_MIN}-${EXPLORER_NAME_MAX} characters.`;
  }
  return null;
}

export function validateRegister(input: RegisterInput): FieldErrors<RegisterInput> {
  const errors: FieldErrors<RegisterInput> = {};
  const name = explorerNameError(input.explorerName);
  const email = emailError(input.email);
  const password = passwordError(input.password);
  if (name) errors.explorerName = name;
  if (email) errors.email = email;
  if (password) errors.password = password;
  if (!input.confirmPassword) errors.confirmPassword = 'Type your password again.';
  else if (input.confirmPassword !== input.password) errors.confirmPassword = 'Passwords do not match.';
  return errors;
}

/** Sign in only checks that both fields are filled; the server decides if they are right. */
export function validateSignIn(input: SignInInput): FieldErrors<SignInInput> {
  const errors: FieldErrors<SignInInput> = {};
  const email = emailError(input.email);
  if (email) errors.email = email;
  if (!input.password) errors.password = 'Enter your password.';
  return errors;
}

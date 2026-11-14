// Registration, sign in, sign out and session lookup.
import { EXPLORER_NAME_MAX, EXPLORER_NAME_MIN, PASSWORD_MAX, PASSWORD_MIN, type UserDTO } from '@riverbound/shared';
import { Session, User, type UserDoc } from '../models/index.ts';
import { AppError, badRequest, conflict } from '../utils/errors.ts';
import { hashPassword, newSessionToken, sha256, verifyPassword } from '../utils/security.ts';
import { requireEmail, requireString } from '../utils/validate.ts';

export function toUserDTO(user: UserDoc): UserDTO {
  return { id: user._id.toString(), email: user.email, explorerName: user.explorerName };
}

function checkPassword(value: unknown): string {
  if (typeof value !== 'string' || value.length < PASSWORD_MIN || value.length > PASSWORD_MAX) {
    throw badRequest(`Password must be ${PASSWORD_MIN}-${PASSWORD_MAX} characters.`);
  }
  if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) throw badRequest('Password must contain letters and numbers.');
  return value;
}

async function createSession(userId: UserDoc['_id'], days: number): Promise<string> {
  const token = newSessionToken();
  await Session.create({ tokenHash: sha256(token), user: userId, expiresAt: new Date(Date.now() + days * 86_400_000) });
  return token;
}

export async function register(body: Record<string, unknown>, sessionDays: number): Promise<{ user: UserDTO; token: string }> {
  const explorerName = requireString(body.explorerName, 'Explorer name', EXPLORER_NAME_MIN, EXPLORER_NAME_MAX);
  const email = requireEmail(body.email);
  const password = checkPassword(body.password);
  if (body.confirmPassword !== undefined && body.confirmPassword !== password) throw badRequest('Passwords do not match.');

  try {
    const user = await User.create({ email, explorerName, passwordHash: await hashPassword(password) });
    return { user: toUserDTO(user), token: await createSession(user._id, sessionDays) };
  } catch (error) {
    if ((error as { code?: unknown }).code === 11000) throw conflict('EMAIL_TAKEN', 'An account with this email already exists.');
    throw error;
  }
}

export async function login(body: Record<string, unknown>, sessionDays: number): Promise<{ user: UserDTO; token: string }> {
  const generic = new AppError(401, 'INVALID_LOGIN', 'Email or password is incorrect.');
  if (typeof body.email !== 'string' || typeof body.password !== 'string') throw generic;
  const user = await User.findOne({ email: body.email.trim().toLowerCase() });
  if (!user || !(await verifyPassword(body.password, user.passwordHash))) throw generic;
  return { user: toUserDTO(user), token: await createSession(user._id, sessionDays) };
}

export async function logout(token: string | undefined): Promise<void> {
  if (token) await Session.deleteOne({ tokenHash: sha256(token) });
}

export async function findUserBySessionToken(token: string): Promise<UserDoc | null> {
  const session = await Session.findOne({ tokenHash: sha256(token), expiresAt: { $gt: new Date() } }).lean();
  if (!session) return null;
  return User.findById(session.user);
}

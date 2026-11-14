// The ONE place where the frontend talks to the backend.
// - Sends and receives JSON
// - Sends the session cookie automatically (same origin)
// - Adds an Idempotency-Key to every change, so a retry never pays a reward twice
import type { ApiErrorBody } from '@riverbound/shared';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function newActionKey(): string {
  return crypto.randomUUID();
}

type Options = { body?: unknown; actionKey?: string; signal?: AbortSignal };

async function request<T>(method: 'GET' | 'POST' | 'PATCH', path: string, options: Options = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (method !== 'GET') {
    headers['Content-Type'] = 'application/json';
    headers['Idempotency-Key'] = options.actionKey ?? newActionKey();
  }

  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      credentials: 'same-origin',
      body: method === 'GET' ? undefined : JSON.stringify(options.body ?? {}),
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'NETWORK', 'Connection lost. Reconnect to continue.');
  }

  const data = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const body = data as Partial<ApiErrorBody> | null;
    throw new ApiError(response.status, body?.error?.code ?? 'UNKNOWN', body?.error?.message ?? 'Something went wrong.');
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>('GET', path, { signal }),
  post: <T>(path: string, body?: unknown, actionKey?: string) => request<T>('POST', path, { body, actionKey }),
};

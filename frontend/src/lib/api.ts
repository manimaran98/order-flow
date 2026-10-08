import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { clearSession, getToken } from './session';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type Query = Record<string, string | number | boolean | null | undefined>;
type Options = { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown; query?: Query; auth?: boolean };

export function apiUrl(path: string, query: Query = {}) {
  const url = new URL(path, process.env.API_URL ?? 'http://localhost:4000');
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }
  return url;
}

/** Server-side call to the NestJS API with the session's bearer token. */
export async function apiFetch<T = unknown>(path: string, { method = 'GET', body, query, auth = true }: Options = {}): Promise<T> {
  const token = auth ? await getToken() : undefined;
  let res: Response;
  try {
    res = await fetch(apiUrl(path, query), {
      method,
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(503, 'Cannot reach the OrderFlow API');
  }
  // Our token was rejected (expired or user deactivated).
  if (res.status === 401 && token) await endSession();
  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) throw toApiError(res.status, data);
  return data as T;
}

/**
 * Server Actions and Route Handlers can delete the cookie directly. While a Server Component
 * renders, cookies are read-only, so hand off to the /session/expired route handler instead.
 * (A redirect from a Server Action to that route would drop its Set-Cookie.)
 */
async function endSession(): Promise<never> {
  try {
    await clearSession();
  } catch {
    redirect('/session/expired');
  }
  redirect('/login?expired=1');
}

export function toApiError(status: number, body: unknown): ApiError {
  const { message, statusCode: _statusCode, error: _error, ...details } = (body ?? {}) as Record<string, unknown>;
  const text = Array.isArray(message)
    ? message.join('; ')
    : typeof message === 'string'
      ? message
      : `Request failed (${status})`;
  return new ApiError(status, text, details);
}

/** For detail pages: a missing or malformed id renders the 404 page. */
export async function getOrNotFound<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) notFound();
    throw err;
  }
}

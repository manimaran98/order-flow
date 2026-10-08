export const SESSION_COOKIE = 'of_session';
export const SESSION_MAX_AGE = 8 * 60 * 60; // matches the API's JWT lifetime

/** Secure in production unless COOKIE_SECURE says otherwise (e.g. "false" while a deployment has no TLS yet). */
export function sessionCookieSecure(env: { NODE_ENV?: string; COOKIE_SECURE?: string } = process.env) {
  if (env.COOKIE_SECURE) return env.COOKIE_SECURE === 'true';
  return env.NODE_ENV === 'production';
}

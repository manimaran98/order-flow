import { sessionCookieSecure } from './session-cookie';

describe('sessionCookieSecure', () => {
  it('is secure in production by default', () => {
    expect(sessionCookieSecure({ NODE_ENV: 'production' })).toBe(true);
  });

  it('is not secure outside production by default', () => {
    expect(sessionCookieSecure({ NODE_ENV: 'development' })).toBe(false);
  });

  // A deployment without TLS yet (plain-HTTP load balancer) must still be able to log in.
  it('lets COOKIE_SECURE=false override production', () => {
    expect(sessionCookieSecure({ NODE_ENV: 'production', COOKIE_SECURE: 'false' })).toBe(false);
  });

  it('lets COOKIE_SECURE=true force it on', () => {
    expect(sessionCookieSecure({ NODE_ENV: 'development', COOKIE_SECURE: 'true' })).toBe(true);
  });
});

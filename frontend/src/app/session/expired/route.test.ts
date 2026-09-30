// @vitest-environment node
import { GET } from './route';

describe('GET /session/expired', () => {
  it('clears the session cookie and sends the user to login', () => {
    const res = GET();
    expect(res.status).toBe(307);
    // Relative, so it never leaks the server's bind address (0.0.0.0 under Docker).
    expect(res.headers.get('location')).toBe('/login?expired=1');
    expect(res.headers.get('set-cookie')).toMatch(/of_session=;/);
  });
});

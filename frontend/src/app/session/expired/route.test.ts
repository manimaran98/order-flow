// @vitest-environment node
import { NextRequest } from 'next/server';
import { GET } from './route';

describe('GET /session/expired', () => {
  it('clears the session cookie and sends the user to login', () => {
    const res = GET(new NextRequest('http://localhost:3000/session/expired'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/login?expired=1');
    expect(res.headers.get('set-cookie')).toMatch(/of_session=;/);
  });
});

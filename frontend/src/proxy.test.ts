// @vitest-environment node
import { NextRequest } from 'next/server';
import { proxy } from './proxy';

const run = (path: string, cookie?: string) =>
  proxy(new NextRequest(`http://app.test${path}`, { headers: cookie ? { cookie } : {} }));

describe('proxy', () => {
  it.each(['/login', '/register', '/session/expired', '/catalog', '/catalog/0b0e7a7e-1', '/api/health'])(
    'lets %s through without a session',
    (path) => {
      expect(run(path).headers.get('location')).toBeNull();
    },
  );

  it('does not treat lookalike paths as public', () => {
    expect(run('/catalogue').headers.get('location')).toBe('http://app.test/login?next=%2Fcatalogue');
    expect(run('/api/healthz').headers.get('location')).toBe('http://app.test/login?next=%2Fapi%2Fhealthz');
  });

  it('sends visitors without a session to login, remembering where they were going', () => {
    expect(run('/orders?status=PENDING').headers.get('location')).toBe(
      'http://app.test/login?next=%2Forders%3Fstatus%3DPENDING',
    );
    expect(run('/').headers.get('location')).toBe('http://app.test/login');
  });

  it('lets signed-in users through', () => {
    expect(run('/orders', 'of_session=tok').headers.get('location')).toBeNull();
  });
});

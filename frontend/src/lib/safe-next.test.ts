import { safeNext } from './safe-next';

describe('safeNext', () => {
  it('keeps same-site paths', () => {
    expect(safeNext('/orders?status=PENDING')).toBe('/orders?status=PENDING');
  });

  it.each(['//evil.example', '/\\evil.example', 'https://evil.example', '', undefined, 42])(
    'falls back to /dashboard for %p',
    (value) => {
      expect(safeNext(value)).toBe('/dashboard');
    },
  );
});

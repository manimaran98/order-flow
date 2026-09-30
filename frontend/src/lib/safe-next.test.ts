import { safeNext } from './safe-next';

describe('safeNext', () => {
  it('keeps same-site paths', () => {
    expect(safeNext('/orders?status=PENDING')).toBe('/orders?status=PENDING');
  });

  it('normalises the path it keeps', () => {
    expect(safeNext('/orders/../customers?x=1#top')).toBe('/customers?x=1#top');
  });

  // Browsers strip tab/CR/LF from URLs, so '/\t/evil' would become '//evil' (protocol-relative).
  it.each(['//evil.example', '/\t/evil.example', '/\n/evil.example', '/\r/evil.example', '/\\evil.example', 'https://evil.example', '', undefined, 42])(
    'falls back to /dashboard for %p',
    (value) => {
      expect(safeNext(value)).toBe('/dashboard');
    },
  );
});

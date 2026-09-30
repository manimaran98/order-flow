import { activeHref, navFor } from './nav';

describe('navigation', () => {
  it('highlights the most specific section', () => {
    expect(activeHref('/orders/new')).toBe('/orders/new');
    expect(activeHref('/orders/0b6f-uuid')).toBe('/orders');
    expect(activeHref('/dashboard')).toBe('/dashboard');
    expect(activeHref('/nowhere')).toBeUndefined();
  });

  it('hides admin-only sections from STAFF', () => {
    expect(navFor('STAFF').map((i) => i.href)).not.toContain('/users');
    expect(navFor('ADMIN').map((i) => i.href)).toContain('/users');
  });
});

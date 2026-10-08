import { formatPhoneMY, telHref } from './phone';

describe('formatPhoneMY', () => {
  it.each([
    ['+60123456789', '+60 12-345 6789'],
    ['+60198887777', '+60 19-888 7777'],
    ['+601122223333', '+60 11-2222 3333'], // 011 numbers have 8 subscriber digits
    ['+60112223333', '+60 11-222 3333'],
    ['+60351234567', '+60 3-5123 4567'], // Klang Valley landline
    ['+6052345678', '+60 5-234 5678'], // other landlines
    ['0123456789', '+60 12-345 6789'],
    ['012-345 6789', '+60 12-345 6789'],
  ])('formats %s as %s', (input, expected) => {
    expect(formatPhoneMY(input)).toBe(expected);
  });

  it('leaves numbers it does not recognise as they were', () => {
    expect(formatPhoneMY('+6591234567')).toBe('+6591234567');
    expect(formatPhoneMY('ask at counter')).toBe('ask at counter');
  });

  it('builds a dialable tel: link', () => {
    expect(telHref('012-345 6789')).toBe('tel:+60123456789');
    expect(telHref('+60351234567')).toBe('tel:+60351234567');
  });
});

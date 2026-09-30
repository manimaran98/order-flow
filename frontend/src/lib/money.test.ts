import { formatRM, fromSen, toSen } from './money';

describe('money', () => {
  it('formats ringgit with thousands separators and 2 decimals', () => {
    expect(formatRM('1234.5')).toBe('RM 1,234.50');
    expect(formatRM('0')).toBe('RM 0.00');
    expect(formatRM(36.5)).toBe('RM 36.50');
  });

  it('converts to sen without floating-point error', () => {
    expect(toSen('12.5')).toBe(1250);
    expect(fromSen(toSen('0.10') * 3)).toBe('0.30');
    expect(toSen('7')).toBe(700);
  });

  it('rejects amounts that are not plain 2-decimal numbers', () => {
    expect(toSen('1.005')).toBeNaN();
    expect(toSen('-1')).toBeNaN();
    expect(toSen('abc')).toBeNaN();
    expect(toSen('')).toBeNaN();
  });
});

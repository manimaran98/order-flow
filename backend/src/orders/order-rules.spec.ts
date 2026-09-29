import { BadRequestException } from '@nestjs/common';
import { money } from '../common/money.js';
import type { OrderStatus } from '../generated/prisma/client.js';
import {
  calculateTotals,
  canTransition,
  derivePaymentStatus,
  formatOrderNumber,
  mergeLines,
} from './order-rules.js';

const ALL: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PACKING', 'READY', 'DELIVERED', 'CANCELLED'];
const ALLOWED = new Set([
  'PENDING>CONFIRMED',
  'CONFIRMED>PACKING',
  'PACKING>READY',
  'READY>DELIVERED',
  'PENDING>CANCELLED',
  'CONFIRMED>CANCELLED',
  'PACKING>CANCELLED',
  'READY>CANCELLED',
]);

describe('canTransition', () => {
  for (const from of ALL) {
    for (const to of ALL) {
      const expected = ALLOWED.has(`${from}>${to}`);
      it(`${from} -> ${to} is ${expected ? 'allowed' : 'rejected'}`, () => {
        expect(canTransition(from, to)).toBe(expected);
      });
    }
  }
});

describe('derivePaymentStatus', () => {
  it.each([
    ['100.00', '0.00', 'UNPAID'],
    ['100.00', '0.01', 'PARTIAL'],
    ['100.00', '99.99', 'PARTIAL'],
    ['100.00', '100.00', 'PAID'],
    ['0.00', '0.00', 'PAID'], // fully discounted order owes nothing
  ])('total %s, paid %s -> %s', (total, paid, expected) => {
    expect(derivePaymentStatus(money(total), money(paid))).toBe(expected);
  });
});

describe('mergeLines', () => {
  it('sums quantities of repeated products, keeping first-seen order', () => {
    expect(
      mergeLines([
        { productId: 'b', quantity: 1 },
        { productId: 'a', quantity: 2 },
        { productId: 'b', quantity: 3 },
      ]),
    ).toEqual([
      { productId: 'b', quantity: 4 },
      { productId: 'a', quantity: 2 },
    ]);
  });
});

describe('calculateTotals', () => {
  const lines = [
    { productId: 'a', quantity: 3, unitPrice: money('0.10') },
    { productId: 'b', quantity: 2, unitPrice: money('12.50') },
  ];

  it('computes exact line subtotals, subtotal and total', () => {
    const r = calculateTotals(lines, money('5.00'));
    expect(r.items.map((i) => i.subtotal.toFixed(2))).toEqual(['0.30', '25.00']);
    expect(r.subtotal.toFixed(2)).toBe('25.30');
    expect(r.total.toFixed(2)).toBe('20.30');
  });

  it('allows a discount equal to the subtotal', () => {
    expect(calculateTotals(lines, money('25.30')).total.toFixed(2)).toBe('0.00');
  });

  it('rejects a discount above the subtotal', () => {
    expect(() => calculateTotals(lines, money('25.31'))).toThrow(BadRequestException);
  });
});

describe('formatOrderNumber', () => {
  it('uses the Malaysian date and pads to 4 digits', () => {
    expect(formatOrderNumber(7n, new Date('2026-09-29T16:30:00Z'))).toBe('ORD-20260930-0007');
  });

  it('grows past 4 digits instead of wrapping', () => {
    expect(formatOrderNumber(12345n, new Date('2026-09-29T00:00:00Z'))).toBe('ORD-20260929-12345');
  });
});

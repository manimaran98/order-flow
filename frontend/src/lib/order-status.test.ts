import type { OrderStatus } from './types';
import { canCancel, canDelete, canEdit, canRecordPayment, holdsStock, NEXT_ACTION_LABEL, nextStatus } from './order-status';

const ALL: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PACKING', 'READY', 'DELIVERED', 'CANCELLED'];

describe('order status rules (mirror the backend)', () => {
  it('moves forward one step', () => {
    expect(ALL.map(nextStatus)).toEqual(['CONFIRMED', 'PACKING', 'READY', 'DELIVERED', null, null]);
  });

  it('allows cancelling any non-final order', () => {
    expect(ALL.filter(canCancel)).toEqual(['PENDING', 'CONFIRMED', 'PACKING', 'READY']);
  });

  it('only edits PENDING orders and knows which statuses hold stock', () => {
    expect(ALL.filter(canEdit)).toEqual(['PENDING']);
    expect(ALL.filter(holdsStock)).toEqual(['CONFIRMED', 'PACKING', 'READY']);
  });

  it('labels every forward action', () => {
    expect(ALL.map(nextStatus).filter(Boolean).map((s) => NEXT_ACTION_LABEL[s!])).toEqual([
      'Confirm order',
      'Start packing',
      'Mark ready',
      'Mark delivered',
    ]);
  });

  it('decides payments and deletion', () => {
    expect(canRecordPayment('DELIVERED', 'PARTIAL')).toBe(true);
    expect(canRecordPayment('CANCELLED', 'UNPAID')).toBe(false);
    expect(canRecordPayment('PENDING', 'PAID')).toBe(false);
    expect(canDelete('PENDING', 'ADMIN', 0)).toBe(true);
    expect(canDelete('PENDING', 'STAFF', 0)).toBe(false);
    expect(canDelete('PENDING', 'ADMIN', 1)).toBe(false);
    expect(canDelete('CONFIRMED', 'ADMIN', 0)).toBe(false);
  });
});

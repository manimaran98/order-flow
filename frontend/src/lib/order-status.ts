import type { OrderStatus, PaymentStatus, Role } from './types';

/** The happy path, in order. */
export const ORDER_FLOW: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PACKING', 'READY', 'DELIVERED'];

const NEXT: Record<OrderStatus, OrderStatus | null> = {
  PENDING: 'CONFIRMED',
  CONFIRMED: 'PACKING',
  PACKING: 'READY',
  READY: 'DELIVERED',
  DELIVERED: null,
  CANCELLED: null,
};

export const nextStatus = (s: OrderStatus) => NEXT[s];
export const canCancel = (s: OrderStatus) => NEXT[s] !== null;
export const canEdit = (s: OrderStatus) => s === 'PENDING';
export const holdsStock = (s: OrderStatus) => s === 'CONFIRMED' || s === 'PACKING' || s === 'READY';
export const canRecordPayment = (s: OrderStatus, p: PaymentStatus) => s !== 'CANCELLED' && p !== 'PAID';
export const canDelete = (s: OrderStatus, role: Role, paymentCount: number) =>
  role === 'ADMIN' && s === 'PENDING' && paymentCount === 0;

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PACKING: 'Packing',
  READY: 'Ready',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export const PAYMENT_LABEL: Record<PaymentStatus, string> = { UNPAID: 'Unpaid', PARTIAL: 'Partial', PAID: 'Paid' };

/** Button label for moving *to* a status. */
export const NEXT_ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  CONFIRMED: 'Confirm order',
  PACKING: 'Start packing',
  READY: 'Mark ready',
  DELIVERED: 'Mark delivered',
};

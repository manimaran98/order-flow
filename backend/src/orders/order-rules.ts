import { BadRequestException } from '@nestjs/common';
import { ZERO } from '../common/money.js';
import { businessDate } from '../common/time.js';
import type { OrderStatus, PaymentStatus, Prisma } from '../generated/prisma/client.js';

type Decimal = Prisma.Decimal;

const NEXT: Record<OrderStatus, OrderStatus | null> = {
  PENDING: 'CONFIRMED',
  CONFIRMED: 'PACKING',
  PACKING: 'READY',
  READY: 'DELIVERED',
  DELIVERED: null,
  CANCELLED: null,
};

/** Forward one step, or cancel from any non-terminal status. */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (to === 'CANCELLED') return NEXT[from] !== null;
  return NEXT[from] === to;
}

/** Statuses in which the order's stock has been deducted (and must be restored on cancel). */
export const STOCK_HELD_STATUSES: readonly OrderStatus[] = ['CONFIRMED', 'PACKING', 'READY'];

export function derivePaymentStatus(total: Decimal, paid: Decimal): PaymentStatus {
  if (paid.gte(total)) return 'PAID';
  return paid.isZero() ? 'UNPAID' : 'PARTIAL';
}

export function mergeLines(items: { productId: string; quantity: number }[]) {
  const merged = new Map<string, number>();
  for (const { productId, quantity } of items) merged.set(productId, (merged.get(productId) ?? 0) + quantity);
  return [...merged].map(([productId, quantity]) => ({ productId, quantity }));
}

export type PricedLine = { productId: string; quantity: number; unitPrice: Decimal };

export function calculateTotals(lines: PricedLine[], discount: Decimal) {
  const items = lines.map((l) => ({ ...l, subtotal: l.unitPrice.mul(l.quantity) }));
  const subtotal = items.reduce((sum, i) => sum.add(i.subtotal), ZERO);
  if (discount.gt(subtotal)) throw new BadRequestException('Discount cannot exceed subtotal');
  return { items, subtotal, total: subtotal.sub(discount) };
}

export function formatOrderNumber(seq: bigint, now = new Date()) {
  return `ORD-${businessDate(now).replaceAll('-', '')}-${seq.toString().padStart(4, '0')}`;
}

import { Badge } from '@/components/ui/badge';
import { PAYMENT_LABEL, STATUS_LABEL } from '@/lib/order-status';
import type { OrderStatus, PaymentStatus } from '@/lib/types';

const STATUS_TONE: Record<OrderStatus, string> = {
  PENDING: 'border-amber-300 bg-amber-50 text-amber-800',
  CONFIRMED: 'border-blue-300 bg-blue-50 text-blue-800',
  PACKING: 'border-indigo-300 bg-indigo-50 text-indigo-800',
  READY: 'border-violet-300 bg-violet-50 text-violet-800',
  DELIVERED: 'border-green-300 bg-green-50 text-green-800',
  CANCELLED: 'border-zinc-300 bg-zinc-100 text-zinc-600',
};

const PAYMENT_TONE: Record<PaymentStatus, string> = {
  UNPAID: 'border-red-300 bg-red-50 text-red-800',
  PARTIAL: 'border-amber-300 bg-amber-50 text-amber-800',
  PAID: 'border-green-300 bg-green-50 text-green-800',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant="outline" className={STATUS_TONE[status]}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge variant="outline" className={PAYMENT_TONE[status]}>
      {PAYMENT_LABEL[status]}
    </Badge>
  );
}

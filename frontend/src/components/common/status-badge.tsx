import { PAYMENT_LABEL, STATUS_LABEL } from '@/lib/order-status';
import type { OrderStatus, PaymentStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

const pill = 'inline-flex h-[1.375rem] shrink-0 items-center gap-1.5 rounded-full px-2 text-xs font-medium whitespace-nowrap ring-1 ring-inset';

// Order status: a dot in the status hue; the label carries the meaning.
const STATUS_TONE: Record<OrderStatus, { pill: string; dot: string }> = {
  PENDING: { pill: 'bg-amber-50 text-amber-800 ring-amber-600/20', dot: 'bg-amber-500' },
  CONFIRMED: { pill: 'bg-sky-50 text-sky-800 ring-sky-600/20', dot: 'bg-sky-500' },
  PACKING: { pill: 'bg-violet-50 text-violet-800 ring-violet-600/20', dot: 'bg-violet-500' },
  READY: { pill: 'bg-cyan-50 text-cyan-800 ring-cyan-600/25', dot: 'bg-cyan-600' },
  DELIVERED: { pill: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20', dot: 'bg-emerald-500' },
  CANCELLED: { pill: 'bg-zinc-100 text-zinc-600 ring-zinc-500/20', dot: 'bg-zinc-400' },
};

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const tone = STATUS_TONE[status];
  return (
    <span data-status={status} className={cn(pill, tone.pill, className)}>
      <span aria-hidden className={cn('size-1.5 rounded-full', tone.dot)} />
      {STATUS_LABEL[status]}
    </span>
  );
}

// Payment status: a distinct glyph per state (empty, half, full), so it never relies on colour alone.
const PAYMENT_TONE: Record<PaymentStatus, string> = {
  UNPAID: 'bg-rose-50 text-rose-800 ring-rose-600/20',
  PARTIAL: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  PAID: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
};

function PaymentGlyph({ status }: { status: PaymentStatus }) {
  return (
    <svg aria-hidden viewBox="0 0 12 12" className="size-3 shrink-0">
      {status === 'UNPAID' && <circle cx="6" cy="6" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.5" />}
      {status === 'PARTIAL' && (
        <>
          <circle cx="6" cy="6" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6 1.75a4.25 4.25 0 0 1 0 8.5z" fill="currentColor" />
        </>
      )}
      {status === 'PAID' && (
        <>
          <circle cx="6" cy="6" r="5" fill="currentColor" />
          <path d="M3.75 6.1 5.3 7.6 8.3 4.5" fill="none" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
}

export function PaymentBadge({ status, className }: { status: PaymentStatus; className?: string }) {
  return (
    <span data-payment={status} className={cn(pill, PAYMENT_TONE[status], className)}>
      <PaymentGlyph status={status} />
      {PAYMENT_LABEL[status]}
    </span>
  );
}

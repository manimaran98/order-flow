import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { MoneyText } from '@/components/common/money-text';
import { PaymentBadge, StatusBadge } from '@/components/common/status-badge';
import { formatDate } from '@/lib/dates';
import type { OrderListItem } from '@/lib/types';

/** Phone list: one divided list of whole-row links (no cards inside the panel). */
export function OrderCards({ orders }: { orders: OrderListItem[] }) {
  return (
    <ul className="divide-y">
      {orders.map((o) => (
        <li key={o.id}>
          <Link
            href={`/orders/${o.id}`}
            className="flex items-center gap-3 px-4 py-3.5 outline-none transition-colors duration-150 hover:bg-surface focus-visible:bg-surface focus-visible:ring-3 focus-visible:ring-ring/35 focus-visible:ring-inset active:bg-surface"
          >
            <span className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)] gap-1.5">
              <span className="flex items-baseline justify-between gap-3">
                <span className="truncate text-sm font-medium">{o.customer.name}</span>
                <MoneyText value={o.total} className="text-sm font-semibold" />
              </span>
              <span className="flex items-baseline justify-between gap-3 text-xs text-muted-foreground">
                <span className="truncate font-mono">{o.orderNumber}</span>
                {o.paymentStatus === 'PARTIAL' ? (
                  <span className="whitespace-nowrap">
                    <MoneyText value={o.outstandingAmount} /> due
                  </span>
                ) : (
                  <span className="tabular whitespace-nowrap">{formatDate(o.createdAt)}</span>
                )}
              </span>
              <span className="flex flex-wrap gap-1.5 pt-0.5">
                <StatusBadge status={o.status} />
                <PaymentBadge status={o.paymentStatus} />
              </span>
            </span>
            <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground/50" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

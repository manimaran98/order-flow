import Link from 'next/link';
import { MoneyText } from '@/components/common/money-text';
import { PaymentBadge, StatusBadge } from '@/components/common/status-badge';
import { formatDate } from '@/lib/dates';
import type { OrderListItem } from '@/lib/types';

export function OrderCards({ orders }: { orders: OrderListItem[] }) {
  return (
    <ul className="grid gap-2">
      {orders.map((o) => (
        <li key={o.id}>
          <Link href={`/orders/${o.id}`} className="block rounded-lg border bg-card p-3 active:bg-muted">
            <div className="flex items-center justify-between">
              <span className="font-medium">{o.orderNumber}</span>
              <MoneyText value={o.total} className="font-semibold" />
            </div>
            <div className="mt-1 flex items-center justify-between text-sm text-muted-foreground">
              <span>{o.customer.name}</span>
              <span>{formatDate(o.createdAt)}</span>
            </div>
            <div className="mt-2 flex gap-2">
              <StatusBadge status={o.status} />
              <PaymentBadge status={o.paymentStatus} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

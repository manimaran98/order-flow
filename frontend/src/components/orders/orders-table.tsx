import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { MoneyText } from '@/components/common/money-text';
import { PaymentBadge, StatusBadge } from '@/components/common/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/dates';
import type { OrderListItem } from '@/lib/types';
import { cn } from '@/lib/utils';

/** Desktop list. Each row is one door: the order-number link stretches over the whole row. */
export function OrdersTable({ orders }: { orders: OrderListItem[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Payment</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="text-right">Outstanding</TableHead>
          <TableHead className="w-10" aria-hidden />
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((o) => {
          const owed = Number(o.outstandingAmount) > 0;
          return (
            <TableRow key={o.id} className="group relative focus-within:bg-surface">
              <TableCell>
                <Link
                  href={`/orders/${o.id}`}
                  className="font-mono text-[0.8125rem] font-medium outline-none after:absolute after:inset-0 focus-visible:after:ring-3 focus-visible:after:ring-ring/35 focus-visible:after:ring-inset"
                >
                  {o.orderNumber}
                </Link>
              </TableCell>
              <TableCell className="max-w-[18rem] truncate">{o.customer.name}</TableCell>
              <TableCell className="text-muted-foreground">{formatDate(o.createdAt)}</TableCell>
              <TableCell>
                <StatusBadge status={o.status} />
              </TableCell>
              <TableCell>
                <PaymentBadge status={o.paymentStatus} />
              </TableCell>
              <TableCell className="text-right">
                <MoneyText value={o.total} />
              </TableCell>
              <TableCell className={cn('text-right', owed ? 'font-medium' : 'text-muted-foreground')}>
                <MoneyText value={o.outstandingAmount} />
              </TableCell>
              <TableCell className="w-10 pl-0">
                <ChevronRight
                  aria-hidden
                  className="ml-auto size-4 text-muted-foreground/50 transition-[color,transform] duration-150 ease-out group-hover:translate-x-0.5 group-hover:text-foreground"
                />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

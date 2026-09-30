import Link from 'next/link';
import { MoneyText } from '@/components/common/money-text';
import { PaymentBadge, StatusBadge } from '@/components/common/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/dates';
import type { OrderListItem } from '@/lib/types';

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
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((o) => (
          <TableRow key={o.id}>
            <TableCell>
              <Link href={`/orders/${o.id}`} className="font-medium underline-offset-4 hover:underline">
                {o.orderNumber}
              </Link>
            </TableCell>
            <TableCell>{o.customer.name}</TableCell>
            <TableCell className="whitespace-nowrap">{formatDate(o.createdAt)}</TableCell>
            <TableCell>
              <StatusBadge status={o.status} />
            </TableCell>
            <TableCell>
              <PaymentBadge status={o.paymentStatus} />
            </TableCell>
            <TableCell className="text-right">
              <MoneyText value={o.total} />
            </TableCell>
            <TableCell className="text-right">
              <MoneyText value={o.outstandingAmount} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

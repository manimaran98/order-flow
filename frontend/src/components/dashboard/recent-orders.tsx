import Link from 'next/link';
import { MoneyText } from '@/components/common/money-text';
import { PaymentBadge, StatusBadge } from '@/components/common/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { OrderListItem } from '@/lib/types';

export function RecentOrders({ orders }: { orders: OrderListItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent orders</CardTitle>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
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
                  <TableCell className="space-x-1">
                    <StatusBadge status={o.status} />
                    <PaymentBadge status={o.paymentStatus} />
                  </TableCell>
                  <TableCell className="text-right">
                    <MoneyText value={o.total} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

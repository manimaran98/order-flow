import Link from 'next/link';
import { PaymentBadge, StatusBadge } from '@/components/common/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime } from '@/lib/dates';
import { canRecordPayment } from '@/lib/order-status';
import type { OrderDetail, Role } from '@/lib/types';
import { OrderItemsList, OrderItemsTable, OrderTotals, StatusStepper } from './order-items';
import { PaymentPanel, PaymentSheet } from './payment-sheet';
import { PaymentsTimeline } from './payments-timeline';
import { StatusActions } from './status-actions';

export function OrderDetailView({ order, role }: { order: OrderDetail; role: Role }) {
  const payable = canRecordPayment(order.status, order.paymentStatus);
  const actions = (layout: 'phone' | 'desktop') => (
    <StatusActions orderId={order.id} status={order.status} role={role} paymentCount={order.payments.length} layout={layout} />
  );
  return (
    <div className="grid gap-4">
      <header className="grid gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold md:text-2xl">{order.orderNumber}</h1>
          <StatusBadge status={order.status} />
          <PaymentBadge status={order.paymentStatus} />
        </div>
        <p className="text-sm text-muted-foreground">
          <Link href={`/customers/${order.customer.id}`} className="underline-offset-4 hover:underline">
            {order.customer.name}
          </Link>
          {order.customer.phone && ` · ${order.customer.phone}`} · {formatDateTime(order.createdAt)}
        </p>
        {order.notes && <p className="text-sm">{order.notes}</p>}
      </header>

      <div className="grid gap-4 md:hidden">
        {actions('phone')}
        {payable && <PaymentSheet orderId={order.id} outstanding={order.outstandingAmount} />}
        <OrderItemsList items={order.items} />
        <OrderTotals order={order} />
        <PaymentsTimeline payments={order.payments} />
      </div>

      <div className="hidden items-start gap-6 md:grid md:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent>
            <OrderItemsTable items={order.items} />
            <OrderTotals order={order} />
          </CardContent>
        </Card>
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              {actions('desktop')}
              <StatusStepper status={order.status} />
            </CardContent>
          </Card>
          {payable && <PaymentPanel orderId={order.id} outstanding={order.outstandingAmount} />}
          <PaymentsTimeline payments={order.payments} />
        </div>
      </div>
    </div>
  );
}

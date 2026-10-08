import Link from 'next/link';
import { MoneyText } from '@/components/common/money-text';
import { PageHeader } from '@/components/common/page-header';
import { PaymentBadge, StatusBadge } from '@/components/common/status-badge';
import { formatDateTime } from '@/lib/dates';
import { canCancel, canRecordPayment, nextStatus } from '@/lib/order-status';
import type { OrderDetail, Role } from '@/lib/types';
import { OrderItemsList, OrderItemsTable, OrderTotals, StatusStepper } from './order-items';
import { Panel } from '@/components/common/panel';
import { PaymentPanel, PaymentSheet } from './payment-sheet';
import { PaymentsTimeline } from './payments-timeline';
import { StatusActions } from './status-actions';
import { formatPhoneMY, telHref } from '@/lib/phone';

export function OrderDetailView({ order, role }: { order: OrderDetail; role: Role }) {
  const payable = canRecordPayment(order.status, order.paymentStatus);
  const next = nextStatus(order.status);
  const hasActions = Boolean(next) || canCancel(order.status);
  const times = { PENDING: order.createdAt, CONFIRMED: order.confirmedAt, DELIVERED: order.deliveredAt, CANCELLED: order.cancelledAt };
  const actions = (layout: 'phone' | 'desktop') => (
    <StatusActions orderId={order.id} status={order.status} role={role} paymentCount={order.payments.length} layout={layout} />
  );
  const itemCount = `${order.items.length} ${order.items.length === 1 ? 'item' : 'items'}`;
  const paidAside = (
    <span>
      <MoneyText value={order.paidAmount} className="font-medium text-foreground" /> of <MoneyText value={order.total} /> paid
    </span>
  );
  const notes = order.notes && (
    <Panel title="Notes">
      <p className="px-4 py-3.5 text-sm whitespace-pre-line text-pretty md:px-5">{order.notes}</p>
    </Panel>
  );

  return (
    <>
      <PageHeader
        back={{ href: '/orders', label: 'Orders' }}
        title={<span className="font-mono tracking-[-0.03em]">{order.orderNumber}</span>}
        meta={
          <>
            <StatusBadge status={order.status} />
            <PaymentBadge status={order.paymentStatus} />
          </>
        }
        description={
          <>
            <Link href={`/customers/${order.customer.id}`} className="block font-medium text-foreground underline-offset-4 hover:text-primary hover:underline sm:inline">
              {order.customer.name}
            </Link>
            <span className="whitespace-nowrap">
              <span className="mx-1.5 hidden sm:inline" aria-hidden>
                ·
              </span>
              {order.customer.phone && (
                <>
                  <a href={telHref(order.customer.phone)} className="tabular text-primary underline-offset-4 hover:underline">
                    {formatPhoneMY(order.customer.phone)}
                  </a>
                  <span className="mx-1.5" aria-hidden>
                    ·
                  </span>
                </>
              )}
              <span className="tabular">{formatDateTime(order.createdAt)}</span>
            </span>
          </>
        }
      />

      {/* Phone */}
      <div className="grid gap-4 md:hidden">
        <Panel title="Status">
          <div className="px-3 pt-4 pb-4">
            <StatusStepper status={order.status} times={times} orientation="horizontal" />
          </div>
          {(hasActions || payable) && (
            <div className="grid gap-2 border-t bg-surface/60 p-4">
              {hasActions && actions('phone')}
              {payable && <PaymentSheet orderId={order.id} outstanding={order.outstandingAmount} primary={!next} />}
            </div>
          )}
        </Panel>
        <Panel title="Items" aside={<span className="tabular">{itemCount}</span>}>
          <OrderItemsList items={order.items} />
          <OrderTotals order={order} />
        </Panel>
        <Panel title="Payments" aside={paidAside}>
          <PaymentsTimeline payments={order.payments} />
        </Panel>
        {notes}
      </div>

      {/* Desktop */}
      <div className="hidden items-start gap-6 md:grid lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-6">
          <Panel title="Items" aside={<span className="tabular">{itemCount}</span>}>
            <OrderItemsTable items={order.items} />
            <OrderTotals order={order} />
          </Panel>
          {notes}
        </div>
        <div className="grid gap-6">
          <Panel title="Status">
            <div className="px-5 py-4">
              <StatusStepper status={order.status} times={times} />
            </div>
            {hasActions && <div className="border-t bg-surface/60 px-5 py-4">{actions('desktop')}</div>}
          </Panel>
          <Panel title="Payments" aside={paidAside}>
            <PaymentsTimeline payments={order.payments} />
            {payable && <PaymentPanel orderId={order.id} outstanding={order.outstandingAmount} />}
          </Panel>
        </div>
      </div>
    </>
  );
}

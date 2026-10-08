import { Check, CircleX } from 'lucide-react';
import { MoneyText } from '@/components/common/money-text';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/dates';
import { ORDER_FLOW, STATUS_LABEL } from '@/lib/order-status';
import type { OrderDetail, OrderItem, OrderStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

export function OrderItemsList({ items }: { items: OrderItem[] }) {
  return (
    <ul className="divide-y">
      {items.map((i) => (
        <li key={i.id} className="flex items-start justify-between gap-3 px-4 py-3">
          <div className="grid min-w-0 gap-0.5">
            <p className="text-sm font-medium">{i.product.name}</p>
            <p className="text-xs text-muted-foreground">
              <span className="tabular">{i.quantity}</span> × <MoneyText value={i.unitPrice} />
              <span className="mx-1.5" aria-hidden>
                ·
              </span>
              <span className="font-mono">{i.product.sku}</span>
            </p>
          </div>
          <MoneyText value={i.subtotal} className="text-sm font-medium" />
        </li>
      ))}
    </ul>
  );
}

export function OrderItemsTable({ items }: { items: OrderItem[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead className="text-right">Qty</TableHead>
          <TableHead className="text-right">Unit price</TableHead>
          <TableHead className="text-right">Subtotal</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((i) => (
          <TableRow key={i.id} className="hover:bg-transparent">
            <TableCell className="max-w-[22rem] truncate font-medium">{i.product.name}</TableCell>
            <TableCell className="font-mono text-[0.8125rem] text-muted-foreground">{i.product.sku}</TableCell>
            <TableCell className="text-right">{i.quantity}</TableCell>
            <TableCell className="text-right text-muted-foreground">
              <MoneyText value={i.unitPrice} />
            </TableCell>
            <TableCell className="text-right font-medium">
              <MoneyText value={i.subtotal} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** Right-aligned money summary; Outstanding carries the emphasis because it is what the owner acts on. */
export function OrderTotals({ order, className }: { order: OrderDetail; className?: string }) {
  const discounted = Number(order.discount) > 0;
  const owed = Number(order.outstandingAmount) > 0;
  return (
    <div className={cn('border-t bg-surface/60 px-4 py-4 md:px-5', className)}>
      <dl className="ml-auto grid w-full max-w-xs gap-1.5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd>
            <MoneyText value={order.subtotal} />
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Discount</dt>
          <dd className={cn(!discounted && 'text-muted-foreground')}>
            {discounted && <span aria-hidden>−</span>}
            <MoneyText value={order.discount} />
          </dd>
        </div>
        <div className="mt-1 flex justify-between gap-4 border-t pt-2.5 font-semibold">
          <dt>Total</dt>
          <dd>
            <MoneyText value={order.total} />
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Paid</dt>
          <dd>
            <MoneyText value={order.paidAmount} />
          </dd>
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-4 border-t pt-2.5">
          <dt className="font-semibold">Outstanding</dt>
          <dd className={cn('text-lg font-semibold tracking-[-0.01em]', !owed && 'text-muted-foreground')}>
            <MoneyText value={order.outstandingAmount} />
          </dd>
        </div>
      </dl>
    </div>
  );
}

type StepperProps = {
  status: OrderStatus;
  /** When each step happened, where the API records it. */
  times?: Partial<Record<OrderStatus, string | null>>;
  orientation?: 'vertical' | 'horizontal';
};

/**
 * Lifecycle: done steps carry a check, the current step a ring, upcoming steps a hollow dot,
 * so the state reads without colour.
 */
export function StatusStepper({ status, times = {}, orientation = 'vertical' }: StepperProps) {
  if (status === 'CANCELLED') {
    const at = times.CANCELLED;
    return (
      <p className="flex items-start gap-2.5 text-sm">
        <CircleX aria-hidden className="mt-px size-[1.125rem] shrink-0 text-muted-foreground" />
        <span>
          <span className="font-medium">This order was cancelled.</span>
          {at && <span className="block text-[0.8125rem] text-muted-foreground">{formatDateTime(at)}</span>}
        </span>
      </p>
    );
  }
  const current = ORDER_FLOW.indexOf(status);
  // Delivered is terminal: every step, including the last, is done.
  const stateOf = (i: number) => (i < current || status === 'DELIVERED' ? 'done' : i === current ? 'current' : 'upcoming');

  if (orientation === 'horizontal') {
    return (
      <ol aria-label="Order progress" className="grid grid-cols-5">
        {ORDER_FLOW.map((s, i) => (
          <li
            key={s}
            aria-current={i === current ? 'step' : undefined}
            className="relative flex flex-col items-center gap-1.5 text-center"
          >
            {i > 0 && (
              <span aria-hidden className={cn('absolute top-2.5 right-1/2 h-px w-full -translate-y-1/2', i <= current ? 'bg-primary' : 'bg-border')} />
            )}
            <StepMark state={stateOf(i)} />
            <span className={cn('text-[0.6875rem] leading-tight', i === current ? 'font-semibold' : i > current ? 'text-muted-foreground' : 'text-foreground')}>
              {STATUS_LABEL[s]}
            </span>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <ol aria-label="Order progress" className="grid">
      {ORDER_FLOW.map((s, i) => {
        const at = times[s];
        const last = i === ORDER_FLOW.length - 1;
        return (
          <li key={s} aria-current={i === current ? 'step' : undefined} className="relative flex gap-3 pb-4 last:pb-0">
            {!last && <span aria-hidden className={cn('absolute top-6 bottom-1 left-2.5 w-px -translate-x-1/2', i < current ? 'bg-primary' : 'bg-border')} />}
            <StepMark state={stateOf(i)} />
            <span className="grid min-w-0 gap-0.5 pt-px">
              <span className={cn('text-sm leading-5', i === current ? 'font-semibold' : i > current ? 'text-muted-foreground' : 'text-foreground')}>
                {STATUS_LABEL[s]}
              </span>
              {at && i <= current && <span className="text-xs text-muted-foreground">{formatDateTime(at)}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function StepMark({ state }: { state: 'done' | 'current' | 'upcoming' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative z-10 grid size-5 shrink-0 place-items-center rounded-full',
        state === 'done' && 'bg-primary text-primary-foreground',
        state === 'current' && 'bg-card ring-2 ring-primary ring-offset-0',
        state === 'upcoming' && 'border border-dashed border-muted-foreground/40 bg-card',
      )}
    >
      {state === 'done' && <Check className="size-3" strokeWidth={3} />}
      {state === 'current' && <span className="size-2 rounded-full bg-primary" />}
    </span>
  );
}

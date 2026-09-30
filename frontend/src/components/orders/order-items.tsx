import { MoneyText } from '@/components/common/money-text';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ORDER_FLOW, STATUS_LABEL } from '@/lib/order-status';
import type { OrderDetail, OrderItem } from '@/lib/types';
import { cn } from '@/lib/utils';

export function OrderItemsList({ items }: { items: OrderItem[] }) {
  return (
    <ul className="divide-y rounded-lg border">
      {items.map((i) => (
        <li key={i.id} className="flex items-center justify-between gap-2 p-3">
          <div>
            <p className="font-medium">{i.product.name}</p>
            <p className="text-xs text-muted-foreground">
              {i.quantity} × <MoneyText value={i.unitPrice} />
            </p>
          </div>
          <MoneyText value={i.subtotal} className="font-medium" />
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
          <TableRow key={i.id}>
            <TableCell className="font-medium">{i.product.name}</TableCell>
            <TableCell>{i.product.sku}</TableCell>
            <TableCell className="text-right tabular-nums">{i.quantity}</TableCell>
            <TableCell className="text-right">
              <MoneyText value={i.unitPrice} />
            </TableCell>
            <TableCell className="text-right">
              <MoneyText value={i.subtotal} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function OrderTotals({ order }: { order: OrderDetail }) {
  const rows: [string, string][] = [
    ['Subtotal', order.subtotal],
    ['Discount', order.discount],
    ['Total', order.total],
    ['Paid', order.paidAmount],
    ['Outstanding', order.outstandingAmount],
  ];
  return (
    <dl className="mt-3 grid gap-1 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className={cn('flex justify-between', (label === 'Total' || label === 'Outstanding') && 'font-semibold')}>
          <dt className="text-muted-foreground">{label}</dt>
          <dd>
            <MoneyText value={value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function StatusStepper({ status }: { status: OrderDetail['status'] }) {
  if (status === 'CANCELLED') return <p className="mt-3 text-sm text-muted-foreground">This order was cancelled.</p>;
  const current = ORDER_FLOW.indexOf(status);
  return (
    <ol className="mt-4 grid gap-1 text-sm" aria-label="Order progress">
      {ORDER_FLOW.map((s, i) => (
        <li key={s} className={cn('flex items-center gap-2', i > current && 'text-muted-foreground')} aria-current={i === current ? 'step' : undefined}>
          <span className={cn('size-2 rounded-full', i <= current ? 'bg-primary' : 'bg-muted-foreground/30')} />
          {STATUS_LABEL[s]}
        </li>
      ))}
    </ol>
  );
}

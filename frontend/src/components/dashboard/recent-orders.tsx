import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { MoneyText } from '@/components/common/money-text';
import { PaymentBadge, StatusBadge } from '@/components/common/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { OrderListItem } from '@/lib/types';

function PanelHeader({ id, title, href, linkLabel }: { id: string; title: string; href: string; linkLabel: string }) {
  return (
    <div className="flex items-center justify-between border-b px-4 py-3 md:px-5">
      <h2 id={id} className="text-[0.9375rem] font-semibold tracking-[-0.01em]">
        {title}
      </h2>
      <Link href={href} className="inline-flex items-center gap-0.5 text-[0.8125rem] font-medium text-primary hover:underline">
        {linkLabel}
        <ChevronRight aria-hidden className="size-3.5" />
      </Link>
    </div>
  );
}

export function RecentOrders({ orders }: { orders: OrderListItem[] }) {
  return (
    <section aria-labelledby="recent-heading" className="overflow-hidden rounded-lg border bg-card">
      <PanelHeader id="recent-heading" title="Recent orders" href="/orders" linkLabel="All orders" />
      {orders.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">No orders yet. New orders will show up here.</p>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-8">
                    <span className="sr-only">Open</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id} className="group relative focus-within:bg-surface">
                    <TableCell>
                      <Link
                        href={`/orders/${o.id}`}
                        className="font-mono text-[0.8125rem] font-medium text-foreground outline-none after:absolute after:inset-0 focus-visible:after:ring-3 focus-visible:after:ring-ring/35 focus-visible:after:ring-inset"
                      >
                        {o.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[16rem] truncate">{o.customer.name}</TableCell>
                    <TableCell>
                      <span className="flex gap-1.5">
                        <StatusBadge status={o.status} />
                        <PaymentBadge status={o.paymentStatus} />
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <MoneyText value={o.total} />
                    </TableCell>
                    <TableCell className="w-8">
                      <ChevronRight
                        aria-hidden
                        className="size-4 text-muted-foreground/50 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ul className="divide-y md:hidden">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/orders/${o.id}`} className="grid gap-2 px-4 py-3 active:bg-surface">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm font-medium">{o.customer.name}</span>
                    <MoneyText value={o.total} className="text-sm font-semibold" />
                  </span>
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-mono text-xs text-muted-foreground">{o.orderNumber}</span>
                    <span className="flex gap-1.5">
                      <StatusBadge status={o.status} />
                      <PaymentBadge status={o.paymentStatus} />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export { PanelHeader };

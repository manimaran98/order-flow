import { ChevronRight, Clock3, PackageOpen, TriangleAlert, Wallet, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { formatRM } from '@/lib/money';
import type { DashboardSummary } from '@/lib/types';
import { cn } from '@/lib/utils';

type Tone = 'red' | 'amber' | 'blue' | 'green';
export type AttentionItem = { key: string; label: string; value: string; href: string; tone: Tone };

export function attentionItems(s: DashboardSummary): AttentionItem[] {
  return [
    { key: 'unpaid', label: 'Unpaid orders', value: String(s.unpaidOrders), tone: 'red', href: '/orders?paymentStatus=UNPAID,PARTIAL' },
    { key: 'outstanding', label: 'Expected payments', value: formatRM(s.outstandingAmount), tone: 'blue', href: '/orders?paymentStatus=UNPAID,PARTIAL' },
    { key: 'fulfilment', label: 'Awaiting fulfilment', value: String(s.awaitingFulfilment), tone: 'amber', href: '/orders?status=CONFIRMED,PACKING,READY' },
    { key: 'pending', label: 'Pending orders', value: String(s.pendingOrders), tone: 'amber', href: '/orders?status=PENDING' },
    { key: 'lowstock', label: 'Low-stock products', value: String(s.lowStockProducts), tone: 'amber', href: '/inventory?low=1' },
    { key: 'today', label: "Today's orders", value: `${s.todayOrders} · ${formatRM(s.todaySales)}`, tone: 'green', href: '/orders' },
    { key: 'completed', label: 'Completed orders', value: String(s.completedOrders), tone: 'green', href: '/orders?status=DELIVERED' },
  ];
}

type Row = { item: AttentionItem; icon: LucideIcon; hint: string; count: number; iconTone: string };

const ICON_TONE = {
  rose: 'bg-rose-50 text-rose-700 ring-rose-600/15',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/15',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/15',
  sky: 'bg-sky-50 text-sky-700 ring-sky-600/15',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
};

/**
 * "Needs attention" rows, each a door to the exact filtered list, plus the "Today" summary.
 * Accessible names stay `<label>: <value>` so they read the same as the old cards.
 */
export function AttentionCards({ summary, layout }: { summary: DashboardSummary; layout: 'stack' | 'grid' }) {
  const by = Object.fromEntries(attentionItems(summary).map((i) => [i.key, i])) as Record<string, AttentionItem>;
  const outstanding = Number(summary.outstandingAmount) > 0;

  const rows: Row[] = [
    {
      item: by.unpaid,
      icon: Wallet,
      count: summary.unpaidOrders,
      hint: outstanding ? `${by.outstanding.value} still to collect` : 'Every order is paid',
      iconTone: ICON_TONE.rose,
    },
    { item: by.pending, icon: Clock3, count: summary.pendingOrders, hint: 'Waiting for you to confirm', iconTone: ICON_TONE.amber },
    { item: by.fulfilment, icon: PackageOpen, count: summary.awaitingFulfilment, hint: 'To pack or deliver', iconTone: ICON_TONE.violet },
    { item: by.lowstock, icon: TriangleAlert, count: summary.lowStockProducts, hint: 'At or below reorder level', iconTone: ICON_TONE.amber },
  ];

  return (
    <div className={cn('grid gap-4', layout === 'grid' && 'lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-6')}>
      <section aria-labelledby="attention-heading" className="overflow-hidden rounded-lg border bg-card">
        <h2 id="attention-heading" className="border-b px-4 py-3 text-[0.9375rem] font-semibold tracking-[-0.01em] md:px-5">
          Needs attention
        </h2>
        <ul className="divide-y">
          {rows.map(({ item, icon: Icon, hint, count, iconTone }) => {
            const clear = count === 0;
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  aria-label={`${item.label}: ${item.value}`}
                  className="group flex items-center gap-3 px-4 py-3.5 transition-colors duration-150 hover:bg-surface md:gap-4 md:px-5"
                >
                  <span className={cn('grid size-9 shrink-0 place-items-center rounded-md ring-1 ring-inset', clear ? 'bg-muted text-muted-foreground ring-border' : iconTone)}>
                    <Icon aria-hidden className="size-[1.125rem]" />
                  </span>
                  <span className="grid min-w-0 flex-1 gap-0.5">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="truncate text-[0.8125rem] text-muted-foreground">{clear ? 'Nothing to do' : hint}</span>
                  </span>
                  <span className={cn('tabular text-2xl font-semibold tracking-[-0.02em]', clear && 'text-muted-foreground/70')}>{item.value}</span>
                  <ChevronRight
                    aria-hidden
                    className="size-4 shrink-0 text-muted-foreground/60 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="today-heading" className="h-fit overflow-hidden rounded-lg border bg-card">
        <h2 id="today-heading" className="border-b px-4 py-3 text-[0.9375rem] font-semibold tracking-[-0.01em] md:px-5">
          Today
        </h2>
        <Link
          href={by.today.href}
          aria-label={`${by.today.label}: ${by.today.value}`}
          className="group grid grid-cols-2 divide-x transition-colors duration-150 hover:bg-surface"
        >
          <span className="grid gap-1 px-4 py-4 md:px-5">
            <span className="text-[0.8125rem] text-muted-foreground">Orders</span>
            <span className="tabular text-2xl font-semibold tracking-[-0.02em]">{summary.todayOrders}</span>
          </span>
          <span className="grid gap-1 px-4 py-4 md:px-5">
            <span className="text-[0.8125rem] text-muted-foreground">Order value</span>
            <span className="tabular text-2xl font-semibold tracking-[-0.02em]">{formatRM(summary.todaySales)}</span>
          </span>
        </Link>
      </section>
    </div>
  );
}

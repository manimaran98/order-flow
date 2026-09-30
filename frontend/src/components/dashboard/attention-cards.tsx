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

const TONE: Record<Tone, string> = {
  red: 'border-l-red-500',
  amber: 'border-l-amber-500',
  blue: 'border-l-blue-500',
  green: 'border-l-green-500',
};

export function AttentionCards({ summary, layout }: { summary: DashboardSummary; layout: 'stack' | 'grid' }) {
  return (
    <ul className={layout === 'stack' ? 'grid gap-2' : 'grid grid-cols-2 gap-3 lg:grid-cols-4'}>
      {attentionItems(summary).map((item) => (
        <li key={item.key}>
          <Link
            href={item.href}
            aria-label={`${item.label}: ${item.value}`}
            className={cn(
              'flex h-full rounded-lg border border-l-4 bg-card p-4 transition-colors hover:bg-muted/50',
              TONE[item.tone],
              layout === 'stack' ? 'items-center justify-between' : 'flex-col gap-1',
            )}
          >
            <span className="text-sm text-muted-foreground">{item.label}</span>
            <span className="text-lg font-semibold tabular-nums">{item.value}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

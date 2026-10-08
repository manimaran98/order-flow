import { CircleCheckBig } from 'lucide-react';
import Link from 'next/link';
import type { StockRow } from '@/lib/types';
import { cn } from '@/lib/utils';
import { PanelHeader } from './recent-orders';

export function LowStockList({ items }: { items: StockRow[] }) {
  return (
    <section aria-labelledby="lowstock-heading" className="h-fit overflow-hidden rounded-lg border bg-card shadow-xs">
      <PanelHeader id="lowstock-heading" title="Low stock" href="/inventory?low=1" linkLabel="Inventory" />
      {items.length === 0 ? (
        <p className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground md:px-5">
          <CircleCheckBig aria-hidden className="size-4 text-emerald-600" />
          Everything is above its low-stock level.
        </p>
      ) : (
        <ul className="divide-y">
          {items.map((p) => {
            const out = p.stockQuantity <= 0;
            return (
              <li key={p.id}>
                <Link href={`/products/${p.id}`} className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface md:px-5">
                  <span className="grid min-w-0 gap-0.5">
                    <span className="truncate text-sm font-medium">{p.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">{p.sku}</span>
                  </span>
                  <span className="tabular shrink-0 text-right">
                    <span className={cn('block text-[0.9375rem] font-semibold', out ? 'text-rose-700' : 'text-amber-700')}>{p.stockQuantity} left</span>
                    <span className="block text-xs text-muted-foreground">reorder at {p.lowStockThreshold}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

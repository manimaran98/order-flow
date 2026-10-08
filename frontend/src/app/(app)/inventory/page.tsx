import { CircleCheckBig, Package } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { Pagination } from '@/components/common/pagination';
import { StockList } from '@/components/inventory/stock-list';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { getCurrentUser } from '@/lib/current-user';
import type { Paginated, StockRow } from '@/lib/types';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Inventory' };

function ViewTab({ href, current, children }: { href: string; current: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={current ? 'page' : undefined}
      className={cn(
        'inline-flex h-9 items-center rounded-[calc(var(--radius-md)-2px)] px-3 text-sm font-medium transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/35 md:h-8',
        current ? 'bg-background text-foreground shadow-xs ring-1 ring-border' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </Link>
  );
}

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ low?: string; page?: string }> }) {
  const { low, page } = await searchParams;
  const onlyLow = low === '1';
  const [result, user] = await Promise.all([
    onlyLow
      ? apiFetch<StockRow[]>('/inventory/low-stock').then((data) => ({ data, meta: null }))
      : apiFetch<Paginated<StockRow>>('/inventory', { query: { page, limit: 50 } }),
    getCurrentUser(),
  ]);
  const isAdmin = user.role === 'ADMIN';
  return (
    <>
      <PageHeader
        title="Inventory"
        description={onlyLow ? 'Products at or below their low-stock level' : 'Current stock for every product'}
      />
      <nav aria-label="Inventory view" className="mb-4 inline-flex gap-0.5 rounded-md bg-muted p-0.5">
        <ViewTab href="/inventory" current={!onlyLow}>
          All products
        </ViewTab>
        <ViewTab href="/inventory?low=1" current={onlyLow}>
          Low stock only
        </ViewTab>
      </nav>
      {result.data.length === 0 ? (
        onlyLow ? (
          <EmptyState icon={CircleCheckBig} title="Nothing is low on stock" description="Every product is above its low-stock level." />
        ) : (
          <EmptyState
            icon={Package}
            title="No products yet"
            description="Stock levels show up here once products are added."
            action={
              isAdmin && (
                <Button asChild>
                  <Link href="/products/new">New product</Link>
                </Button>
              )
            }
          />
        )
      ) : (
        <StockList rows={result.data} isAdmin={isAdmin} />
      )}
      {result.meta && <Pagination meta={result.meta} pathname="/inventory" params={{ page }} />}
    </>
  );
}

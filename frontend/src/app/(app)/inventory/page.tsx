import Link from 'next/link';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { Pagination } from '@/components/common/pagination';
import { StockList } from '@/components/inventory/stock-list';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { getCurrentUser } from '@/lib/current-user';
import type { Paginated, StockRow } from '@/lib/types';

export const metadata = { title: 'Inventory' };

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ low?: string; page?: string }> }) {
  const { low, page } = await searchParams;
  const onlyLow = low === '1';
  const [result, user] = await Promise.all([
    onlyLow
      ? apiFetch<StockRow[]>('/inventory/low-stock').then((data) => ({ data, meta: null }))
      : apiFetch<Paginated<StockRow>>('/inventory', { query: { page, limit: 50 } }),
    getCurrentUser(),
  ]);
  return (
    <>
      <PageHeader
        title="Inventory"
        description={onlyLow ? 'Products at or below their low-stock level' : 'Current stock for every product'}
        actions={
          <Button asChild variant="outline">
            <Link href={onlyLow ? '/inventory' : '/inventory?low=1'}>{onlyLow ? 'Show all' : 'Low stock only'}</Link>
          </Button>
        }
      />
      {result.data.length === 0 ? (
        <EmptyState title={onlyLow ? 'Nothing is low on stock' : 'No products yet'} />
      ) : (
        <StockList rows={result.data} isAdmin={user.role === 'ADMIN'} />
      )}
      {result.meta && <Pagination meta={result.meta} pathname="/inventory" params={{ page }} />}
    </>
  );
}

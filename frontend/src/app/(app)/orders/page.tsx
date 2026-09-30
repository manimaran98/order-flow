import Link from 'next/link';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { Pagination } from '@/components/common/pagination';
import { OrderCards } from '@/components/orders/order-cards';
import { OrderFilters } from '@/components/orders/order-filters';
import { OrdersTable } from '@/components/orders/orders-table';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import type { OrderListItem, Paginated } from '@/lib/types';

export const metadata = { title: 'Orders' };

type Search = { status?: string; paymentStatus?: string; search?: string; page?: string };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { status, paymentStatus, search, page } = await searchParams;
  const params = { status, paymentStatus, search, page };
  const result = await apiFetch<Paginated<OrderListItem>>('/orders', { query: { ...params, limit: 20 } });
  const filtered = Boolean(status || paymentStatus || search);
  return (
    <>
      <PageHeader
        title="Orders"
        actions={
          <Button asChild>
            <Link href="/orders/new">New order</Link>
          </Button>
        }
      />
      <OrderFilters />
      {result.data.length === 0 ? (
        <EmptyState
          title={filtered ? 'No orders match these filters' : 'No orders yet'}
          description={filtered ? 'Try clearing a filter.' : 'Orders you take on WhatsApp or the phone go here.'}
        />
      ) : (
        <>
          <div className="md:hidden">
            <OrderCards orders={result.data} />
          </div>
          <div className="hidden md:block">
            <OrdersTable orders={result.data} />
          </div>
        </>
      )}
      <Pagination meta={result.meta} pathname="/orders" params={params} />
    </>
  );
}

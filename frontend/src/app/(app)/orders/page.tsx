import { ClipboardList, Plus, SearchX } from 'lucide-react';
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
  const total = result.meta.total;
  return (
    <>
      <PageHeader
        title="Orders"
        description={
          <span className="tabular">
            {filtered ? `${total} matching ${total === 1 ? 'order' : 'orders'}` : `${total} ${total === 1 ? 'order' : 'orders'}`}
          </span>
        }
        actions={
          <Button asChild>
            <Link href="/orders/new">
              <Plus aria-hidden />
              New order
            </Link>
          </Button>
        }
      />
      <div className="overflow-hidden rounded-lg border bg-card shadow-xs">
        <OrderFilters />
        {result.data.length === 0 ? (
          filtered ? (
            <EmptyState
              icon={SearchX}
              className="rounded-none border-0 bg-card"
              title="No orders match these filters"
              description="Try another search, or clear the filters to see every order."
              action={
                <Button asChild variant="outline">
                  <Link href="/orders">Clear filters</Link>
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={ClipboardList}
              className="rounded-none border-0 bg-card"
              title="No orders yet"
              description="Orders you take on WhatsApp or the phone go here."
              action={
                <Button asChild>
                  <Link href="/orders/new">
                    <Plus aria-hidden />
                    New order
                  </Link>
                </Button>
              }
            />
          )
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
      </div>
      <Pagination meta={result.meta} pathname="/orders" params={params} />
    </>
  );
}

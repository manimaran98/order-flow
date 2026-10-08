import { Plus } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/common/page-header';
import { AttentionCards } from '@/components/dashboard/attention-cards';
import { LowStockList } from '@/components/dashboard/low-stock-list';
import { RecentOrders } from '@/components/dashboard/recent-orders';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import type { DashboardSummary, OrderListItem, Paginated, StockRow } from '@/lib/types';

export const metadata = { title: 'Dashboard' };

const todayLabel = () =>
  new Intl.DateTimeFormat('en-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kuala_Lumpur' }).format(new Date());

export default async function DashboardPage() {
  const [summary, recent, lowStock] = await Promise.all([
    apiFetch<DashboardSummary>('/dashboard/summary'),
    apiFetch<Paginated<OrderListItem>>('/orders', { query: { limit: 5 } }),
    apiFetch<StockRow[]>('/inventory/low-stock'),
  ]);
  return (
    <>
      <PageHeader
        title="Dashboard"
        description={todayLabel()}
        actions={
          <Button asChild className="hidden md:inline-flex">
            <Link href="/orders/new">
              <Plus aria-hidden data-icon="inline-start" />
              New order
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 lg:gap-6">
        <AttentionCards summary={summary} layout="grid" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-6">
          <RecentOrders orders={recent.data} />
          <LowStockList items={lowStock} />
        </div>
      </div>
    </>
  );
}

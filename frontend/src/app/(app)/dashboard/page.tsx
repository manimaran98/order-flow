import { PageHeader } from '@/components/common/page-header';
import { AttentionCards } from '@/components/dashboard/attention-cards';
import { LowStockList } from '@/components/dashboard/low-stock-list';
import { RecentOrders } from '@/components/dashboard/recent-orders';
import { apiFetch } from '@/lib/api';
import type { DashboardSummary, OrderListItem, Paginated, StockRow } from '@/lib/types';

export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const [summary, recent, lowStock] = await Promise.all([
    apiFetch<DashboardSummary>('/dashboard/summary'),
    apiFetch<Paginated<OrderListItem>>('/orders', { query: { limit: 5 } }),
    apiFetch<StockRow[]>('/inventory/low-stock'),
  ]);
  return (
    <>
      <PageHeader title="Dashboard" description="What needs your attention" />
      <div className="md:hidden">
        <AttentionCards summary={summary} layout="stack" />
      </div>
      <div className="hidden gap-6 md:grid">
        <AttentionCards summary={summary} layout="grid" />
        <div className="grid gap-6 lg:grid-cols-2">
          <RecentOrders orders={recent.data} />
          <LowStockList items={lowStock} />
        </div>
      </div>
    </>
  );
}

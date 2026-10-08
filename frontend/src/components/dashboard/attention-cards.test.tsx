import { render, screen } from '@testing-library/react';
import type { DashboardSummary } from '@/lib/types';
import { AttentionCards, attentionItems } from './attention-cards';

const summary: DashboardSummary = {
  todayOrders: 4,
  todaySales: '310.5',
  unpaidOrders: 3,
  outstandingAmount: '8420',
  pendingOrders: 2,
  awaitingFulfilment: 5,
  lowStockProducts: 12,
  completedOrders: 83,
};

describe('AttentionCards', () => {
  it('links each number to the list that explains it', () => {
    const byKey = Object.fromEntries(attentionItems(summary).map((i) => [i.key, i]));
    expect(byKey.unpaid.href).toBe('/orders?paymentStatus=UNPAID,PARTIAL');
    expect(byKey.fulfilment.href).toBe('/orders?status=CONFIRMED,PACKING,READY');
    expect(byKey.lowstock.href).toBe('/inventory?low=1');
    expect(byKey.outstanding.value).toBe('RM 8,420.00');
  });

  it('renders accessible cards', () => {
    render(<AttentionCards summary={summary} layout="stack" />);
    expect(screen.getByRole('link', { name: 'Unpaid orders: 3' })).toHaveAttribute('href', '/orders?paymentStatus=UNPAID,PARTIAL');
    expect(screen.getByRole('link', { name: 'Pending orders: 2' })).toHaveAttribute('href', '/orders?status=PENDING');
    // Completed orders left the dashboard in the redesign: an all-time count isn't something to act on today.
    expect(screen.queryByRole('link', { name: /Completed orders/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: "Today's orders: 4 · RM 310.50" })).toBeInTheDocument();
  });
});

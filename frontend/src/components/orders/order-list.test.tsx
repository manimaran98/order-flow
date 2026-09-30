import { render, screen, within } from '@testing-library/react';
import type { OrderListItem } from '@/lib/types';
import { OrderCards } from './order-cards';
import { OrdersTable } from './orders-table';

const order: OrderListItem = {
  id: 'o1',
  orderNumber: 'ORD-20260929-0001',
  status: 'CONFIRMED',
  paymentStatus: 'PARTIAL',
  subtotal: '100.00',
  discount: '0.00',
  total: '100.00',
  paidAmount: '30.00',
  outstandingAmount: '70.00',
  notes: null,
  createdAt: '2026-09-29T03:00:00Z',
  customer: { id: 'c1', name: 'Kedai Runcit Ali' },
};

describe('order lists', () => {
  it('phone cards link to the order and show both statuses', () => {
    render(<OrderCards orders={[order]} />);
    const card = screen.getByRole('link', { name: /ORD-20260929-0001/ });
    expect(card).toHaveAttribute('href', '/orders/o1');
    expect(within(card).getByText('Confirmed')).toBeInTheDocument();
    expect(within(card).getByText('Partial')).toBeInTheDocument();
    expect(within(card).getByText('RM 100.00')).toBeInTheDocument();
  });

  it('desktop table shows the outstanding amount', () => {
    render(<OrdersTable orders={[order]} />);
    expect(screen.getByRole('link', { name: 'ORD-20260929-0001' })).toHaveAttribute('href', '/orders/o1');
    expect(screen.getByText('RM 70.00')).toBeInTheDocument();
    expect(screen.getByText('Kedai Runcit Ali')).toBeInTheDocument();
  });
});

import { OrderDetailView } from '@/components/orders/order-detail-view';
import { apiFetch, getOrNotFound } from '@/lib/api';
import { getCurrentUser } from '@/lib/current-user';
import type { OrderDetail } from '@/lib/types';

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [order, user] = await Promise.all([getOrNotFound(apiFetch<OrderDetail>(`/orders/${id}`)), getCurrentUser()]);
  return <OrderDetailView order={order} role={user.role} />;
}

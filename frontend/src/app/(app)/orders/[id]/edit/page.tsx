import { redirect } from 'next/navigation';
import { updateOrder } from '@/actions/orders';
import { PageHeader } from '@/components/common/page-header';
import { OrderComposer } from '@/components/orders/order-composer';
import type { Draft } from '@/components/orders/order-draft';
import { apiFetch, getOrNotFound } from '@/lib/api';
import { canEdit } from '@/lib/order-status';
import type { OrderDetail } from '@/lib/types';

export default async function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrNotFound(apiFetch<OrderDetail>(`/orders/${id}`));
  if (!canEdit(order.status)) redirect(`/orders/${id}`);
  const initial: Draft = {
    customer: { id: order.customer.id, name: order.customer.name },
    lines: order.items.map((i) => ({
      productId: i.productId,
      name: i.product.name,
      sku: i.product.sku,
      unitPrice: i.unitPrice,
      stock: null, // current stock is not on the order; the API warns again on save
      quantity: i.quantity,
    })),
    discount: Number(order.discount) === 0 ? '' : order.discount,
    notes: order.notes ?? '',
  };
  return (
    <>
      <PageHeader
        back={{ href: `/orders/${id}`, label: order.orderNumber }}
        title={
          <>
            Edit <span className="font-mono tracking-[-0.03em]">{order.orderNumber}</span>
          </>
        }
        description="Saving re-prices items at today's prices."
      />
      <OrderComposer mode="edit" initial={initial} submit={updateOrder.bind(null, id)} />
    </>
  );
}

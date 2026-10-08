import { createOrder } from '@/actions/orders';
import { PageHeader } from '@/components/common/page-header';
import { OrderComposer } from '@/components/orders/order-composer';

export const metadata = { title: 'New order' };

export default function NewOrderPage() {
  return (
    <>
      <PageHeader title="New order" back={{ href: '/orders', label: 'Orders' }} />
      <OrderComposer mode="create" submit={createOrder} />
    </>
  );
}

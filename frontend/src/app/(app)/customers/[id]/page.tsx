import Link from 'next/link';
import { deleteCustomer, updateCustomer } from '@/actions/customers';
import { ConfirmButton } from '@/components/common/confirm-button';
import { MoneyText } from '@/components/common/money-text';
import { PageHeader } from '@/components/common/page-header';
import { Pagination } from '@/components/common/pagination';
import { PaymentBadge, StatusBadge } from '@/components/common/status-badge';
import { CustomerForm } from '@/components/customers/customer-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiFetch, getOrNotFound } from '@/lib/api';
import { getCurrentUser } from '@/lib/current-user';
import { formatDate } from '@/lib/dates';
import type { CustomerDetail, OrderSummary, Paginated } from '@/lib/types';

export default async function CustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const { page } = await searchParams;
  const [customer, orders, user] = await Promise.all([
    getOrNotFound(apiFetch<CustomerDetail>(`/customers/${id}`)),
    getOrNotFound(apiFetch<Paginated<OrderSummary>>(`/customers/${id}/orders`, { query: { page } })),
    getCurrentUser(),
  ]);
  return (
    <>
      <PageHeader
        title={customer.name}
        description={[customer.phone, customer.email].filter(Boolean).join(' · ')}
        actions={
          user.role === 'ADMIN' && (
            <ConfirmButton
              label="Delete customer"
              title="Delete this customer?"
              description="Their past orders stay; the customer is hidden from lists and new orders."
              confirmLabel="Yes, delete"
              action={deleteCustomer.bind(null, id)}
            />
          )
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerForm action={updateCustomer.bind(null, id)} customer={customer} submitLabel="Save changes" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders yet.</p>
            ) : (
              <ul className="divide-y">
                {orders.data.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <Link href={`/orders/${o.id}`} className="font-medium underline-offset-4 hover:underline">
                      {o.orderNumber}
                    </Link>
                    <span className="text-sm text-muted-foreground">{formatDate(o.createdAt)}</span>
                    <span className="flex gap-1">
                      <StatusBadge status={o.status} />
                      <PaymentBadge status={o.paymentStatus} />
                    </span>
                    <MoneyText value={o.total} />
                  </li>
                ))}
              </ul>
            )}
            <Pagination meta={orders.meta} pathname={`/customers/${id}`} params={{ page }} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

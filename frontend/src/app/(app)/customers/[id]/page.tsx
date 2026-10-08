import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { deleteCustomer, updateCustomer } from '@/actions/customers';
import { ConfirmButton } from '@/components/common/confirm-button';
import { MoneyText } from '@/components/common/money-text';
import { PageHeader } from '@/components/common/page-header';
import { Pagination } from '@/components/common/pagination';
import { PaymentBadge, StatusBadge } from '@/components/common/status-badge';
import { CustomerForm } from '@/components/customers/customer-form';
import { EditDisclosure, Facts, Panel } from '@/components/common/panel';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiFetch, getOrNotFound } from '@/lib/api';
import { getCurrentUser } from '@/lib/current-user';
import { formatDate } from '@/lib/dates';
import type { CustomerDetail, OrderSummary, Paginated } from '@/lib/types';

const none = <span className="text-muted-foreground">—</span>;

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
  const orderCount = orders.meta.total;
  return (
    <>
      <PageHeader
        title={customer.name}
        back={{ href: '/customers', label: 'Customers' }}
        actions={
          user.role === 'ADMIN' && (
            <ConfirmButton
              label="Delete customer"
              title="Delete this customer?"
              description="Their past orders stay; the customer is hidden from lists and new orders."
              confirmLabel="Yes, delete"
              variant="destructive"
              action={deleteCustomer.bind(null, id)}
            />
          )
        }
      />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-6">
        <Panel title="Details" id="details-heading" className="lg:col-start-2 lg:row-start-1">
          <Facts
            items={[
              {
                label: 'Phone',
                value: customer.phone ? (
                  <a href={`tel:${customer.phone.replace(/[^0-9+]/g, '')}`} className="tabular text-primary underline-offset-4 hover:underline">
                    {customer.phone}
                  </a>
                ) : (
                  none
                ),
              },
              { label: 'Email', value: customer.email || none },
              { label: 'Address', value: customer.address ? <span className="whitespace-pre-line">{customer.address}</span> : none },
              { label: 'Notes', value: customer.notes ? <span className="whitespace-pre-line">{customer.notes}</span> : none },
              { label: 'Orders', value: orderCount, numeric: true },
              { label: 'Customer since', value: formatDate(customer.createdAt), numeric: true },
            ]}
          />
        </Panel>

        <div className="grid gap-4 lg:col-start-1 lg:row-start-1 lg:gap-6">
          <Panel
            title="Orders"
            id="orders-heading"
            action={<span className="tabular text-[0.8125rem] text-muted-foreground">{orderCount === 1 ? '1 order' : `${orderCount} orders`}</span>}
          >
            {orders.data.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground md:px-5">No orders yet. Orders for {customer.name} will show up here.</p>
            ) : (
              <>
                <div className="hidden md:block md:[&_td:first-child]:pl-5 md:[&_th:first-child]:pl-5 md:[&_td:last-child]:pr-5 md:[&_th:last-child]:pr-5">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.data.map((o) => (
                        <TableRow key={o.id} className="relative">
                          <TableCell>
                            <Link
                              href={`/orders/${o.id}`}
                              className="font-mono text-[0.8125rem] font-medium text-foreground outline-none after:absolute after:inset-0 hover:text-primary focus-visible:after:ring-3 focus-visible:after:ring-ring/35 focus-visible:after:ring-inset"
                            >
                              {o.orderNumber}
                            </Link>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(o.createdAt)}</TableCell>
                          <TableCell>
                            <span className="flex gap-1.5">
                              <StatusBadge status={o.status} />
                              <PaymentBadge status={o.paymentStatus} />
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            <MoneyText value={o.total} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <ul className="divide-y md:hidden">
                  {orders.data.map((o) => (
                    <li key={o.id}>
                      <Link href={`/orders/${o.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 active:bg-surface">
                        <span className="grid min-w-0 flex-1 gap-2">
                          <span className="flex items-baseline justify-between gap-3">
                            <span className="font-mono text-[0.8125rem] font-medium">{o.orderNumber}</span>
                            <MoneyText value={o.total} className="text-sm font-semibold" />
                          </span>
                          <span className="flex items-center justify-between gap-3">
                            <span className="text-xs text-muted-foreground">{formatDate(o.createdAt)}</span>
                            <span className="flex gap-1.5">
                              <StatusBadge status={o.status} />
                              <PaymentBadge status={o.paymentStatus} />
                            </span>
                          </span>
                        </span>
                        <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {orders.meta.totalPages > 1 && (
              <div className="border-t px-4 pb-3 md:px-5 [&>nav]:pt-3">
                <Pagination meta={orders.meta} pathname={`/customers/${id}`} params={{ page }} />
              </div>
            )}
          </Panel>
          <EditDisclosure title="Edit details">
            <CustomerForm action={updateCustomer.bind(null, id)} customer={customer} submitLabel="Save changes" />
          </EditDisclosure>
        </div>
      </div>
    </>
  );
}

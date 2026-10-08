import { Plus, SearchX, Users } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { Pagination } from '@/components/common/pagination';
import { SearchInput } from '@/components/common/search-input';
import { CustomerList } from '@/components/customers/customer-list';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import type { Customer, Paginated } from '@/lib/types';

export const metadata = { title: 'Customers' };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ search?: string; page?: string }> }) {
  const { search, page } = await searchParams;
  const result = await apiFetch<Paginated<Customer>>('/customers', { query: { search, page, limit: 20 } });
  const total = result.meta.total;
  return (
    <>
      <PageHeader
        title="Customers"
        description={total === 1 ? '1 customer' : `${total.toLocaleString('en-MY')} customers`}
        actions={
          <Button asChild>
            <Link href="/customers/new">
              <Plus aria-hidden data-icon="inline-start" />
              New customer
            </Link>
          </Button>
        }
      />
      <div className="mb-4 max-w-md">
        <SearchInput label="Search customers" />
      </div>
      {result.data.length === 0 ? (
        search ? (
          <EmptyState icon={SearchX} title="No customers found" description="Try a different name, phone or email." />
        ) : (
          <EmptyState
            icon={Users}
            title="No customers yet"
            description="Add the shops and people you take orders from, so you can pick them in a tap."
            action={
              <Button asChild>
                <Link href="/customers/new">
                  <Plus aria-hidden data-icon="inline-start" />
                  New customer
                </Link>
              </Button>
            }
          />
        )
      ) : (
        <CustomerList customers={result.data} />
      )}
      <Pagination meta={result.meta} pathname="/customers" params={{ search, page }} />
    </>
  );
}

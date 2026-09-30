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
  return (
    <>
      <PageHeader
        title="Customers"
        actions={
          <Button asChild>
            <Link href="/customers/new">New customer</Link>
          </Button>
        }
      />
      <div className="mb-4 max-w-md">
        <SearchInput label="Search customers" />
      </div>
      {result.data.length === 0 ? (
        <EmptyState title="No customers found" description={search ? 'Try a different name, phone or email.' : 'Add your first customer.'} />
      ) : (
        <CustomerList customers={result.data} />
      )}
      <Pagination meta={result.meta} pathname="/customers" params={{ search, page }} />
    </>
  );
}

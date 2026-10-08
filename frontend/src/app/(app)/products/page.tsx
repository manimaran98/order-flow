import Link from 'next/link';
import { EmptyState } from '@/components/common/empty-state';
import { FilterSelect } from '@/components/common/filter-select';
import { PageHeader } from '@/components/common/page-header';
import { Pagination } from '@/components/common/pagination';
import { SearchInput } from '@/components/common/search-input';
import { ProductList } from '@/components/products/product-list';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { getCurrentUser } from '@/lib/current-user';
import type { Paginated, Product } from '@/lib/types';

export const metadata = { title: 'Products' };

type Search = { search?: string; active?: string; lowStock?: string; page?: string };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const [result, user] = await Promise.all([
    apiFetch<Paginated<Product>>('/products', { query: { ...params, limit: 20 } }),
    getCurrentUser(),
  ]);
  return (
    <>
      <PageHeader
        title="Products"
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/catalog" target="_blank" rel="noopener noreferrer">
                View public catalog
              </Link>
            </Button>
            {user.role === 'ADMIN' && (
              <Button asChild>
                <Link href="/products/new">New product</Link>
              </Button>
            )}
          </>
        }
      />
      <div className="mb-4 grid gap-2 sm:grid-cols-[2fr_1fr_1fr]">
        <div className="self-end">
          <SearchInput label="Search products" />
        </div>
        <FilterSelect
          label="Status"
          param="active"
          options={[
            { value: '', label: 'All' },
            { value: 'true', label: 'Active' },
            { value: 'false', label: 'Inactive' },
          ]}
        />
        <FilterSelect
          label="Stock"
          param="lowStock"
          options={[
            { value: '', label: 'All stock levels' },
            { value: 'true', label: 'Low stock only' },
          ]}
        />
      </div>
      {result.data.length === 0 ? <EmptyState title="No products found" /> : <ProductList products={result.data} />}
      <Pagination meta={result.meta} pathname="/products" params={params} />
    </>
  );
}

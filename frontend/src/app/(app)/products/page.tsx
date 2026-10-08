import { ExternalLink, Package, Plus, SearchX } from 'lucide-react';
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
  const isAdmin = user.role === 'ADMIN';
  const filtered = Boolean(params.search || params.active || params.lowStock);
  const total = result.meta.total;
  return (
    <>
      <PageHeader
        title="Products"
        description={total === 1 ? '1 product' : `${total.toLocaleString('en-MY')} products`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/catalog" target="_blank" rel="noopener noreferrer">
                View public catalog
                <ExternalLink aria-hidden data-icon="inline-end" className="text-muted-foreground" />
              </Link>
            </Button>
            {isAdmin && (
              <Button asChild>
                <Link href="/products/new">
                  <Plus aria-hidden data-icon="inline-start" />
                  New product
                </Link>
              </Button>
            )}
          </>
        }
      />
      <div className="mb-4 grid max-w-3xl items-end gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <SearchInput label="Search products" />
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
      {result.data.length === 0 ? (
        filtered ? (
          <EmptyState icon={SearchX} title="No products found" description="Try a different search or clear the filters." />
        ) : (
          <EmptyState
            icon={Package}
            title="No products yet"
            description={isAdmin ? 'Add what you sell, with its price and opening stock.' : 'An admin adds products and prices.'}
            action={
              isAdmin && (
                <Button asChild>
                  <Link href="/products/new">
                    <Plus aria-hidden data-icon="inline-start" />
                    New product
                  </Link>
                </Button>
              )
            }
          />
        )
      ) : (
        <ProductList products={result.data} />
      )}
      <Pagination meta={result.meta} pathname="/products" params={params} />
    </>
  );
}

import type { Metadata } from 'next';
import { CatalogBrowser } from '@/components/catalog/catalog-browser';
import { Package, RefreshCw } from 'lucide-react';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { getCatalog } from '@/lib/public-api';

// ISR: served from the cache and regenerated in the background at most every 5 minutes
// (CATALOG_REVALIDATE_SECONDS). Segment config must be a literal.
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Product catalog',
  description: 'Browse our products and prices.',
};

export default async function CatalogPage() {
  const products = await getCatalog();
  return (
    <>
      <PageHeader title="Our products" description="Prices in Ringgit Malaysia. Message us to order." />
      {products === null ? (
        <EmptyState icon={RefreshCw} title="The catalog is being updated" description="Please check back in a few minutes." className="bg-card" />
      ) : products.length === 0 ? (
        <EmptyState icon={Package} title="No products yet" description="Please check back soon." className="bg-card" />
      ) : (
        <CatalogBrowser products={products} />
      )}
    </>
  );
}

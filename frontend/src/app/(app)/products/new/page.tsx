import { createProduct } from '@/actions/products';
import { AdminOnly } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { ProductForm } from '@/components/products/product-form';
import { getCurrentUser } from '@/lib/current-user';

export const metadata = { title: 'New product' };

export default async function NewProductPage() {
  const user = await getCurrentUser();
  if (user.role !== 'ADMIN') return <AdminOnly />;
  return (
    <>
      <PageHeader title="New product" back={{ href: '/products', label: 'Products' }} />
      <div className="max-w-2xl overflow-hidden rounded-lg border bg-card">
        <ProductForm action={createProduct} submitLabel="Save product" cancelHref="/products" />
      </div>
    </>
  );
}

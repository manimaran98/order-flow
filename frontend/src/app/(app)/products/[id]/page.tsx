import { deactivateProduct, updateProduct } from '@/actions/products';
import { ConfirmButton } from '@/components/common/confirm-button';
import { MoneyText } from '@/components/common/money-text';
import { PageHeader } from '@/components/common/page-header';
import { Pagination } from '@/components/common/pagination';
import { ProductForm } from '@/components/products/product-form';
import { StockLedger } from '@/components/products/stock-ledger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiFetch, getOrNotFound } from '@/lib/api';
import { getCurrentUser } from '@/lib/current-user';
import type { Ledger, Product } from '@/lib/types';

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const { page } = await searchParams;
  const [product, ledger, user] = await Promise.all([
    getOrNotFound(apiFetch<Product>(`/products/${id}`)),
    getOrNotFound(apiFetch<Ledger>(`/inventory/${id}`, { query: { page } })),
    getCurrentUser(),
  ]);
  const isAdmin = user.role === 'ADMIN';
  return (
    <>
      <PageHeader
        title={product.name}
        description={`${product.sku}${product.isActive ? '' : ' · inactive'}`}
        actions={
          isAdmin &&
          product.isActive && (
            <ConfirmButton
              label="Deactivate"
              title="Deactivate this product?"
              description="It stays on past orders but can't be added to new ones."
              confirmLabel="Yes, deactivate"
              successMessage="Product deactivated"
              action={deactivateProduct.bind(null, id)}
            />
          )
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{isAdmin ? 'Details' : 'Price and stock'}</CardTitle>
          </CardHeader>
          <CardContent>
            {isAdmin ? (
              <ProductForm action={updateProduct.bind(null, id)} product={product} submitLabel="Save changes" />
            ) : (
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <dt className="text-muted-foreground">Price</dt>
                <dd>
                  <MoneyText value={product.sellingPrice} />
                </dd>
                <dt className="text-muted-foreground">In stock</dt>
                <dd>{product.stockQuantity}</dd>
              </dl>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Stock history</CardTitle>
          </CardHeader>
          <CardContent>
            <StockLedger rows={ledger.transactions.data} />
            <Pagination meta={ledger.transactions.meta} pathname={`/products/${id}`} params={{ page }} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

import { deactivateProduct, updateProduct } from '@/actions/products';
import { ConfirmButton } from '@/components/common/confirm-button';
import { MoneyText } from '@/components/common/money-text';
import { PageHeader } from '@/components/common/page-header';
import { Pagination } from '@/components/common/pagination';
import { Pill, StockPill, stockFigureClass, stockLevel } from '@/components/common/pill';
import { EditDisclosure, Facts, Panel } from '@/components/common/panel';
import { ProductForm } from '@/components/products/product-form';
import { StockLedger } from '@/components/products/stock-ledger';
import { apiFetch, getOrNotFound } from '@/lib/api';
import { getCurrentUser } from '@/lib/current-user';
import type { Ledger, Product } from '@/lib/types';
import { cn } from '@/lib/utils';

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
  const level = stockLevel(product);
  const movements = ledger.transactions.meta.total;
  return (
    <>
      <PageHeader
        title={product.name}
        back={{ href: '/products', label: 'Products' }}
        description={<span className="font-mono text-[0.8125rem]">{product.sku}</span>}
        meta={
          <>
            {!product.isActive && <Pill tone="zinc">Inactive</Pill>}
            <StockPill level={level} />
          </>
        }
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
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-6">
        <Panel title="Price and stock" id="facts-heading" className="lg:col-start-2 lg:row-start-1">
          <Facts
            items={[
              { label: 'Selling price', value: <MoneyText value={product.sellingPrice} className="font-medium" /> },
              ...(isAdmin ? [{ label: 'Cost price', value: <MoneyText value={product.costPrice} /> }] : []),
              {
                label: 'In stock',
                numeric: true,
                value: <span className={cn('font-semibold', stockFigureClass[level])}>{product.stockQuantity}</span>,
              },
              { label: 'Reorder at', value: product.lowStockThreshold, numeric: true },
              { label: 'Status', value: product.isActive ? 'Active' : 'Inactive' },
            ]}
          />
          {product.description && <p className="border-t px-4 py-3 text-sm text-pretty text-muted-foreground md:px-5">{product.description}</p>}
        </Panel>

        <div className="grid gap-4 lg:col-start-1 lg:row-start-1 lg:gap-6">
          <Panel
            title="Stock history"
            id="ledger-heading"
            action={<span className="tabular text-[0.8125rem] text-muted-foreground">{movements === 1 ? '1 movement' : `${movements} movements`}</span>}
          >
            <StockLedger rows={ledger.transactions.data} />
            {ledger.transactions.meta.totalPages > 1 && (
              <div className="border-t px-4 pb-3 md:px-5 [&>nav]:pt-3">
                <Pagination meta={ledger.transactions.meta} pathname={`/products/${id}`} params={{ page }} />
              </div>
            )}
          </Panel>
          {isAdmin && (
            <EditDisclosure title="Edit product">
              <ProductForm action={updateProduct.bind(null, id)} product={product} submitLabel="Save changes" />
            </EditDisclosure>
          )}
        </div>
      </div>
    </>
  );
}

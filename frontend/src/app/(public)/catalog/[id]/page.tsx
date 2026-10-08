import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StockBadge } from '@/components/catalog/stock-badge';
import { MoneyText } from '@/components/common/money-text';
import { Button } from '@/components/ui/button';
import { getCatalogItem } from '@/lib/public-api';

// ISR, see ../page.tsx. Nothing is prerendered at build (the API may be unreachable there):
// each product page is generated on its first request, cached, then revalidated.
export const revalidate = 300;

export function generateStaticParams(): { id: string }[] {
  return [];
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getCatalogItem((await params).id); // fetch is memoized with the page's call
  return product ? { title: product.name, description: product.description ?? undefined } : {};
}

export default async function CatalogProductPage({ params }: Props) {
  const product = await getCatalogItem((await params).id);
  if (!product) notFound();
  return (
    <div className="grid gap-4">
      <Link href="/catalog" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
        ← All products
      </Link>
      <article className="grid gap-4 rounded-xl border bg-card p-4 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-xl font-semibold md:text-2xl">{product.name}</h1>
          <StockBadge inStock={product.inStock} />
        </div>
        <MoneyText value={product.sellingPrice} className="text-2xl font-semibold" />
        {product.description && <p className="whitespace-pre-line text-muted-foreground">{product.description}</p>}
      </article>
      <Button asChild variant="outline" className="w-full md:w-fit">
        <Link href="/catalog">Browse more products</Link>
      </Button>
    </div>
  );
}

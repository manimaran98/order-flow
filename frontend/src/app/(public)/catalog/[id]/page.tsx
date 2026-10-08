import { MessageCircle } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StockBadge } from '@/components/catalog/stock-badge';
import { MoneyText } from '@/components/common/money-text';
import { PageHeader } from '@/components/common/page-header';
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
    <div className="mx-auto max-w-2xl">
      <PageHeader title={product.name} back={{ href: '/catalog', label: 'All products' }} />
      <article aria-label={product.name} className="overflow-hidden rounded-lg border bg-card">
        <div className="grid gap-5 p-5 md:p-6">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <MoneyText value={product.sellingPrice} className="text-3xl font-semibold tracking-[-0.02em]" />
            <StockBadge inStock={product.inStock} />
          </div>
          {product.description && (
            <p className="max-w-[65ch] border-t pt-5 text-[0.9375rem] leading-relaxed whitespace-pre-line text-foreground/80">{product.description}</p>
          )}
        </div>
        <div className="flex items-start gap-3 border-t bg-surface px-5 py-4 md:px-6">
          <MessageCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="grid gap-0.5 text-sm">
            <p className="font-medium">Contact the shop to order</p>
            <p className="text-muted-foreground">Message the shop that shared this link, and mention “{product.name}”.</p>
          </div>
        </div>
      </article>
      <Button asChild variant="outline" className="mt-5 w-full md:w-fit">
        <Link href="/catalog">Browse more products</Link>
      </Button>
    </div>
  );
}

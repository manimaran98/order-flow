'use client';

import Link from 'next/link';
import { useState } from 'react';
import { EmptyState } from '@/components/common/empty-state';
import { MoneyText } from '@/components/common/money-text';
import { Input } from '@/components/ui/input';
import type { CatalogItem } from '@/lib/types';
import { StockBadge } from './stock-badge';

/**
 * Search and browse the prerendered catalog. Filtering happens in the browser:
 * reading `searchParams` on the server would make the ISR page dynamic.
 */
export function CatalogBrowser({ products }: { products: CatalogItem[] }) {
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const shown = needle ? products.filter((p) => p.name.toLowerCase().includes(needle)) : products;

  return (
    <div className="grid gap-4">
      <Input
        type="search"
        aria-label="Search products"
        placeholder="Search products"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {shown.length === 0 ? (
        <EmptyState title={`No products match “${query.trim()}”`} description="Try a shorter or different word." />
      ) : (
        <>
          <ul aria-label="Products" className="grid gap-2 md:hidden">
            {shown.map((p) => (
              <li key={p.id}>
                <Link href={`/catalog/${p.id}`} className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3">
                  <span className="min-w-0 font-medium">{p.name}</span>
                  <span className="shrink-0 text-right">
                    <MoneyText value={p.sellingPrice} className="block font-medium" />
                    <StockBadge inStock={p.inStock} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <ul aria-label="Products (grid)" className="hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-3">
            {shown.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/catalog/${p.id}`}
                  className="flex h-full flex-col gap-2 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50"
                >
                  <span className="font-medium">{p.name}</span>
                  {p.description && <span className="line-clamp-2 text-sm text-muted-foreground">{p.description}</span>}
                  <span className="mt-auto flex items-center justify-between pt-2">
                    <MoneyText value={p.sellingPrice} className="text-lg font-semibold" />
                    <StockBadge inStock={p.inStock} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

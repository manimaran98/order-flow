'use client';

import { ChevronRight, Search } from 'lucide-react';
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
 *
 * One divided list serves both screen sizes; only the row's arrangement changes.
 */
export function CatalogBrowser({ products }: { products: CatalogItem[] }) {
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const shown = needle ? products.filter((p) => p.name.toLowerCase().includes(needle)) : products;

  return (
    <section aria-label="Product list" className="overflow-hidden rounded-lg border bg-card shadow-xs">
      <div className="flex items-center gap-3 border-b px-3 py-3 md:px-5">
        <div className="relative min-w-0 flex-1 md:max-w-sm">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Search products"
            placeholder="Search products"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <p aria-live="polite" className="tabular ml-auto shrink-0 text-[0.8125rem] text-muted-foreground">
          {needle ? `${shown.length} of ${products.length}` : `${products.length} ${products.length === 1 ? 'product' : 'products'}`}
        </p>
      </div>
      {shown.length === 0 ? (
        <EmptyState
          icon={Search}
          title={`No products match “${query.trim()}”`}
          description="Try a shorter or different word."
          className="rounded-none border-0 bg-transparent"
        />
      ) : (
        <ul aria-label="Products" className="divide-y">
          {shown.map((p) => (
            <li key={p.id}>
              <Link
                href={`/catalog/${p.id}`}
                className="group flex items-center gap-3 px-4 py-3.5 transition-colors duration-150 ease-out outline-none hover:bg-surface focus-visible:bg-surface focus-visible:ring-3 focus-visible:ring-ring/35 focus-visible:ring-inset active:bg-surface md:gap-6 md:px-5"
              >
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="line-clamp-2 text-[0.9375rem] font-medium md:truncate md:text-sm">{p.name}</span>
                  {p.description && <span className="truncate text-[0.8125rem] text-muted-foreground">{p.description}</span>}
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1.5 md:flex-row-reverse md:items-center md:gap-6">
                  <MoneyText value={p.sellingPrice} className="text-[0.9375rem] font-semibold md:w-28 md:text-right md:text-sm" />
                  <StockBadge inStock={p.inStock} />
                </span>
                <ChevronRight
                  aria-hidden
                  className="-mr-1 size-4 shrink-0 text-muted-foreground/70 transition-transform duration-150 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

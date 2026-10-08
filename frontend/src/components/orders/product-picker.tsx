'use client';

import { Loader2, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { searchProducts } from '@/actions/products';
import { MoneyText } from '@/components/common/money-text';
import { Input } from '@/components/ui/input';
import type { Product } from '@/lib/types';
import { useDebouncedSearch } from '@/lib/use-debounced-search';
import { cn } from '@/lib/utils';

export function ProductPicker({ onAdd }: { onAdd: (p: Product) => void }) {
  const [query, setQuery] = useState('');
  const { results, loading } = useDebouncedSearch(query, searchProducts);
  return (
    <div className="grid gap-2">
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label="Search products"
          placeholder="Search products by name or SKU"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pr-9 pl-9"
        />
        {loading && (
          <Loader2 aria-hidden className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
      {loading && <span className="sr-only">Searching…</span>}
      {results.length > 0 && (
        <ul className="divide-y rounded-md border bg-card">
          {results.map((p) => {
            const out = p.stockQuantity <= 0;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  aria-label={`Add ${p.name}`}
                  onClick={() => onAdd(p)}
                  className="group flex min-h-12 w-full items-center gap-3 px-3 py-2.5 text-left outline-none transition-colors duration-150 hover:bg-surface focus-visible:bg-surface focus-visible:ring-3 focus-visible:ring-ring/35 focus-visible:ring-inset active:bg-surface"
                >
                  <span className="grid min-w-0 flex-1 gap-0.5">
                    <span className="text-sm font-medium text-pretty">{p.name}</span>
                    <span className="text-xs text-muted-foreground">
                      <span className="font-mono">{p.sku}</span>
                      <span className="mx-1.5" aria-hidden>
                        ·
                      </span>
                      <span className={cn('tabular', out && 'font-medium text-amber-700')}>{out ? 'Out of stock' : `${p.stockQuantity} in stock`}</span>
                    </span>
                  </span>
                  <MoneyText value={p.sellingPrice} className="text-sm" />
                  <span
                    aria-hidden
                    className="grid size-7 shrink-0 place-items-center rounded-md border bg-background text-muted-foreground transition-colors duration-150 group-hover:border-primary/40 group-hover:text-primary"
                  >
                    <Plus className="size-4" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

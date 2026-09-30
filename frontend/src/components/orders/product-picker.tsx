'use client';

import { useState } from 'react';
import { searchProducts } from '@/actions/products';
import { MoneyText } from '@/components/common/money-text';
import { Input } from '@/components/ui/input';
import type { Product } from '@/lib/types';
import { useDebouncedSearch } from '@/lib/use-debounced-search';

export function ProductPicker({ onAdd }: { onAdd: (p: Product) => void }) {
  const [query, setQuery] = useState('');
  const { results, loading } = useDebouncedSearch(query, searchProducts);
  return (
    <div className="grid gap-2">
      <Input type="search" aria-label="Search products" placeholder="Search products by name or SKU" value={query} onChange={(e) => setQuery(e.target.value)} />
      {loading && <p className="text-sm text-muted-foreground">Searching…</p>}
      {results.length > 0 && (
        <ul className="grid gap-1">
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                aria-label={`Add ${p.name}`}
                onClick={() => onAdd(p)}
                className="flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left hover:bg-muted"
              >
                <span>
                  <span className="font-medium">{p.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {p.sku} · {p.stockQuantity} in stock
                  </span>
                </span>
                <MoneyText value={p.sellingPrice} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

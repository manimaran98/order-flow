'use client';

import { Loader2, Search, UserPlus } from 'lucide-react';
import { useState, useTransition } from 'react';
import { quickAddCustomer, searchCustomers } from '@/actions/customers';
import { Field, FormError } from '@/components/common/field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDebouncedSearch } from '@/lib/use-debounced-search';
import type { Draft } from './order-draft';

function Initials({ name }: { name: string }) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  return (
    <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
      {letters}
    </span>
  );
}

export function CustomerPicker({ selected, onSelect }: { selected: Draft['customer']; onSelect: (c: Draft['customer']) => void }) {
  const [query, setQuery] = useState('');
  const { results, loading } = useDebouncedSearch(query, searchCustomers);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (selected) {
    return (
      <div className="flex items-center gap-3">
        <Initials name={selected.name} />
        <p className="min-w-0 flex-1 truncate text-sm font-medium">{selected.name}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => onSelect(null)}>
          Change
        </Button>
      </div>
    );
  }

  const add = () =>
    startTransition(async () => {
      setError(null);
      const r = await quickAddCustomer({ name, phone });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      onSelect({ id: r.data.id, name: r.data.name });
      setAdding(false);
      setName('');
      setPhone('');
    });

  return (
    <div className="grid gap-2">
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label="Search customers"
          placeholder="Search customers by name or phone"
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
        <ul className="max-h-72 divide-y overflow-y-auto overscroll-contain rounded-md border bg-card shadow-xs">
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onSelect({ id: c.id, name: c.name })}
                className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left outline-none transition-colors duration-150 hover:bg-surface focus-visible:bg-surface focus-visible:ring-3 focus-visible:ring-ring/35 focus-visible:ring-inset active:bg-surface"
              >
                <Initials name={c.name} />
                <span className="grid min-w-0 gap-0.5">
                  <span className="truncate text-sm font-medium">{c.name}</span>
                  {c.phone && <span className="tabular text-xs text-muted-foreground">{c.phone}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {adding ? (
        <div className="mt-1 grid gap-3 rounded-md border bg-surface/60 p-3">
          <Field label="New customer name" name="newCustomerName" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <Field label="New customer phone" name="newCustomerPhone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <FormError message={error} />
          <div className="flex gap-2">
            <Button type="button" disabled={pending || !name.trim()} onClick={add}>
              {pending && <Loader2 aria-hidden className="animate-spin" />}
              Add customer
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="ghost" className="justify-self-start px-2 text-primary hover:text-primary" onClick={() => setAdding(true)}>
          <UserPlus aria-hidden />
          Add new customer
        </Button>
      )}
    </div>
  );
}

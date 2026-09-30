'use client';

import { useState, useTransition } from 'react';
import { quickAddCustomer, searchCustomers } from '@/actions/customers';
import { Field, FormError } from '@/components/common/field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDebouncedSearch } from '@/lib/use-debounced-search';
import type { Draft } from './order-draft';

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
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-xs text-muted-foreground">Customer</p>
          <p className="font-medium">{selected.name}</p>
        </div>
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
      <Input
        type="search"
        aria-label="Search customers"
        placeholder="Search customers by name or phone"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {loading && <p className="text-sm text-muted-foreground">Searching…</p>}
      {results.length > 0 && (
        <ul className="grid gap-1">
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onSelect({ id: c.id, name: c.name })}
                className="w-full rounded-md border px-3 py-2 text-left hover:bg-muted"
              >
                <span className="font-medium">{c.name}</span>
                {c.phone && <span className="ml-2 text-sm text-muted-foreground">{c.phone}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {adding ? (
        <div className="grid gap-2 rounded-lg border p-3">
          <Field label="New customer name" name="newCustomerName" value={name} onChange={(e) => setName(e.target.value)} />
          <Field label="New customer phone" name="newCustomerPhone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <FormError message={error} />
          <div className="flex gap-2">
            <Button type="button" disabled={pending || !name.trim()} onClick={add}>
              Add customer
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="link" className="justify-self-start px-0" onClick={() => setAdding(true)}>
          + Add new customer
        </Button>
      )}
    </div>
  );
}

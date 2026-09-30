'use server';

import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import type { Customer, Paginated } from '@/lib/types';
import { text, textOrNull } from './form';
import { refreshAll, run, type ActionResult } from './result';

function customerBody(fd: FormData, updating: boolean) {
  const optional = updating ? textOrNull : text; // blank clears on update, is omitted on create
  return {
    name: text(fd, 'name'),
    phone: optional(fd, 'phone'),
    email: optional(fd, 'email'),
    address: optional(fd, 'address'),
    notes: optional(fd, 'notes'),
  };
}

export async function createCustomer(_: unknown, fd: FormData): Promise<ActionResult> {
  const r = await run(() => apiFetch<Customer>('/customers', { method: 'POST', body: customerBody(fd, false) }));
  if (!r.ok) return r;
  refreshAll();
  redirect(`/customers/${r.data.id}`);
}

export async function updateCustomer(id: string, _: unknown, fd: FormData): Promise<ActionResult> {
  const r = await run(() => apiFetch<Customer>(`/customers/${id}`, { method: 'PATCH', body: customerBody(fd, true) }));
  if (!r.ok) return r;
  refreshAll();
  return { ok: true, data: undefined };
}

export async function deleteCustomer(id: string): Promise<ActionResult> {
  const r = await run(() => apiFetch(`/customers/${id}`, { method: 'DELETE' }));
  if (!r.ok) return r;
  refreshAll();
  redirect('/customers');
}

export async function searchCustomers(query: string): Promise<Customer[]> {
  if (!query.trim()) return [];
  const r = await apiFetch<Paginated<Customer>>('/customers', { query: { search: query.trim(), limit: 8 } });
  return r.data;
}

/** Inline "new WhatsApp customer" from the order composer. */
export async function quickAddCustomer(input: { name: string; phone?: string }): Promise<ActionResult<Customer>> {
  const r = await run(() =>
    apiFetch<Customer>('/customers', {
      method: 'POST',
      body: { name: input.name.trim(), phone: input.phone?.trim() || undefined },
    }),
  );
  if (r.ok) refreshAll();
  return r;
}

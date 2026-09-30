'use server';

import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import type { Paginated, Product } from '@/lib/types';
import { num, text, textOrNull } from './form';
import { refreshAll, run, type ActionResult } from './result';

function productBody(fd: FormData, creating: boolean) {
  return {
    name: text(fd, 'name'),
    sku: text(fd, 'sku'),
    description: creating ? text(fd, 'description') : textOrNull(fd, 'description'),
    sellingPrice: num(fd, 'sellingPrice'),
    costPrice: num(fd, 'costPrice'),
    lowStockThreshold: num(fd, 'lowStockThreshold'),
    ...(creating && { stockQuantity: num(fd, 'stockQuantity') }),
  };
}

export async function createProduct(_: unknown, fd: FormData): Promise<ActionResult> {
  const r = await run(() => apiFetch<Product>('/products', { method: 'POST', body: productBody(fd, true) }));
  if (!r.ok) return r;
  refreshAll();
  redirect(`/products/${r.data.id}`);
}

export async function updateProduct(id: string, _: unknown, fd: FormData): Promise<ActionResult> {
  const r = await run(() => apiFetch<Product>(`/products/${id}`, { method: 'PATCH', body: productBody(fd, false) }));
  if (!r.ok) return r;
  refreshAll();
  return { ok: true, data: undefined };
}

export async function deactivateProduct(id: string): Promise<ActionResult> {
  const r = await run(() => apiFetch(`/products/${id}`, { method: 'DELETE' }));
  if (!r.ok) return r;
  refreshAll();
  return { ok: true, data: undefined };
}

export async function searchProducts(query: string): Promise<Product[]> {
  if (!query.trim()) return [];
  const r = await apiFetch<Paginated<Product>>('/products', { query: { search: query.trim(), active: true, limit: 10 } });
  return r.data;
}

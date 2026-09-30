'use server';

import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import type { OrderDetail, OrderInput, OrderStatus, StockWarning } from '@/lib/types';
import { refreshAll, run, type ActionResult } from './result';

type Saved = { id: string; stockWarnings: StockWarning[] };

export async function createOrder(input: OrderInput): Promise<ActionResult<Saved>> {
  const r = await run(() => apiFetch<OrderDetail & { stockWarnings: StockWarning[] }>('/orders', { method: 'POST', body: input }));
  if (!r.ok) return r;
  refreshAll();
  return { ok: true, data: { id: r.data.id, stockWarnings: r.data.stockWarnings } };
}

export async function updateOrder(id: string, input: OrderInput): Promise<ActionResult<Saved>> {
  const r = await run(() => apiFetch<OrderDetail>(`/orders/${id}`, { method: 'PATCH', body: input }));
  if (!r.ok) return r;
  refreshAll();
  return { ok: true, data: { id, stockWarnings: [] } };
}

export async function changeOrderStatus(id: string, status: OrderStatus): Promise<ActionResult> {
  const r = await run(() => apiFetch(`/orders/${id}/status`, { method: 'PATCH', body: { status } }));
  if (!r.ok) return r;
  refreshAll();
  return { ok: true, data: undefined };
}

export async function deleteOrder(id: string): Promise<ActionResult> {
  const r = await run(() => apiFetch(`/orders/${id}`, { method: 'DELETE' }));
  if (!r.ok) return r;
  refreshAll();
  redirect('/orders');
}

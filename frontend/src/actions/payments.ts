'use server';

import { apiFetch } from '@/lib/api';
import { paidAtForApi } from '@/lib/dates';
import { num, text } from './form';
import { refreshAll, run, type ActionResult } from './result';

export async function recordPayment(orderId: string, _: unknown, fd: FormData): Promise<ActionResult> {
  const r = await run(() =>
    apiFetch('/payments', {
      method: 'POST',
      body: {
        orderId,
        amount: num(fd, 'amount'),
        method: text(fd, 'method'),
        reference: text(fd, 'reference'),
        paidAt: paidAtForApi(text(fd, 'paidAt')),
      },
    }),
  );
  if (!r.ok) return r;
  refreshAll();
  return { ok: true, data: undefined };
}

'use server';

import { apiFetch } from '@/lib/api';
import { num, text } from './form';
import { refreshAll, run, type ActionResult } from './result';

export async function adjustStock(_: unknown, fd: FormData): Promise<ActionResult> {
  const r = await run(() =>
    apiFetch('/inventory/adjustments', {
      method: 'POST',
      body: { productId: text(fd, 'productId'), type: text(fd, 'type'), quantity: num(fd, 'quantity'), note: text(fd, 'note') },
    }),
  );
  if (!r.ok) return r;
  refreshAll();
  return { ok: true, data: undefined };
}

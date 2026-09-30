'use server';

import { apiFetch } from '@/lib/api';
import type { Role, User } from '@/lib/types';
import { text } from './form';
import { refreshAll, run, type ActionResult } from './result';

export async function createUser(_: unknown, fd: FormData): Promise<ActionResult> {
  const r = await run(() =>
    apiFetch<User>('/users', {
      method: 'POST',
      body: { name: text(fd, 'name'), email: text(fd, 'email'), password: String(fd.get('password') ?? ''), role: text(fd, 'role') },
    }),
  );
  if (!r.ok) return r;
  refreshAll();
  return { ok: true, data: undefined };
}

export async function updateUser(id: string, patch: { role?: Role; isActive?: boolean; password?: string }): Promise<ActionResult> {
  const r = await run(() => apiFetch<User>(`/users/${id}`, { method: 'PATCH', body: patch }));
  if (!r.ok) return r;
  refreshAll();
  return { ok: true, data: undefined };
}

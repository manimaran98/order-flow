'use server';

import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { safeNext } from '@/lib/safe-next';
import { clearSession, setSession } from '@/lib/session';
import { text } from './form';
import { run, type ActionResult } from './result';

type AuthResponse = { accessToken: string };

export async function login(_: unknown, fd: FormData): Promise<ActionResult> {
  const r = await run(() =>
    apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: { email: text(fd, 'email'), password: String(fd.get('password') ?? '') },
      auth: false,
    }),
  );
  if (!r.ok) return r;
  await setSession(r.data.accessToken);
  redirect(safeNext(fd.get('next')));
}

export async function register(_: unknown, fd: FormData): Promise<ActionResult> {
  const r = await run(() =>
    apiFetch<AuthResponse>('/auth/register', {
      method: 'POST',
      body: { name: text(fd, 'name'), email: text(fd, 'email'), password: String(fd.get('password') ?? '') },
      auth: false,
    }),
  );
  if (!r.ok) return r;
  await setSession(r.data.accessToken);
  redirect('/dashboard');
}

export async function logout() {
  await clearSession();
  redirect('/login');
}

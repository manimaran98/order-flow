'use client';

import { useActionState } from 'react';
import type { FormAction } from '@/actions/result';
import { Field, FormError, SubmitButton } from '@/components/common/field';

export function LoginForm({ action, next }: { action: FormAction; next: string }) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="next" value={next} />
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required />
      <FormError message={state && !state.ok ? state.error : null} />
      <SubmitButton pendingLabel="Logging in…">Log in</SubmitButton>
    </form>
  );
}

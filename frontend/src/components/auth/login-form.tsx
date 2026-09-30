'use client';

import { useFormAction } from '@/components/common/use-form-action';
import type { FormAction } from '@/actions/result';
import { Field, FormError, SubmitButton } from '@/components/common/field';

export function LoginForm({ action, next }: { action: FormAction; next: string }) {
  const { state, onSubmit, pending } = useFormAction(action);
  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <input type="hidden" name="next" value={next} />
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required />
      <FormError message={state && !state.ok ? state.error : null} />
      <SubmitButton pending={pending} pendingLabel="Logging in…">Log in</SubmitButton>
    </form>
  );
}

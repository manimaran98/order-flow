'use client';

import { useActionState } from 'react';
import type { FormAction } from '@/actions/result';
import { Field, FormError, SubmitButton } from '@/components/common/field';

export function RegisterForm({ action }: { action: FormAction }) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className="grid gap-4">
      <Field label="Name" name="name" autoComplete="name" required maxLength={100} />
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field label="Password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} hint="At least 8 characters" />
      <FormError message={state && !state.ok ? state.error : null} />
      <SubmitButton pendingLabel="Creating…">Create account</SubmitButton>
    </form>
  );
}

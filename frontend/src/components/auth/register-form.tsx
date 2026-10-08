'use client';

import { useFormAction } from '@/components/common/use-form-action';
import type { FormAction } from '@/actions/result';
import { Field, FormError, SubmitButton } from '@/components/common/field';

export function RegisterForm({ action }: { action: FormAction }) {
  const { state, onSubmit, pending } = useFormAction(action);
  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <Field label="Name" name="name" autoComplete="name" required maxLength={100} />
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field label="Password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} hint="At least 8 characters" />
      <FormError message={state && !state.ok ? state.error : null} />
      <SubmitButton pending={pending} pendingLabel="Creating…" className="mt-1 h-11 w-full md:h-10">Create account</SubmitButton>
    </form>
  );
}

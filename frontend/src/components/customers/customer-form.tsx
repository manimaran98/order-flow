'use client';

import { useActionState } from 'react';
import type { FormAction } from '@/actions/result';
import { Field, FormError, SubmitButton, TextareaField } from '@/components/common/field';
import type { Customer } from '@/lib/types';

export function CustomerForm({ action, customer, submitLabel }: { action: FormAction; customer?: Customer; submitLabel: string }) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className="grid max-w-xl gap-4">
      <Field label="Name" name="name" required maxLength={200} defaultValue={customer?.name} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone" name="phone" type="tel" inputMode="tel" pattern="[0-9+\-\s()]{6,20}" defaultValue={customer?.phone ?? ''} />
        <Field label="Email" name="email" type="email" defaultValue={customer?.email ?? ''} />
      </div>
      <TextareaField label="Address" name="address" rows={2} maxLength={500} defaultValue={customer?.address ?? ''} />
      <TextareaField label="Notes" name="notes" rows={2} maxLength={1000} defaultValue={customer?.notes ?? ''} />
      <FormError message={state && !state.ok ? state.error : null} />
      {state?.ok && (
        <p role="status" className="text-sm text-green-700">
          Saved
        </p>
      )}
      <SubmitButton className="justify-self-start">{submitLabel}</SubmitButton>
    </form>
  );
}

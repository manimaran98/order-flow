'use client';

import { Check } from 'lucide-react';
import Link from 'next/link';
import { useFormAction } from '@/components/common/use-form-action';
import type { FormAction } from '@/actions/result';
import { Field, FormError, SubmitButton, TextareaField } from '@/components/common/field';
import { Button } from '@/components/ui/button';
import type { Customer } from '@/lib/types';

export function CustomerForm({
  action,
  customer,
  submitLabel,
  cancelHref,
}: {
  action: FormAction;
  customer?: Customer;
  submitLabel: string;
  /** Shows a Cancel link back to this page. */
  cancelHref?: string;
}) {
  const { state, onSubmit, pending } = useFormAction(action);
  return (
    <form onSubmit={onSubmit} className="@container">
      <div className="grid gap-5 p-4 md:p-5">
        <Field label="Name" name="name" required maxLength={200} defaultValue={customer?.name} hint="The shop or person, as you'd find them in WhatsApp." />
        <div className="grid items-start gap-5 @lg:grid-cols-2">
          <Field
            label="Phone"
            name="phone"
            type="tel"
            inputMode="tel"
            pattern="[0-9+\-\s()]{6,20}"
            defaultValue={customer?.phone ?? ''}
            hint="With country code, e.g. +60 12-345 6789"
          />
          <Field label="Email" name="email" type="email" defaultValue={customer?.email ?? ''} hint="Optional" />
        </div>
        <TextareaField label="Address" name="address" rows={2} maxLength={500} defaultValue={customer?.address ?? ''} hint="Where orders are delivered." />
        <TextareaField label="Notes" name="notes" rows={2} maxLength={1000} defaultValue={customer?.notes ?? ''} hint="Only your team sees this." />
        <FormError message={state && !state.ok ? state.error : null} />
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 border-t bg-surface px-4 py-3 md:px-5">
        {state?.ok && (
          <p role="status" className="mr-auto inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
            <Check aria-hidden className="size-4" />
            Saved
          </p>
        )}
        {cancelHref && (
          <Button asChild variant="outline" className="flex-1 @md:flex-none">
            <Link href={cancelHref}>Cancel</Link>
          </Button>
        )}
        <SubmitButton pending={pending} className="flex-1 @md:flex-none">
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}

'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { FormAction } from '@/actions/result';
import { useFormAction } from '@/components/common/use-form-action';
import { Field, FormError, SelectField, SubmitButton } from '@/components/common/field';
import { todayMyt } from '@/lib/dates';
import type { Money } from '@/lib/types';

const METHODS = [
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'OTHER', label: 'Other' },
];

export function PaymentForm({ action, outstanding, onDone }: { action: FormAction; outstanding: Money; onDone?: () => void }) {
  const { state, onSubmit, pending } = useFormAction(action);
  const formRef = useRef<HTMLFormElement>(null);
  const handled = useRef<unknown>(null);
  useEffect(() => {
    if (state?.ok && handled.current !== state) {
      handled.current = state;
      toast.success('Payment recorded');
      formRef.current?.reset();
      onDone?.();
    }
  }, [state, onDone]);
  const today = todayMyt();
  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-3">
      <Field label="Amount (RM)" name="amount" type="number" inputMode="decimal" step="0.01" min="0.01" max={outstanding} defaultValue={outstanding} required />
      <SelectField label="Method" name="method" options={METHODS} defaultValue="BANK_TRANSFER" />
      <Field label="Reference" name="reference" maxLength={100} placeholder="Bank ref or receipt no." />
      <Field label="Paid on" name="paidAt" type="date" max={today} defaultValue={today} required />
      <FormError message={state && !state.ok ? state.error : null} />
      <SubmitButton pending={pending}>Save payment</SubmitButton>
    </form>
  );
}

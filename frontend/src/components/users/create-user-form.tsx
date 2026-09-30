'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { FormAction } from '@/actions/result';
import { useFormAction } from '@/components/common/use-form-action';
import { Field, FormError, SelectField, SubmitButton } from '@/components/common/field';

export function CreateUserForm({ action }: { action: FormAction }) {
  const { state, onSubmit, pending } = useFormAction(action);
  const formRef = useRef<HTMLFormElement>(null);
  const handled = useRef<unknown>(null);
  useEffect(() => {
    if (state?.ok && handled.current !== state) {
      handled.current = state;
      toast.success('User created');
      formRef.current?.reset();
    }
  }, [state]);
  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
      <Field label="Name" name="name" required maxLength={100} />
      <Field label="Email" name="email" type="email" required />
      <Field label="Password" name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" />
      <SelectField
        label="Role"
        name="role"
        defaultValue="STAFF"
        options={[
          { value: 'STAFF', label: 'Staff' },
          { value: 'ADMIN', label: 'Admin' },
        ]}
      />
      <FormError message={state && !state.ok ? state.error : null} />
      <SubmitButton pending={pending} className="justify-self-start sm:col-span-2">Create user</SubmitButton>
    </form>
  );
}

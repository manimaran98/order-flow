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
    <form ref={formRef} onSubmit={onSubmit} className="@container">
      <div className="grid items-start gap-4 p-4 @lg:grid-cols-2 md:p-5">
        <Field label="Name" name="name" required maxLength={100} />
        <Field label="Email" name="email" type="email" required hint="They log in with this." />
        <Field
          label="Password"
          name="password"
          type="password"
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          hint="At least 8 characters. Share it with them privately."
        />
        <SelectField
          label="Role"
          name="role"
          defaultValue="STAFF"
          options={[
            { value: 'STAFF', label: 'Staff' },
            { value: 'ADMIN', label: 'Admin' },
          ]}
        />
        <p className="-mt-2 text-[0.8125rem] text-muted-foreground @lg:col-span-2">
          Staff take orders, pack and record payments. Admins also manage products, stock and users.
        </p>
        <div className="@lg:col-span-2 empty:hidden">
          <FormError message={state && !state.ok ? state.error : null} />
        </div>
      </div>
      <div className="flex justify-end border-t bg-surface px-4 py-3 md:px-5">
        <SubmitButton pending={pending} className="w-full @md:w-auto">
          Create user
        </SubmitButton>
      </div>
    </form>
  );
}

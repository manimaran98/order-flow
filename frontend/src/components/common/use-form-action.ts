'use client';

import { startTransition, useActionState, type FormEvent } from 'react';
import type { ActionResult, FormAction } from '@/actions/result';

/**
 * useActionState without React 19's automatic form reset: `<form action>` clears every field after
 * each submission, even one the server rejected. Submitting through onSubmit keeps what was typed.
 */
export function useFormAction<T = undefined>(action: FormAction<T>) {
  const [state, dispatch, pending] = useActionState<ActionResult<T> | null, FormData>(action, null);
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };
  return { state, onSubmit, pending };
}

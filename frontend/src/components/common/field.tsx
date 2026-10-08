'use client';

import { useId, type ComponentProps, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// Native select (best on phones), styled to match Input, with a drawn chevron.
export const selectClass =
  "h-10 w-full cursor-pointer appearance-none rounded-md border border-input bg-background bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%2371717a' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m4 6 4 4 4-4'/%3E%3C/svg%3E\")] bg-[length:1rem] bg-[right_0.625rem_center] bg-no-repeat pr-8 pl-3 text-base shadow-xs transition-[border-color,box-shadow] duration-150 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 md:h-9 md:text-sm";

type Base = { label: string; name: string; hint?: string; className?: string };
type WithInputClass = { inputClassName?: string };

export function Field({ label, name, hint, className, inputClassName, ...props }: Base & WithInputClass & Omit<ComponentProps<'input'>, 'name'>) {
  const id = useId();
  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} aria-describedby={hint ? `${id}-hint` : undefined} className={inputClassName} {...props} />
      {hint && (
        <p id={`${id}-hint`} className="text-[0.8125rem] text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

export function TextareaField({ label, name, hint, className, ...props }: Base & Omit<ComponentProps<'textarea'>, 'name'>) {
  const id = useId();
  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} name={name} aria-describedby={hint ? `${id}-hint` : undefined} {...props} />
      {hint && (
        <p id={`${id}-hint`} className="text-[0.8125rem] text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

export function SelectField({
  label,
  name,
  options,
  className,
  ...props
}: Base & { options: { value: string; label: string }[] } & Omit<ComponentProps<'select'>, 'name'>) {
  const id = useId();
  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      <select id={id} name={name} className={selectClass} {...props}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
      {message}
    </p>
  );
}

export function SubmitButton({
  children,
  pending,
  pendingLabel = 'Saving…',
  className,
}: {
  children: ReactNode;
  /** Pass when the form submits via onSubmit (useFormAction); useFormStatus only sees `<form action>`. */
  pending?: boolean;
  pendingLabel?: string;
  className?: string;
}) {
  const status = useFormStatus();
  const busy = pending ?? status.pending;
  return (
    <Button type="submit" disabled={busy} className={className}>
      {busy ? pendingLabel : children}
    </Button>
  );
}

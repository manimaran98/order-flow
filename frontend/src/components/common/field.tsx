'use client';

import { useId, type ComponentProps, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export const selectClass =
  'h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50';

type Base = { label: string; name: string; hint?: string; className?: string };

export function Field({ label, name, hint, className, ...props }: Base & Omit<ComponentProps<'input'>, 'name'>) {
  const id = useId();
  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} {...props} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function TextareaField({ label, name, hint, className, ...props }: Base & Omit<ComponentProps<'textarea'>, 'name'>) {
  const id = useId();
  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} name={name} {...props} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
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
    <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
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

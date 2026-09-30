'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { ActionResult } from '@/actions/result';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

type Props = {
  label: string;
  title: string;
  description: string;
  confirmLabel: string;
  action: () => Promise<ActionResult | void>;
  successMessage?: string;
  variant?: 'destructive' | 'outline';
  className?: string;
};

export function ConfirmButton({ label, title, description, confirmLabel, action, successMessage, variant = 'outline', className }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const confirm = () =>
    startTransition(async () => {
      const result = await action();
      if (result && !result.ok) {
        toast.error(result.error);
        return;
      }
      if (successMessage) toast.success(successMessage);
      setOpen(false);
    });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} className={className}>
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Keep it
          </Button>
          <Button variant="destructive" disabled={pending} onClick={confirm}>
            {pending ? 'Working…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

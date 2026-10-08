'use client';

import { Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { recordPayment } from '@/actions/payments';
import { MoneyText } from '@/components/common/money-text';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { formatRM } from '@/lib/money';
import type { Money } from '@/lib/types';
import { PaymentForm } from './payment-form';

/** Phone: a thumb-sized button that opens a bottom sheet. Primary when there is no status step left to take. */
export function PaymentSheet({ orderId, outstanding, primary = false }: { orderId: string; outstanding: Money; primary?: boolean }) {
  const [open, setOpen] = useState(false);
  const action = useMemo(() => recordPayment.bind(null, orderId), [orderId]);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant={primary ? 'default' : 'outline'} className="h-11 w-full text-[0.9375rem]">
          <Wallet aria-hidden />
          Record payment
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[92dvh] gap-0 overflow-y-auto rounded-t-xl">
        <SheetHeader className="border-b px-4 pt-4 pb-3">
          <SheetTitle className="text-base font-semibold">Record payment</SheetTitle>
          <SheetDescription className="tabular">Outstanding {formatRM(outstanding)}</SheetDescription>
        </SheetHeader>
        <div className="px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <PaymentForm action={action} outstanding={outstanding} onDone={() => setOpen(false)} size="large" />
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Desktop: the form is always visible at the foot of the Payments panel. */
export function PaymentPanel({ orderId, outstanding }: { orderId: string; outstanding: Money }) {
  const action = useMemo(() => recordPayment.bind(null, orderId), [orderId]);
  return (
    <div className="grid gap-3.5 border-t bg-surface/60 px-4 py-4 md:px-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold">Record payment</h3>
        <p className="text-[0.8125rem] text-muted-foreground">
          <MoneyText value={outstanding} className="font-medium text-foreground" /> outstanding
        </p>
      </div>
      <PaymentForm action={action} outstanding={outstanding} />
    </div>
  );
}

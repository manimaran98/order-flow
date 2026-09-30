'use client';

import { useMemo, useState } from 'react';
import { recordPayment } from '@/actions/payments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { formatRM } from '@/lib/money';
import type { Money } from '@/lib/types';
import { PaymentForm } from './payment-form';

/** Phone: a big button that opens a bottom sheet. */
export function PaymentSheet({ orderId, outstanding }: { orderId: string; outstanding: Money }) {
  const [open, setOpen] = useState(false);
  const action = useMemo(() => recordPayment.bind(null, orderId), [orderId]);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="secondary" className="h-11 w-full text-base">
          Record payment
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Record payment</SheetTitle>
          <SheetDescription>Outstanding {formatRM(outstanding)}</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          <PaymentForm action={action} outstanding={outstanding} onDone={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Desktop: the form is always visible in the side column. */
export function PaymentPanel({ orderId, outstanding }: { orderId: string; outstanding: Money }) {
  const action = useMemo(() => recordPayment.bind(null, orderId), [orderId]);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Record payment</CardTitle>
        <p className="text-sm text-muted-foreground">Outstanding {formatRM(outstanding)}</p>
      </CardHeader>
      <CardContent>
        <PaymentForm action={action} outstanding={outstanding} />
      </CardContent>
    </Card>
  );
}

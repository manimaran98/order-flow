'use client';

import { ArrowRight, Loader2, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { changeOrderStatus, deleteOrder } from '@/actions/orders';
import { ConfirmButton } from '@/components/common/confirm-button';
import { Button } from '@/components/ui/button';
import { canCancel, canDelete, canEdit, holdsStock, NEXT_ACTION_LABEL, nextStatus, STATUS_LABEL } from '@/lib/order-status';
import type { OrderStatus, Role } from '@/lib/types';
import { cn } from '@/lib/utils';

type Props = { orderId: string; status: OrderStatus; role: Role; paymentCount: number; layout: 'phone' | 'desktop' };

/** The next step is the one primary button; edit, cancel and delete sit quietly beneath it. */
export function StatusActions({ orderId, status, role, paymentCount, layout }: Props) {
  const [pending, startTransition] = useTransition();
  const next = nextStatus(status);
  const phone = layout === 'phone';
  const size = phone ? 'h-11 text-[0.9375rem]' : '';

  const move = (to: OrderStatus) =>
    startTransition(async () => {
      const result = await changeOrderStatus(orderId, to);
      if (result.ok) toast.success(`Order ${STATUS_LABEL[to].toLowerCase()}`);
      else toast.error(result.error);
    });

  const secondary = [canEdit(status), canCancel(status), canDelete(status, role, paymentCount)].filter(Boolean).length;

  return (
    <div className="grid gap-2">
      {next && (
        <Button className={cn('w-full', size)} disabled={pending} aria-busy={pending || undefined} onClick={() => move(next)}>
          {pending ? <Loader2 aria-hidden className="animate-spin" /> : null}
          {NEXT_ACTION_LABEL[next]}
          {!pending && <ArrowRight aria-hidden className="opacity-70" />}
        </Button>
      )}
      {secondary > 0 && (
        <div className={cn('grid gap-2', secondary > 1 && 'grid-cols-2')}>
          {canEdit(status) && (
            <Button asChild variant="outline" className={size}>
              <Link href={`/orders/${orderId}/edit`}>
                <Pencil aria-hidden />
                Edit order
              </Link>
            </Button>
          )}
          {canCancel(status) && (
            <ConfirmButton
              label="Cancel order"
              title="Cancel this order?"
              description={holdsStock(status) ? 'The stock taken for this order goes back to inventory.' : 'The order will be marked as cancelled.'}
              confirmLabel="Yes, cancel order"
              successMessage="Order cancelled"
              variant="destructive"
              action={() => changeOrderStatus(orderId, 'CANCELLED')}
              className={size}
            />
          )}
          {canDelete(status, role, paymentCount) && (
            <ConfirmButton
              label="Delete order"
              title="Delete this order?"
              description="This removes the order completely. Use Cancel if you want to keep a record."
              confirmLabel="Yes, delete order"
              action={() => deleteOrder(orderId)}
              className={cn(size, 'border-transparent bg-transparent text-muted-foreground shadow-none hover:bg-destructive/8 hover:text-destructive', 'col-span-2')}
            />
          )}
        </div>
      )}
    </div>
  );
}

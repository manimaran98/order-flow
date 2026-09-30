'use client';

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

export function StatusActions({ orderId, status, role, paymentCount, layout }: Props) {
  const [pending, startTransition] = useTransition();
  const next = nextStatus(status);
  const big = layout === 'phone' ? 'h-11 w-full text-base' : '';

  const move = (to: OrderStatus) =>
    startTransition(async () => {
      const result = await changeOrderStatus(orderId, to);
      if (result.ok) toast.success(`Order ${STATUS_LABEL[to].toLowerCase()}`);
      else toast.error(result.error);
    });

  return (
    <div className={cn('grid gap-2', layout === 'desktop' && 'sm:flex sm:flex-wrap')}>
      {next && (
        <Button className={big} disabled={pending} onClick={() => move(next)}>
          {NEXT_ACTION_LABEL[next]}
        </Button>
      )}
      {canEdit(status) && (
        <Button asChild variant="outline" className={big}>
          <Link href={`/orders/${orderId}/edit`}>Edit order</Link>
        </Button>
      )}
      {canCancel(status) && (
        <ConfirmButton
          label="Cancel order"
          title="Cancel this order?"
          description={holdsStock(status) ? 'The stock taken for this order goes back to inventory.' : 'The order will be marked as cancelled.'}
          confirmLabel="Yes, cancel order"
          successMessage="Order cancelled"
          action={() => changeOrderStatus(orderId, 'CANCELLED')}
          className={big}
        />
      )}
      {canDelete(status, role, paymentCount) && (
        <ConfirmButton
          label="Delete order"
          title="Delete this order?"
          description="This removes the order completely. Use Cancel if you want to keep a record."
          confirmLabel="Yes, delete order"
          variant="destructive"
          action={() => deleteOrder(orderId)}
          className={big}
        />
      )}
    </div>
  );
}

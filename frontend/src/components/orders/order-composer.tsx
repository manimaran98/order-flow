'use client';

import { useRouter } from 'next/navigation';
import { useReducer, useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { ActionResult } from '@/actions/result';
import type { OrderInput, StockWarning } from '@/lib/types';
import { DesktopComposer } from './desktop-composer';
import { draftReducer, draftToInput, draftTotals, emptyDraft, type Draft } from './order-draft';
import { PhoneComposer } from './phone-composer';

type Props = {
  mode: 'create' | 'edit';
  initial?: Draft;
  submit: (input: OrderInput) => Promise<ActionResult<{ id: string; stockWarnings: StockWarning[] }>>;
};

/** Owns the draft so the phone and desktop layouts render the same state. */
export function OrderComposer({ mode, initial, submit }: Props) {
  const [draft, dispatch] = useReducer(draftReducer, initial ?? emptyDraft);
  const totals = draftTotals(draft);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = () => {
    if (pending || !totals.canSubmit) return;
    startTransition(async () => {
      setError(null);
      let result: Awaited<ReturnType<typeof submit>>;
      try {
        result = await submit(draftToInput(draft));
      } catch {
        // Network drop or an unexpected API error: keep the draft so nothing has to be re-entered.
        setError("Couldn't save the order. Check your connection and try again.");
        return;
      }
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const warnings = result.data.stockWarnings;
      if (warnings.length) {
        toast.warning(
          `Saved, but stock is short for ${warnings.map((w) => `${w.sku} (need ${w.requested}, have ${w.available})`).join(', ')}. Restock before confirming.`,
        );
      } else {
        toast.success(mode === 'create' ? 'Order created' : 'Order updated');
      }
      router.push(`/orders/${result.data.id}`);
    });
  };

  const view = { draft, dispatch, totals, pending, error, onSubmit, submitLabel: mode === 'create' ? 'Create order' : 'Save changes' };
  return (
    <>
      <div className="md:hidden">
        <PhoneComposer {...view} />
      </div>
      <div className="hidden md:block">
        <DesktopComposer {...view} />
      </div>
    </>
  );
}

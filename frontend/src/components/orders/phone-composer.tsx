'use client';

import { useState } from 'react';
import { FormError } from '@/components/common/field';
import { Button } from '@/components/ui/button';
import { formatRM, fromSen } from '@/lib/money';
import { DiscountField, NotesField, StockWarnings, SummaryRow } from './composer-parts';
import type { ComposerViewProps } from './composer-types';
import { CustomerPicker } from './customer-picker';
import { LineItems } from './line-items';
import { ProductPicker } from './product-picker';

const STEPS = ['Customer', 'Items', 'Review'] as const;

export function PhoneComposer(props: ComposerViewProps) {
  const { draft, dispatch, totals, pending, error, onSubmit, submitLabel } = props;
  const [step, setStep] = useState(draft.customer ? (draft.lines.length ? 2 : 1) : 0);
  return (
    <div className="pb-36">
      <p className="mb-3 text-sm text-muted-foreground">
        Step {step + 1} of 3 · {STEPS[step]}
      </p>

      {step === 0 && (
        <CustomerPicker
          selected={draft.customer}
          onSelect={(c) => {
            dispatch({ type: 'setCustomer', customer: c });
            if (c) setStep(1);
          }}
        />
      )}

      {step === 1 && (
        <div className="grid gap-4">
          <ProductPicker onAdd={(p) => dispatch({ type: 'addProduct', product: p })} />
          <LineItems lines={draft.lines} dispatch={dispatch} />
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-4">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Customer</p>
            <p className="font-medium">{draft.customer?.name}</p>
          </div>
          <LineItems lines={draft.lines} dispatch={dispatch} readOnly />
          <SummaryRow label="Subtotal" sen={totals.subtotalSen} />
          <DiscountField draft={draft} dispatch={dispatch} />
          <NotesField draft={draft} dispatch={dispatch} />
          <StockWarnings totals={totals} />
          <FormError message={error} />
        </div>
      )}

      <div className="fixed inset-x-0 bottom-14 z-10 border-t bg-background p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {draft.lines.length} {draft.lines.length === 1 ? 'item' : 'items'}
          </span>
          <output aria-label="Order total" className="text-lg font-semibold tabular-nums">
            {formatRM(fromSen(totals.totalSen))}
          </output>
        </div>
        <div className="flex gap-2">
          {step > 0 && (
            <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          {step === 0 && (
            <Button type="button" className="h-11 flex-1" disabled={!draft.customer} onClick={() => setStep(1)}>
              Next: items
            </Button>
          )}
          {step === 1 && (
            <Button type="button" className="h-11 flex-1" disabled={draft.lines.length === 0} onClick={() => setStep(2)}>
              Next: review
            </Button>
          )}
          {step === 2 && (
            <Button type="button" className="h-11 flex-1" disabled={!totals.canSubmit || pending} onClick={onSubmit}>
              {pending ? 'Saving…' : submitLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

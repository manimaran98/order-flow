'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { FormError } from '@/components/common/field';
import { Button } from '@/components/ui/button';
import { formatRM, fromSen } from '@/lib/money';
import { cn } from '@/lib/utils';
import { DiscountField, NotesField, StockWarnings, SummaryRow } from './composer-parts';
import type { ComposerViewProps } from './composer-types';
import { CustomerPicker } from './customer-picker';
import { LineItems } from './line-items';
import { Panel } from '@/components/common/panel';
import { ProductPicker } from './product-picker';

const STEPS = ['Customer', 'Items', 'Review'] as const;

export function PhoneComposer(props: ComposerViewProps) {
  const { draft, dispatch, totals, pending, error, onSubmit, submitLabel } = props;
  const [step, setStep] = useState(draft.customer ? (draft.lines.length ? 2 : 1) : 0);
  const count = draft.lines.length;
  return (
    <div className="pb-24">
      <div className="mb-4 grid gap-2">
        <div aria-hidden className="grid grid-cols-3 gap-1.5">
          {STEPS.map((s, i) => (
            <span key={s} className={cn('h-1 rounded-full transition-colors duration-200', i <= step ? 'bg-primary' : 'bg-border')} />
          ))}
        </div>
        <p className="tabular text-[0.8125rem] font-medium text-muted-foreground">
          Step {step + 1} of 3 · {STEPS[step]}
        </p>
      </div>

      {step === 0 && (
        <Panel title="Customer">
          <div className="p-4">
            <CustomerPicker
              selected={draft.customer}
              onSelect={(c) => {
                dispatch({ type: 'setCustomer', customer: c });
                if (c) setStep(1);
              }}
            />
          </div>
        </Panel>
      )}

      {step === 1 && (
        <Panel title="Items" aside={count > 0 && <span className="tabular">{`${count} ${count === 1 ? 'item' : 'items'}`}</span>}>
          <div className="border-b p-4">
            <ProductPicker onAdd={(p) => dispatch({ type: 'addProduct', product: p })} />
          </div>
          <LineItems lines={draft.lines} dispatch={dispatch} />
        </Panel>
      )}

      {step === 2 && (
        <div className="grid gap-4">
          <Panel title="Customer">
            <p className="px-4 py-3.5 text-sm font-medium">{draft.customer?.name}</p>
          </Panel>
          <Panel title="Items" aside={<span className="tabular">{`${count} ${count === 1 ? 'item' : 'items'}`}</span>}>
            <LineItems lines={draft.lines} dispatch={dispatch} readOnly />
            <div className="grid gap-3 border-t bg-surface/60 px-4 py-3.5">
              <SummaryRow label="Subtotal" sen={totals.subtotalSen} />
              <DiscountField draft={draft} dispatch={dispatch} />
            </div>
          </Panel>
          <Panel title="Notes">
            <div className="p-4 [&_label]:sr-only">
              <NotesField draft={draft} dispatch={dispatch} />
            </div>
          </Panel>
          <StockWarnings totals={totals} />
          <FormError message={error} />
        </div>
      )}

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 border-t bg-background/95 px-4 pt-2.5 pb-3 shadow-[0_-4px_12px_-6px_oklch(0.21_0.006_286/0.08)] backdrop-blur-sm supports-[backdrop-filter]:bg-background/85">
        <div className="mb-2.5 flex items-baseline justify-between">
          <span className="tabular text-[0.8125rem] text-muted-foreground">
            {count} {count === 1 ? 'item' : 'items'}
          </span>
          <output aria-label="Order total" className="tabular text-lg font-semibold tracking-[-0.01em]">
            {formatRM(fromSen(totals.totalSen))}
          </output>
        </div>
        <div className="flex gap-2">
          {step > 0 && (
            <Button type="button" variant="outline" className="h-11 flex-1 text-[0.9375rem]" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          {step === 0 && (
            <Button type="button" className="h-11 flex-[2] text-[0.9375rem]" disabled={!draft.customer} onClick={() => setStep(1)}>
              Next: items
            </Button>
          )}
          {step === 1 && (
            <Button type="button" className="h-11 flex-[2] text-[0.9375rem]" disabled={count === 0} onClick={() => setStep(2)}>
              Next: review
            </Button>
          )}
          {step === 2 && (
            <Button type="button" className="h-11 flex-[2] text-[0.9375rem]" disabled={!totals.canSubmit || pending} onClick={onSubmit}>
              {pending && <Loader2 aria-hidden className="animate-spin" />}
              {pending ? 'Saving…' : submitLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

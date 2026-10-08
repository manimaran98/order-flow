'use client';

import { Loader2 } from 'lucide-react';
import { FormError } from '@/components/common/field';
import { Button } from '@/components/ui/button';
import { formatRM, fromSen } from '@/lib/money';
import { DiscountField, NotesField, Problems, StockWarnings, SummaryRow } from './composer-parts';
import type { ComposerViewProps } from './composer-types';
import { CustomerPicker } from './customer-picker';
import { LineItems } from './line-items';
import { Panel } from '@/components/common/panel';
import { ProductPicker } from './product-picker';

export function DesktopComposer(props: ComposerViewProps) {
  const { draft, dispatch, totals, pending, error, onSubmit, submitLabel } = props;
  const count = draft.lines.length;
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="grid gap-6">
        <Panel title="Customer">
          <div className="px-5 py-4">
            <CustomerPicker selected={draft.customer} onSelect={(c) => dispatch({ type: 'setCustomer', customer: c })} />
          </div>
        </Panel>
        <Panel title="Items" aside={count > 0 && <span className="tabular">{`${count} ${count === 1 ? 'item' : 'items'}`}</span>}>
          <div className="border-b px-5 py-4">
            <ProductPicker onAdd={(p) => dispatch({ type: 'addProduct', product: p })} />
          </div>
          <LineItems lines={draft.lines} dispatch={dispatch} />
        </Panel>
      </div>
      <Panel title="Summary" as="aside" className="lg:sticky lg:top-6">
        <div className="grid gap-3 px-5 py-4">
          <SummaryRow label="Subtotal" sen={totals.subtotalSen} />
          <DiscountField draft={draft} dispatch={dispatch} />
          <div className="flex items-baseline justify-between gap-4 border-t pt-3">
            <span className="text-sm font-semibold">Total</span>
            <output aria-label="Order total" className="tabular text-xl font-semibold tracking-[-0.02em]">
              {formatRM(fromSen(totals.totalSen))}
            </output>
          </div>
        </div>
        <div className="grid gap-3 border-t px-5 py-4">
          <NotesField draft={draft} dispatch={dispatch} />
          <StockWarnings totals={totals} />
        </div>
        <div className="grid gap-3 border-t bg-surface/60 px-5 py-4">
          <Problems totals={totals} />
          <FormError message={error} />
          <Button type="button" size="lg" className="w-full" disabled={!totals.canSubmit || pending} onClick={onSubmit}>
            {pending && <Loader2 aria-hidden className="animate-spin" />}
            {pending ? 'Saving…' : submitLabel}
          </Button>
        </div>
      </Panel>
    </div>
  );
}

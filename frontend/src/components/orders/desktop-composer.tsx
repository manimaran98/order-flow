'use client';

import { FormError } from '@/components/common/field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRM, fromSen } from '@/lib/money';
import { DiscountField, NotesField, Problems, StockWarnings, SummaryRow } from './composer-parts';
import type { ComposerViewProps } from './composer-types';
import { CustomerPicker } from './customer-picker';
import { LineItems } from './line-items';
import { ProductPicker } from './product-picker';

export function DesktopComposer(props: ComposerViewProps) {
  const { draft, dispatch, totals, pending, error, onSubmit, submitLabel } = props;
  return (
    <div className="grid items-start gap-6 md:grid-cols-[1fr_300px] lg:grid-cols-[1fr_340px]">
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Customer</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerPicker selected={draft.customer} onSelect={(c) => dispatch({ type: 'setCustomer', customer: c })} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <ProductPicker onAdd={(p) => dispatch({ type: 'addProduct', product: p })} />
            <LineItems lines={draft.lines} dispatch={dispatch} />
          </CardContent>
        </Card>
      </div>
      <Card className="sticky top-6">
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <SummaryRow label="Subtotal" sen={totals.subtotalSen} />
          <DiscountField draft={draft} dispatch={dispatch} />
          <div className="flex items-center justify-between border-t pt-3">
            <span className="font-medium">Total</span>
            <output aria-label="Order total" className="text-lg font-semibold tabular-nums">
              {formatRM(fromSen(totals.totalSen))}
            </output>
          </div>
          <NotesField draft={draft} dispatch={dispatch} />
          <StockWarnings totals={totals} />
          <Problems totals={totals} />
          <FormError message={error} />
          <Button type="button" className="w-full" disabled={!totals.canSubmit || pending} onClick={onSubmit}>
            {pending ? 'Saving…' : submitLabel}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

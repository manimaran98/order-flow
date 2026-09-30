'use client';

import { Field, TextareaField } from '@/components/common/field';
import { formatRM, fromSen } from '@/lib/money';
import type { ComposerViewProps } from './composer-types';

export function SummaryRow({ label, sen }: { label: string; sen: number }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{formatRM(fromSen(sen))}</span>
    </div>
  );
}

export function DiscountField({ draft, dispatch }: Pick<ComposerViewProps, 'draft' | 'dispatch'>) {
  return (
    <Field
      label="Discount (RM)"
      name="discount"
      inputMode="decimal"
      placeholder="0.00"
      value={draft.discount}
      onChange={(e) => dispatch({ type: 'setDiscount', discount: e.target.value })}
    />
  );
}

export function NotesField({ draft, dispatch }: Pick<ComposerViewProps, 'draft' | 'dispatch'>) {
  return (
    <TextareaField
      label="Notes"
      name="notes"
      rows={2}
      maxLength={1000}
      placeholder="Delivery details, requests…"
      value={draft.notes}
      onChange={(e) => dispatch({ type: 'setNotes', notes: e.target.value })}
    />
  );
}

export function StockWarnings({ totals }: Pick<ComposerViewProps, 'totals'>) {
  if (totals.warnings.length === 0) return null;
  return (
    <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
      Not enough stock right now for {totals.warnings.map((l) => `${l.sku} (have ${l.stock})`).join(', ')}. You can still take the order; confirming it needs the
      stock.
    </div>
  );
}

export function Problems({ totals }: Pick<ComposerViewProps, 'totals'>) {
  if (totals.canSubmit) return null;
  return (
    <ul className="list-disc pl-5 text-xs text-muted-foreground">
      {totals.problems.map((p) => (
        <li key={p}>{p}</li>
      ))}
    </ul>
  );
}

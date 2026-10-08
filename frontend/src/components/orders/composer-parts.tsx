'use client';

import { TriangleAlert } from 'lucide-react';
import { useId } from 'react';
import { TextareaField } from '@/components/common/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatRM, fromSen } from '@/lib/money';
import type { ComposerViewProps } from './composer-types';

export function SummaryRow({ label, sen }: { label: string; sen: number }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular">{formatRM(fromSen(sen))}</span>
    </div>
  );
}

/** Discount sits inline with the other summary rows: label left, a short right-aligned figure field right. */
export function DiscountField({ draft, dispatch }: Pick<ComposerViewProps, 'draft' | 'dispatch'>) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4">
      <Label htmlFor={id} className="font-normal text-muted-foreground">
        Discount (RM)
      </Label>
      <Input
        id={id}
        name="discount"
        inputMode="decimal"
        placeholder="0.00"
        value={draft.discount}
        onChange={(e) => dispatch({ type: 'setDiscount', discount: e.target.value })}
        className="tabular w-28 text-right"
      />
    </div>
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
    <div className="flex gap-2.5 rounded-md border border-amber-600/20 bg-amber-50 px-3 py-2.5 text-[0.8125rem] text-amber-900">
      <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-amber-600" />
      <p>
        Not enough stock right now for {totals.warnings.map((l) => `${l.sku} (have ${l.stock})`).join(', ')}. You can still take the order; confirming it needs
        the stock.
      </p>
    </div>
  );
}

export function Problems({ totals }: Pick<ComposerViewProps, 'totals'>) {
  if (totals.canSubmit) return null;
  return (
    <ul className="grid gap-1 text-[0.8125rem] text-muted-foreground">
      {totals.problems.map((p) => (
        <li key={p} className="flex items-baseline gap-2">
          <span aria-hidden className="size-1 shrink-0 translate-y-[-0.2em] rounded-full bg-muted-foreground/60" />
          {p}
        </li>
      ))}
    </ul>
  );
}

'use client';

import { Minus, PackageOpen, Plus, Trash2 } from 'lucide-react';
import type { Dispatch } from 'react';
import { MoneyText } from '@/components/common/money-text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatRM, fromSen, toSen } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { DraftAction, DraftLine } from './order-draft';

/** Draft lines as a flush divided list; lives directly inside a Panel. */
export function LineItems({ lines, dispatch, readOnly = false }: { lines: DraftLine[]; dispatch: Dispatch<DraftAction>; readOnly?: boolean }) {
  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
        <PackageOpen aria-hidden className="size-5 text-muted-foreground/70" />
        <p className="text-sm text-muted-foreground">No products added yet.</p>
      </div>
    );
  }
  return (
    <ul className="divide-y">
      {lines.map((l) => {
        const short = l.stock !== null && l.quantity > l.stock;
        const lineTotal = <MoneyText value={fromSen(toSen(l.unitPrice) * l.quantity)} className="text-sm font-medium" />;
        if (readOnly) {
          return (
            <li key={l.productId} className="flex items-start justify-between gap-3 px-4 py-3 md:px-5">
              <div className="grid min-w-0 gap-0.5">
                <p className="text-sm font-medium">{l.name}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="tabular">{l.quantity}</span> × <span className="tabular">{formatRM(l.unitPrice)}</span>
                </p>
                {short && <p className="text-xs font-medium text-amber-700">Only {l.stock} in stock</p>}
              </div>
              {lineTotal}
            </li>
          );
        }
        return (
          <li
            key={l.productId}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2.5 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto_6.5rem] md:px-5"
          >
            <div className="grid min-w-0 gap-0.5">
              <p className="text-sm font-medium">{l.name}</p>
              <p className="text-xs text-muted-foreground">
                <span className="font-mono">{l.sku}</span>
                <span className="mx-1.5" aria-hidden>
                  ·
                </span>
                <span className="tabular">{formatRM(l.unitPrice)}</span> each
              </p>
              {short && <p className="text-xs font-medium text-amber-700">Only {l.stock} in stock</p>}
            </div>
            <div className="self-start text-right sm:order-last sm:self-center">{lineTotal}</div>
            <div className="col-span-2 flex items-center justify-between gap-1 sm:col-span-1">
              <div className="flex items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={`Decrease ${l.name}`}
                  disabled={l.quantity <= 1}
                  onClick={() => dispatch({ type: 'setQuantity', productId: l.productId, quantity: l.quantity - 1 })}
                  className="rounded-r-none"
                >
                  <Minus />
                </Button>
                <Input
                  aria-label={`Quantity for ${l.name}`}
                  inputMode="numeric"
                  className={cn('tabular -mx-px w-14 rounded-none text-center shadow-none focus-visible:relative focus-visible:z-10', short && 'text-amber-800')}
                  value={l.quantity}
                  onChange={(e) => dispatch({ type: 'setQuantity', productId: l.productId, quantity: Number(e.target.value) })}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={`Increase ${l.name}`}
                  onClick={() => dispatch({ type: 'setQuantity', productId: l.productId, quantity: l.quantity + 1 })}
                  className="rounded-l-none"
                >
                  <Plus />
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${l.name}`}
                className="text-muted-foreground hover:bg-destructive/8 hover:text-destructive"
                onClick={() => dispatch({ type: 'removeLine', productId: l.productId })}
              >
                <Trash2 />
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

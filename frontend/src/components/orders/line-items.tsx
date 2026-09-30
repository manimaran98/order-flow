'use client';

import { Minus, Plus, Trash2 } from 'lucide-react';
import type { Dispatch } from 'react';
import { MoneyText } from '@/components/common/money-text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatRM, fromSen, toSen } from '@/lib/money';
import type { DraftAction, DraftLine } from './order-draft';

export function LineItems({ lines, dispatch, readOnly = false }: { lines: DraftLine[]; dispatch: Dispatch<DraftAction>; readOnly?: boolean }) {
  if (lines.length === 0) return <p className="text-sm text-muted-foreground">No products added yet.</p>;
  return (
    <ul className="divide-y rounded-lg border">
      {lines.map((l) => {
        const short = l.stock !== null && l.quantity > l.stock;
        return (
          <li key={l.productId} className="grid gap-2 p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
            <div>
              <p className="font-medium">{l.name}</p>
              <p className="text-xs text-muted-foreground">
                {l.sku} · {formatRM(l.unitPrice)} each
              </p>
              {short && <p className="text-xs text-amber-700">Only {l.stock} in stock</p>}
            </div>
            {readOnly ? (
              <p className="text-sm">× {l.quantity}</p>
            ) : (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={`Decrease ${l.name}`}
                  disabled={l.quantity <= 1}
                  onClick={() => dispatch({ type: 'setQuantity', productId: l.productId, quantity: l.quantity - 1 })}
                >
                  <Minus />
                </Button>
                <Input
                  aria-label={`Quantity for ${l.name}`}
                  inputMode="numeric"
                  className="w-16 text-center"
                  value={l.quantity}
                  onChange={(e) => dispatch({ type: 'setQuantity', productId: l.productId, quantity: Number(e.target.value) })}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={`Increase ${l.name}`}
                  onClick={() => dispatch({ type: 'setQuantity', productId: l.productId, quantity: l.quantity + 1 })}
                >
                  <Plus />
                </Button>
                <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${l.name}`} onClick={() => dispatch({ type: 'removeLine', productId: l.productId })}>
                  <Trash2 />
                </Button>
              </div>
            )}
            <MoneyText value={fromSen(toSen(l.unitPrice) * l.quantity)} className="text-right font-medium" />
          </li>
        );
      })}
    </ul>
  );
}

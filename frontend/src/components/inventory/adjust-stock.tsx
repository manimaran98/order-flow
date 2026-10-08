'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { adjustStock } from '@/actions/inventory';
import type { FormAction } from '@/actions/result';
import { useFormAction } from '@/components/common/use-form-action';
import { Field, FormError, SelectField, SubmitButton, TextareaField } from '@/components/common/field';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

type AdjustType = 'RESTOCK' | 'ADJUSTMENT';

export function AdjustStockForm({ action, productId, onDone }: { action: FormAction; productId: string; onDone?: () => void }) {
  const { state, onSubmit, pending } = useFormAction(action);
  const [type, setType] = useState<AdjustType>('RESTOCK');
  const handled = useRef<unknown>(null);
  useEffect(() => {
    if (state?.ok && handled.current !== state) {
      handled.current = state;
      toast.success('Stock updated');
      onDone?.();
    }
  }, [state, onDone]);
  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <input type="hidden" name="productId" value={productId} />
      <SelectField
        label="Type"
        name="type"
        value={type}
        onChange={(e) => setType(e.target.value as AdjustType)}
        options={[
          { value: 'RESTOCK', label: 'Restock (add stock)' },
          { value: 'ADJUSTMENT', label: 'Adjustment (+ or −)' },
        ]}
      />
      <Field
        label="Quantity"
        name="quantity"
        type="number"
        step={1}
        required
        {...(type === 'RESTOCK' ? { min: 1 } : {})}
        hint={type === 'ADJUSTMENT' ? 'Use a negative number to remove stock, e.g. -2' : 'Units received. Added to the current stock.'}
      />
      <TextareaField
        label="Note"
        name="note"
        rows={2}
        maxLength={500}
        required={type === 'ADJUSTMENT'}
        placeholder={type === 'ADJUSTMENT' ? 'Why? e.g. damaged, recount' : 'Optional'}
      />
      <FormError message={state && !state.ok ? state.error : null} />
      <SubmitButton pending={pending} className="mt-1 sm:justify-self-end">
        Save adjustment
      </SubmitButton>
    </form>
  );
}

export function AdjustStockDialog({ product }: { product: { id: string; name: string; stockQuantity: number } }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="size-10 px-0 md:h-8 md:w-auto md:px-2.5" aria-label={`Adjust stock for ${product.name}`}>
          <SlidersHorizontal aria-hidden className="text-muted-foreground" />
          <span className="hidden md:inline">Adjust</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>
            {product.name} · <span className="tabular">{product.stockQuantity}</span> in stock
          </DialogDescription>
        </DialogHeader>
        <AdjustStockForm action={adjustStock} productId={product.id} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

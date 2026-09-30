'use client';

import { useFormAction } from '@/components/common/use-form-action';
import type { FormAction } from '@/actions/result';
import { Field, FormError, SubmitButton, TextareaField } from '@/components/common/field';
import type { Product } from '@/lib/types';

export function ProductForm({ action, product, submitLabel }: { action: FormAction; product?: Product; submitLabel: string }) {
  const { state, onSubmit, pending } = useFormAction(action);
  const creating = !product;
  return (
    <form onSubmit={onSubmit} className="grid max-w-xl gap-4">
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <Field label="Name" name="name" required maxLength={200} defaultValue={product?.name} />
        <Field label="SKU" name="sku" required pattern="[A-Za-z0-9._\-]{1,50}" defaultValue={product?.sku} />
      </div>
      <TextareaField label="Description" name="description" rows={2} maxLength={1000} defaultValue={product?.description ?? ''} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Selling price (RM)" name="sellingPrice" type="number" inputMode="decimal" step="0.01" min="0" required defaultValue={product?.sellingPrice} />
        <Field label="Cost price (RM)" name="costPrice" type="number" inputMode="decimal" step="0.01" min="0" required defaultValue={product?.costPrice} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {creating ? (
          <Field label="Opening stock" name="stockQuantity" type="number" step={1} min={0} defaultValue={0} />
        ) : (
          <p className="text-sm text-muted-foreground sm:self-end">
            {product.stockQuantity} in stock. Change stock from Inventory so the ledger records why.
          </p>
        )}
        <Field label="Low-stock threshold" name="lowStockThreshold" type="number" step={1} min={0} defaultValue={product?.lowStockThreshold ?? 0} />
      </div>
      <FormError message={state && !state.ok ? state.error : null} />
      {state?.ok && (
        <p role="status" className="text-sm text-green-700">
          Saved
        </p>
      )}
      <SubmitButton pending={pending} className="justify-self-start">{submitLabel}</SubmitButton>
    </form>
  );
}

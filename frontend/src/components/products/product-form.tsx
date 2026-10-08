'use client';

import { Check } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useFormAction } from '@/components/common/use-form-action';
import type { FormAction } from '@/actions/result';
import { Field, FormError, SubmitButton, TextareaField } from '@/components/common/field';
import { Button } from '@/components/ui/button';
import type { Product } from '@/lib/types';

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-4">
      <legend className="mb-4 text-sm font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

export function ProductForm({
  action,
  product,
  submitLabel,
  cancelHref,
}: {
  action: FormAction;
  product?: Product;
  submitLabel: string;
  /** Shows a Cancel link back to this page. */
  cancelHref?: string;
}) {
  const { state, onSubmit, pending } = useFormAction(action);
  const creating = !product;
  return (
    <form onSubmit={onSubmit} className="@container">
      <div className="grid gap-7 p-4 md:p-5">
        <Group title="Product">
          <div className="grid items-start gap-4 @lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Field label="Name" name="name" required maxLength={200} defaultValue={product?.name} />
            <Field
              label="SKU"
              name="sku"
              required
              pattern="[A-Za-z0-9._\-]{1,50}"
              defaultValue={product?.sku}
              autoCapitalize="characters"
              spellCheck={false}
              className="[&_input]:font-mono"
              hint="Letters, numbers, . _ -"
            />
          </div>
          <TextareaField
            label="Description"
            name="description"
            rows={2}
            maxLength={1000}
            defaultValue={product?.description ?? ''}
            hint="Shown on the public catalog."
          />
        </Group>
        <Group title="Pricing">
          <div className="grid items-start gap-4 @md:grid-cols-2">
            <Field
              label="Selling price (RM)"
              name="sellingPrice"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              required
              defaultValue={product?.sellingPrice}
              className="[&_input]:tabular"
              hint="What customers pay per unit."
            />
            <Field
              label="Cost price (RM)"
              name="costPrice"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              required
              defaultValue={product?.costPrice}
              className="[&_input]:tabular"
              hint="Only admins see this."
            />
          </div>
        </Group>
        <Group title="Stock">
          <div className="grid items-start gap-4 @md:grid-cols-2">
            {creating ? (
              <Field
                label="Opening stock"
                name="stockQuantity"
                type="number"
                step={1}
                min={0}
                defaultValue={0}
                className="[&_input]:tabular"
                hint="Units on hand today. Recorded in the stock history."
              />
            ) : null}
            <Field
              label="Low-stock threshold"
              name="lowStockThreshold"
              type="number"
              step={1}
              min={0}
              defaultValue={product?.lowStockThreshold ?? 0}
              className="[&_input]:tabular"
              hint="Flagged as low stock at or below this number."
            />
          </div>
          {!creating && (
            <p className="text-[0.8125rem] text-muted-foreground">
              <span className="tabular font-medium text-foreground">{product.stockQuantity}</span> in stock. Change stock from Inventory so the stock
              history records why.
            </p>
          )}
        </Group>
        <FormError message={state && !state.ok ? state.error : null} />
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 border-t bg-surface px-4 py-3 md:px-5">
        {state?.ok && (
          <p role="status" className="mr-auto inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
            <Check aria-hidden className="size-4" />
            Saved
          </p>
        )}
        {cancelHref && (
          <Button asChild variant="outline" className="flex-1 @md:flex-none">
            <Link href={cancelHref}>Cancel</Link>
          </Button>
        )}
        <SubmitButton pending={pending} className="flex-1 @md:flex-none">
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}

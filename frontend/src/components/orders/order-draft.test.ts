import type { Product } from '@/lib/types';
import { draftReducer, draftToInput, draftTotals, emptyDraft, type Draft } from './order-draft';

const product = (id: string, price: string, stock: number): Product => ({
  id,
  name: `Product ${id}`,
  sku: `SKU-${id}`,
  description: null,
  sellingPrice: price,
  costPrice: '0.00',
  stockQuantity: stock,
  lowStockThreshold: 0,
  isActive: true,
  createdAt: '',
  updatedAt: '',
});

describe('order draft', () => {
  it('merges repeated products and clamps quantities', () => {
    let d = draftReducer(emptyDraft, { type: 'addProduct', product: product('a', '12.50', 10) });
    d = draftReducer(d, { type: 'addProduct', product: product('a', '12.50', 10) });
    expect(d.lines).toHaveLength(1);
    expect(d.lines[0].quantity).toBe(2);
    d = draftReducer(d, { type: 'setQuantity', productId: 'a', quantity: 0 });
    expect(d.lines[0].quantity).toBe(1);
    d = draftReducer(d, { type: 'setQuantity', productId: 'a', quantity: Number.NaN });
    expect(d.lines[0].quantity).toBe(1);
    d = draftReducer(d, { type: 'setQuantity', productId: 'a', quantity: 999_999 });
    expect(d.lines[0].quantity).toBe(100_000);
  });

  it('totals in sen and validates the discount', () => {
    const d: Draft = {
      customer: { id: 'c', name: 'C' },
      lines: [
        { productId: 'a', name: 'A', sku: 'A', unitPrice: '0.10', stock: 10, quantity: 3 },
        { productId: 'b', name: 'B', sku: 'B', unitPrice: '12.50', stock: 1, quantity: 2 },
      ],
      discount: '5',
      notes: '',
    };
    const t = draftTotals(d);
    expect(t.subtotalSen).toBe(2530);
    expect(t.totalSen).toBe(2030);
    expect(t.warnings.map((l) => l.productId)).toEqual(['b']);
    expect(t.canSubmit).toBe(true);
    expect(draftTotals({ ...d, discount: '25.31' }).canSubmit).toBe(false);
    expect(draftTotals({ ...d, discount: '1.005' }).canSubmit).toBe(false);
    expect(draftTotals({ ...d, customer: null }).problems).toContain('Choose a customer');
    expect(draftTotals({ ...d, lines: [] }).problems).toContain('Add at least one product');
  });

  it('builds the API input', () => {
    const d: Draft = {
      customer: { id: 'c1', name: 'C' },
      lines: [{ productId: 'a', name: 'A', sku: 'A', unitPrice: '1.00', stock: null, quantity: 4 }],
      discount: '',
      notes: '  ',
    };
    expect(draftToInput(d)).toEqual({ customerId: 'c1', items: [{ productId: 'a', quantity: 4 }], discount: 0, notes: null });
  });
});

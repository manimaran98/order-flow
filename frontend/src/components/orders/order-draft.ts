import { toSen } from '@/lib/money';
import type { Money, OrderInput, Product } from '@/lib/types';

export type DraftLine = { productId: string; name: string; sku: string; unitPrice: Money; stock: number | null; quantity: number };
export type Draft = { customer: { id: string; name: string } | null; lines: DraftLine[]; discount: string; notes: string };

export type DraftAction =
  | { type: 'setCustomer'; customer: Draft['customer'] }
  | { type: 'addProduct'; product: Pick<Product, 'id' | 'name' | 'sku' | 'sellingPrice' | 'stockQuantity'> }
  | { type: 'setQuantity'; productId: string; quantity: number }
  | { type: 'removeLine'; productId: string }
  | { type: 'setDiscount'; discount: string }
  | { type: 'setNotes'; notes: string };

export const emptyDraft: Draft = { customer: null, lines: [], discount: '', notes: '' };

const MAX_QTY = 100_000; // matches the API's per-line limit
const clampQty = (q: number) => Math.min(MAX_QTY, Math.max(1, Math.floor(q) || 1));

export function draftReducer(draft: Draft, action: DraftAction): Draft {
  switch (action.type) {
    case 'setCustomer':
      return { ...draft, customer: action.customer };
    case 'addProduct': {
      const p = action.product;
      if (draft.lines.some((l) => l.productId === p.id)) {
        return { ...draft, lines: draft.lines.map((l) => (l.productId === p.id ? { ...l, quantity: clampQty(l.quantity + 1) } : l)) };
      }
      return {
        ...draft,
        lines: [...draft.lines, { productId: p.id, name: p.name, sku: p.sku, unitPrice: p.sellingPrice, stock: p.stockQuantity, quantity: 1 }],
      };
    }
    case 'setQuantity':
      return { ...draft, lines: draft.lines.map((l) => (l.productId === action.productId ? { ...l, quantity: clampQty(action.quantity) } : l)) };
    case 'removeLine':
      return { ...draft, lines: draft.lines.filter((l) => l.productId !== action.productId) };
    case 'setDiscount':
      return { ...draft, discount: action.discount };
    case 'setNotes':
      return { ...draft, notes: action.notes };
  }
}

/** Preview only; the API recomputes and its totals are authoritative. */
export function draftTotals(draft: Draft) {
  const subtotalSen = draft.lines.reduce((sum, l) => sum + toSen(l.unitPrice) * l.quantity, 0);
  const rawDiscount = draft.discount.trim() === '' ? 0 : toSen(draft.discount);
  const discountInvalid = Number.isNaN(rawDiscount) || rawDiscount > subtotalSen;
  const discountSen = discountInvalid ? 0 : rawDiscount;
  const problems: string[] = [];
  if (!draft.customer) problems.push('Choose a customer');
  if (draft.lines.length === 0) problems.push('Add at least one product');
  if (discountInvalid) problems.push('Discount must be an amount no larger than the subtotal');
  return {
    subtotalSen,
    discountSen,
    totalSen: subtotalSen - discountSen,
    warnings: draft.lines.filter((l) => l.stock !== null && l.quantity > l.stock),
    problems,
    canSubmit: problems.length === 0,
  };
}

export type DraftTotals = ReturnType<typeof draftTotals>;

export function draftToInput(draft: Draft): OrderInput {
  return {
    customerId: draft.customer!.id,
    items: draft.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
    discount: draft.discount.trim() ? Number(draft.discount) : 0,
    notes: draft.notes.trim() || null,
  };
}

# OrderFlow Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Next.js 16 web app over the OrderFlow API that runs the whole brief §23 flow for ADMIN and STAFF users. The four daily screens (dashboard, orders list, new order, order detail) get dedicated phone and desktop layouts.

**Architecture:** App Router with a BFF pattern. Server Components and Server Actions call NestJS from the Next.js server with the JWT taken from an httpOnly cookie. The browser never talks to the API. Lists keep their state in the URL; mutations are Server Actions followed by `revalidatePath`. Dual layouts render both variants from the same data and switch at Tailwind's `md` breakpoint. Interactive screens share one state owner across both variants.

**Tech Stack:** Next.js 16.3 (App Router), React 19.2, TypeScript, Tailwind CSS 4, shadcn/ui (`radix-nova` style, lucide icons), sonner, Vitest 4 + React Testing Library + jsdom, Playwright, Docker Compose.

**Spec:** [docs/superpowers/specs/2026-09-29-orderflow-frontend-design.md](../specs/2026-09-29-orderflow-frontend-design.md)

**Branch:** `feat/frontend`, created from `spec/frontend`.

## Plan-time amendments to the spec (please confirm at plan review)

Probing Next 16 and re-reading the backend changed six details. Task 1 records them in the spec's §10.

1. **Multi-status filters (spec §9):** the backend accepts comma lists (`?status=CONFIRMED,PACKING,READY`), a one-line `in` filter plus an e2e test. This replaces merging several requests on the client, so pagination stays exact and the frontend needs less code.
2. **Clearing the cookie on a 401 (spec §3):** Next 16 only lets Server Functions and Route Handlers write cookies, not Server Components while they render. So on a 401, `apiFetch` redirects to a route handler, `/session/expired`, which deletes the cookie and redirects to `/login?expired=1`.
3. **Stock warnings after creating an order (spec §5):** shown as a toast when the composer navigates to the new order, not as a banner. The order detail API doesn't return current stock, so a banner would need another request.
4. **Pagination (spec §4):** Previous/Next plus "Page x of y" on both layouts, with no column sorting. The API has no sort parameter.
5. **Form errors (spec §6):** each form shows one error message from the API plus native HTML validation. `ActionResult` has no per-field errors.
6. **Loading state (spec §6):** one generic skeleton, `(app)/loading.tsx`, rather than one per layout.

## Global Constraints

- Next.js **16.3.x**, React **19.2.x**, Tailwind **4**, shadcn/ui style **`radix-nova`**. Components live in `src/components/ui`, and `cn` is imported from `@/lib/utils`.
- **Next 16 conventions:**
  - `src/proxy.ts` replaces `middleware.ts`.
  - `params` and `searchParams` are `Promise`s.
  - `cookies()` is async and can only write in Server Actions and Route Handlers.
  - `error.tsx` receives `{ error, retry }`.
  - Before using any other Next API, read `frontend/node_modules/next/dist/docs/`, as `frontend/AGENTS.md` instructs.
- The browser never calls the API. `API_URL` is a server-only env var; there is no `NEXT_PUBLIC_*` API variable. `src/lib/api.ts`, `src/lib/session.ts` and `src/lib/current-user.ts` start with `import 'server-only'`.
- **Session cookie:** `of_session`, httpOnly, `SameSite=Lax`, `Secure` only when `NODE_ENV=production`, `maxAge` 8h.
- **Money:** display with `formatRM()`, which gives `RM 1,234.50`. The only client-side money maths is in integer sen via `toSen()` / `fromSen()`. Never do floating-point maths on money.
- **Dates:** display in `Asia/Kuala_Lumpur` via `src/lib/dates.ts`.
- **Form components:** Client Components receive their Server Action as an `action` prop (`FormAction`) so tests can pass a fake. Search pickers import `searchCustomers` / `searchProducts` directly, and tests mock those modules.
- **Dual-layout pattern:** `<div className="md:hidden">…phone…</div><div className="hidden md:block">…desktop…</div>`, which hides the inactive variant from the accessibility tree too.
- **Accessible names are an interface.** Playwright relies on the labels and button names given in the tasks, so don't rename them.
- **Tests:**
  - `npm test` runs Vitest on `src/**/*.test.{ts,tsx}`, jsdom by default. A `// @vitest-environment node` comment switches individual files to Node.
  - `npm run test:e2e` runs Playwright on `e2e/`.
  - Don't run the backend e2e suite and the frontend e2e suite at the same time: both use `orderflow_test`.
- Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- **Open redirect through `?next=`:** logging in from `/login?next=//evil.example` must land on `/dashboard`, never off-site. Pinned in Task 2 (`safeNext` tests).
- **Session ends mid-use** (token expired, or the user was deactivated): the next page load goes to `/login?expired=1` with the cookie cleared and no redirect loop. Pinned in Task 3 (`apiFetch` 401 test plus the `/session/expired` route test).
- **Double-tapping "Create order" on a phone:** exactly one order is created. Pinned in Task 10 (composer double-submit test).
- **A payment dated "today" just after midnight MYT:** must not be rejected as a future date. Pinned in Task 2 (`paidAtForApi` tests).
- **Resizing the window mid-order** (phone ↔ desktop layout): the draft is kept. Pinned in Task 10 (shared-state test across both views).

---

## File Map

```text
backend/src/orders/dto/order.dto.ts        (Task 1: comma-list status filters)
backend/src/orders/orders.service.ts        (Task 1)
backend/test/orders.e2e-spec.ts             (Task 1)
docker-compose.yml                          (Task 2: frontend service)
README.md                                   (Task 2: UTF-16 → UTF-8; Task 14: frontend docs)
frontend/
  Dockerfile.dev, .dockerignore, AGENTS.md, CLAUDE.md (generated by Next), components.json
  vitest.config.mts, vitest.setup.ts, playwright.config.ts
  src/proxy.ts
  src/app/layout.tsx, page.tsx, error.tsx
  src/app/session/expired/route.ts (+ route.test.ts)
  src/app/(auth)/layout.tsx, login/page.tsx, register/page.tsx
  src/app/(app)/layout.tsx, loading.tsx, error.tsx, not-found.tsx
  src/app/(app)/dashboard/page.tsx
  src/app/(app)/orders/page.tsx, new/page.tsx, [id]/page.tsx, [id]/edit/page.tsx
  src/app/(app)/customers/page.tsx, new/page.tsx, [id]/page.tsx
  src/app/(app)/products/page.tsx, new/page.tsx, [id]/page.tsx
  src/app/(app)/inventory/page.tsx
  src/app/(app)/users/page.tsx
  src/lib/types.ts, money.ts, dates.ts, order-status.ts, safe-next.ts
  src/lib/session-cookie.ts, session.ts, api.ts, current-user.ts, use-debounced-search.ts
  src/actions/result.ts, form.ts, auth.ts, customers.ts, products.ts, inventory.ts, orders.ts, payments.ts, users.ts
  src/components/ui/*                      (shadcn)
  src/components/common/field.tsx, page-header.tsx, empty-state.tsx, money-text.tsx, status-badge.tsx,
                        pagination.tsx, search-input.tsx, filter-select.tsx, confirm-button.tsx
  src/components/shell/nav.ts, nav-links.tsx, bottom-nav.tsx, logout-button.tsx
  src/components/auth/login-form.tsx, register-form.tsx
  src/components/dashboard/attention-cards.tsx, recent-orders.tsx, low-stock-list.tsx
  src/components/orders/order-cards.tsx, orders-table.tsx, order-filters.tsx,
                        order-draft.ts, composer-types.ts, composer-parts.tsx, customer-picker.tsx, product-picker.tsx,
                        line-items.tsx, phone-composer.tsx, desktop-composer.tsx, order-composer.tsx,
                        order-detail-view.tsx, order-items.tsx, status-actions.tsx, payment-form.tsx, payment-sheet.tsx,
                        payments-timeline.tsx
  src/components/customers/customer-form.tsx, customer-list.tsx
  src/components/products/product-form.tsx, product-list.tsx, stock-ledger.tsx
  src/components/inventory/stock-list.tsx, adjust-stock.tsx
  src/components/users/create-user-form.tsx, users-list.tsx, user-actions.tsx
  e2e/db.ts, global-setup.ts, helpers.ts, journey.spec.ts
```

---

### Task 1: Backend accepts comma-list status filters

**Files:**
- Modify: `backend/src/orders/dto/order.dto.ts` (`ListOrdersQuery`), `backend/src/orders/orders.service.ts` (`findAll`), `docs/superpowers/specs/2026-09-29-orderflow-frontend-design.md`
- Test: `backend/test/orders.e2e-spec.ts`

**Interfaces:**
- Produces: `GET /orders?status=A,B&paymentStatus=X,Y`. Each value is validated against the enum, so an unknown value returns 400.

- [ ] **Step 1: Create the branch**

```bash
git checkout spec/frontend
git checkout -b feat/frontend
```

- [ ] **Step 2: Write the failing test**

In `backend/test/orders.e2e-spec.ts`, add this test inside `describe('orders')`, after `'lists with filters, search and pagination'`:

```ts
  it('filters by several statuses at once', async () => {
    const a = await createOrder(app, t.staff, { customerId: customer.id, items: [{ productId: coke.id, quantity: 1 }] });
    await createOrder(app, t.staff, { customerId: customer.id, items: [{ productId: coke.id, quantity: 1 }] });
    await api(app).patch(`/orders/${a.id}/status`).set(bearer(t.staff)).send({ status: 'CONFIRMED' }).expect(200);
    const list = (qs: string) => api(app).get(`/orders${qs}`).set(bearer(t.staff));
    expect((await list('?status=CONFIRMED,PACKING,READY').expect(200)).body.meta.total).toBe(1);
    expect((await list('?status=PENDING,CONFIRMED').expect(200)).body.meta.total).toBe(2);
    expect((await list('?paymentStatus=UNPAID,PARTIAL').expect(200)).body.meta.total).toBe(2);
    await list('?status=PENDING,SHIPPED').expect(400);
  });
```

- [ ] **Step 3: Run it and watch it fail**

Run: `cd backend && docker compose up -d postgres && npm run test:e2e -- orders.e2e`
Expected: FAIL with `expected 200 "OK", got 400 "Bad Request"`, because a comma list isn't a valid enum today.

- [ ] **Step 4: Implement**

In `backend/src/orders/dto/order.dto.ts`, change the class-transformer import to `import { Transform, Type } from 'class-transformer';`. Add this helper above `export class OrderItemInput`:

```ts
/** `?status=A,B` → ['A', 'B'] */
const CommaList = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value));
```

Replace the `status` and `paymentStatus` properties of `ListOrdersQuery` with:

```ts
  @IsOptional()
  @CommaList()
  @IsEnum(OrderStatus, { each: true })
  status?: OrderStatus[];

  @IsOptional()
  @CommaList()
  @IsEnum(PaymentStatus, { each: true })
  paymentStatus?: PaymentStatus[];
```

In `backend/src/orders/orders.service.ts` `findAll`, replace the first two lines of the `where` object:

```ts
      status: q.status && { in: q.status },
      paymentStatus: q.paymentStatus && { in: q.paymentStatus },
```

- [ ] **Step 5: Run the backend suites**

Run: `npm run test:e2e && npm test && npm run lint && npm run typecheck`
Expected: all pass (72 e2e, 65 unit).

- [ ] **Step 6: Record the amendments in the spec**

Append to `docs/superpowers/specs/2026-09-29-orderflow-frontend-design.md`:

```markdown
---

## 10. Plan-time amendments

1. Multi-status filters: the backend now accepts comma lists (`?status=CONFIRMED,PACKING,READY`, `?paymentStatus=UNPAID,PARTIAL`). This replaces the client-side merge in §9, so pagination is exact.
2. A 401 during rendering redirects to the route handler `/session/expired`, which deletes the cookie and redirects to `/login?expired=1`. Next 16 only allows cookie writes in Server Functions and Route Handlers.
3. Stock warnings after creating an order are shown as a toast during navigation, not as a banner.
4. Pagination is Previous/Next with "Page x of y" on both layouts. There is no column sorting because the API has no sort parameter.
5. Forms show one API error message plus native HTML validation. There are no per-field server errors.
6. One generic loading skeleton for the authenticated area.
```

- [ ] **Step 7: Commit**

```bash
cd ..
git add backend docs/superpowers/specs/2026-09-29-orderflow-frontend-design.md
git commit -m "feat(orders): accept comma-separated status filters" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Frontend scaffold, tooling, Docker service and pure helpers

**Files:**
- Create: `frontend/` (create-next-app + shadcn), `frontend/vitest.config.mts`, `frontend/vitest.setup.ts`, `frontend/Dockerfile.dev`, `frontend/.dockerignore`, `frontend/.env.example`
- Create: `frontend/src/lib/types.ts`, `money.ts`, `dates.ts`, `order-status.ts`, `safe-next.ts`
- Test: `frontend/src/lib/money.test.ts`, `dates.test.ts`, `order-status.test.ts`, `safe-next.test.ts`
- Modify: `docker-compose.yml`, `README.md` (encoding only)

**Interfaces:**
- Produces (all in `src/lib`):
  - `formatRM(value: string | number): string`, `toSen(value: string | number): number` (`NaN` if invalid), `fromSen(sen: number): string`
  - `formatDate(iso)`, `formatDateTime(iso)`, `todayMyt(now?: Date): string` (`YYYY-MM-DD`), `paidAtForApi(date: string | undefined, now?: Date): string | undefined`
  - `nextStatus(s)`, `canCancel(s)`, `canEdit(s)`, `holdsStock(s)`, `canRecordPayment(s, p)`, `canDelete(s, role, paymentCount)`, `STATUS_LABEL`, `PAYMENT_LABEL`, `NEXT_ACTION_LABEL`, `ORDER_FLOW`
  - `safeNext(value: unknown): string`
  - Types in `types.ts`: `Role`, `OrderStatus`, `PaymentStatus`, `PaymentMethod`, `Money`, `User`, `Paginated<T>`, `Customer`, `CustomerDetail`, `OrderSummary`, `OrderListItem`, `OrderItem`, `Payment`, `OrderDetail`, `OrderInput`, `StockWarning`, `Product`, `StockRow`, `InventoryTransaction`, `Ledger`, `DashboardSummary`

- [ ] **Step 1: Fix the README encoding**

The README was saved as UTF-16, so git treats it as binary. Convert it to UTF-8:

```bash
node -e "const fs=require('fs');const b=fs.readFileSync('README.md');const t=b[0]===0xff&&b[1]===0xfe?b.subarray(2).toString('utf16le'):b.toString('utf8');fs.writeFileSync('README.md',t.replace(/\r\n/g,'\n'))"
file README.md
```

Expected: `README.md: Unicode text, UTF-8 text` (or `ASCII text`).

- [ ] **Step 2: Scaffold Next.js and shadcn**

```bash
npx -y create-next-app@16 frontend --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack --disable-git --yes
cd frontend
npx -y shadcn@latest init -d -b radix --no-monorepo
npx -y shadcn@latest add button input label card badge table dialog sheet sonner skeleton textarea separator -y
npm i server-only
npm i -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event vite-tsconfig-paths @playwright/test pg @types/pg
npm pkg set scripts.test="vitest run" scripts.test:watch="vitest" scripts.test:e2e="playwright test" scripts.typecheck="tsc --noEmit"
cp ../backend/.env.example /dev/null
```

Do **not** add `@vitejs/plugin-react`. Version 6 has a Babel peer conflict, and Vite 8 compiles JSX natively.

- [ ] **Step 3: Test tooling**

`frontend/vitest.config.mts`:

```ts
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
```

`frontend/vitest.setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';

// Server-only modules are imported (never executed on a real server) by action and api tests.
vi.mock('server-only', () => ({}));

// jsdom gaps that Radix primitives touch.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
Element.prototype.scrollIntoView ??= () => {};
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= () => {};
```

In `frontend/tsconfig.json`, add to `compilerOptions`:

```json
    "types": ["node", "vitest/globals", "@testing-library/jest-dom/vitest"],
```

`frontend/.env.example`:

```text
API_URL=http://localhost:4000
```

```bash
cp .env.example .env.local
```

- [ ] **Step 4: Write the failing helper tests**

`frontend/src/lib/money.test.ts`:

```ts
import { formatRM, fromSen, toSen } from './money';

describe('money', () => {
  it('formats ringgit with thousands separators and 2 decimals', () => {
    expect(formatRM('1234.5')).toBe('RM 1,234.50');
    expect(formatRM('0')).toBe('RM 0.00');
    expect(formatRM(36.5)).toBe('RM 36.50');
  });

  it('converts to sen without floating-point error', () => {
    expect(toSen('12.5')).toBe(1250);
    expect(fromSen(toSen('0.10') * 3)).toBe('0.30');
    expect(toSen('7')).toBe(700);
  });

  it('rejects amounts that are not plain 2-decimal numbers', () => {
    expect(toSen('1.005')).toBeNaN();
    expect(toSen('-1')).toBeNaN();
    expect(toSen('abc')).toBeNaN();
    expect(toSen('')).toBeNaN();
  });
});
```

`frontend/src/lib/dates.test.ts`:

```ts
import { formatDate, paidAtForApi, todayMyt } from './dates';

const justAfterMidnightMyt = new Date('2026-09-29T16:30:00Z'); // 00:30 on 30 Sep in MYT

describe('dates (Asia/Kuala_Lumpur)', () => {
  it('uses the Malaysian calendar day', () => {
    expect(todayMyt(justAfterMidnightMyt)).toBe('2026-09-30');
    expect(formatDate('2026-09-29T16:30:00Z')).toMatch(/30/);
  });

  it('never sends "today" as a future timestamp', () => {
    expect(paidAtForApi('2026-09-30', justAfterMidnightMyt)).toBeUndefined();
    expect(paidAtForApi(undefined, justAfterMidnightMyt)).toBeUndefined();
  });

  it('sends past dates as midday MYT', () => {
    expect(paidAtForApi('2026-09-20', justAfterMidnightMyt)).toBe('2026-09-20T12:00:00+08:00');
  });
});
```

`frontend/src/lib/order-status.test.ts`:

```ts
import type { OrderStatus } from './types';
import { canCancel, canDelete, canEdit, canRecordPayment, holdsStock, NEXT_ACTION_LABEL, nextStatus } from './order-status';

const ALL: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PACKING', 'READY', 'DELIVERED', 'CANCELLED'];

describe('order status rules (mirror the backend)', () => {
  it('moves forward one step', () => {
    expect(ALL.map(nextStatus)).toEqual(['CONFIRMED', 'PACKING', 'READY', 'DELIVERED', null, null]);
  });

  it('allows cancelling any non-final order', () => {
    expect(ALL.filter(canCancel)).toEqual(['PENDING', 'CONFIRMED', 'PACKING', 'READY']);
  });

  it('only edits PENDING orders and knows which statuses hold stock', () => {
    expect(ALL.filter(canEdit)).toEqual(['PENDING']);
    expect(ALL.filter(holdsStock)).toEqual(['CONFIRMED', 'PACKING', 'READY']);
  });

  it('labels every forward action', () => {
    expect(ALL.map(nextStatus).filter(Boolean).map((s) => NEXT_ACTION_LABEL[s!])).toEqual([
      'Confirm order',
      'Start packing',
      'Mark ready',
      'Mark delivered',
    ]);
  });

  it('decides payments and deletion', () => {
    expect(canRecordPayment('DELIVERED', 'PARTIAL')).toBe(true);
    expect(canRecordPayment('CANCELLED', 'UNPAID')).toBe(false);
    expect(canRecordPayment('PENDING', 'PAID')).toBe(false);
    expect(canDelete('PENDING', 'ADMIN', 0)).toBe(true);
    expect(canDelete('PENDING', 'STAFF', 0)).toBe(false);
    expect(canDelete('PENDING', 'ADMIN', 1)).toBe(false);
    expect(canDelete('CONFIRMED', 'ADMIN', 0)).toBe(false);
  });
});
```

`frontend/src/lib/safe-next.test.ts`:

```ts
import { safeNext } from './safe-next';

describe('safeNext', () => {
  it('keeps same-site paths', () => {
    expect(safeNext('/orders?status=PENDING')).toBe('/orders?status=PENDING');
  });

  it.each(['//evil.example', '/\\evil.example', 'https://evil.example', '', undefined, 42])(
    'falls back to /dashboard for %p',
    (value) => {
      expect(safeNext(value)).toBe('/dashboard');
    },
  );
});
```

- [ ] **Step 5: Run them and watch them fail**

Run: `npm test`
Expected: FAIL. The imports `./money`, `./dates`, `./order-status` and `./safe-next` can't be found.

- [ ] **Step 6: Implement the helpers**

`frontend/src/lib/types.ts`:

```ts
export type Role = 'ADMIN' | 'STAFF';
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PACKING' | 'READY' | 'DELIVERED' | 'CANCELLED';
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'OTHER';
/** Money as the API sends it: a decimal string such as "12.50". */
export type Money = string;

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  total: Money;
  paidAmount: Money;
  createdAt: string;
}

export interface CustomerDetail extends Customer {
  orders: OrderSummary[];
}

export interface OrderListItem extends OrderSummary {
  subtotal: Money;
  discount: Money;
  outstandingAmount: Money;
  notes: string | null;
  customer: { id: string; name: string };
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: Money;
  subtotal: Money;
  product: { id: string; name: string; sku: string };
}

export interface Payment {
  id: string;
  orderId: string;
  amount: Money;
  method: PaymentMethod;
  reference: string | null;
  paidAt: string;
  createdAt: string;
}

export interface OrderDetail extends OrderSummary {
  subtotal: Money;
  discount: Money;
  outstandingAmount: Money;
  notes: string | null;
  customer: { id: string; name: string; phone: string | null };
  items: OrderItem[];
  payments: Payment[];
  confirmedAt: string | null;
  cancelledAt: string | null;
  deliveredAt: string | null;
}

export interface OrderInput {
  customerId: string;
  items: { productId: string; quantity: number }[];
  discount: number;
  notes: string | null;
}

export interface StockWarning {
  productId: string;
  sku: string;
  requested: number;
  available: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  sellingPrice: Money;
  costPrice: Money;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockRow {
  id: string;
  name: string;
  sku: string;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
  isLow?: boolean;
}

export interface InventoryTransaction {
  id: string;
  productId: string;
  type: 'SALE' | 'RESTOCK' | 'ADJUSTMENT' | 'RETURN';
  quantity: number;
  referenceType: 'ORDER' | 'MANUAL';
  referenceId: string | null;
  note: string | null;
  createdAt: string;
}

export interface Ledger {
  product: StockRow;
  transactions: Paginated<InventoryTransaction>;
}

export interface DashboardSummary {
  todayOrders: number;
  todaySales: Money;
  unpaidOrders: number;
  outstandingAmount: Money;
  pendingOrders: number;
  awaitingFulfilment: number;
  lowStockProducts: number;
  completedOrders: number;
}
```

`frontend/src/lib/money.ts`:

```ts
const twoDecimals = new Intl.NumberFormat('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "1234.5" → "RM 1,234.50". Display only. */
export function formatRM(value: string | number): string {
  return `RM ${twoDecimals.format(Number(value))}`;
}

/** Exact conversion to integer sen; NaN unless the value is a non-negative amount with at most 2 decimals. */
export function toSen(value: string | number): number {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(value).trim());
  if (!match) return NaN;
  return Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
}

export function fromSen(sen: number): string {
  return (sen / 100).toFixed(2);
}
```

`frontend/src/lib/dates.ts`:

```ts
const TZ = 'Asia/Kuala_Lumpur';

const dateFmt = new Intl.DateTimeFormat('en-MY', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('en-MY', {
  timeZone: TZ,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const isoDay = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
export const formatDateTime = (iso: string) => dateTimeFmt.format(new Date(iso));

/** Today's calendar date in Malaysia as YYYY-MM-DD (for <input type="date">). */
export const todayMyt = (now = new Date()) => isoDay.format(now);

/**
 * The API rejects paidAt in the future. "Today" is sent as nothing (the server stamps now);
 * an earlier day is sent as midday MYT so it can never drift into the next day.
 */
export function paidAtForApi(date: string | undefined, now = new Date()): string | undefined {
  if (!date || date >= todayMyt(now)) return undefined;
  return `${date}T12:00:00+08:00`;
}
```

`frontend/src/lib/order-status.ts`:

```ts
import type { OrderStatus, PaymentStatus, Role } from './types';

/** The happy path, in order. */
export const ORDER_FLOW: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PACKING', 'READY', 'DELIVERED'];

const NEXT: Record<OrderStatus, OrderStatus | null> = {
  PENDING: 'CONFIRMED',
  CONFIRMED: 'PACKING',
  PACKING: 'READY',
  READY: 'DELIVERED',
  DELIVERED: null,
  CANCELLED: null,
};

export const nextStatus = (s: OrderStatus) => NEXT[s];
export const canCancel = (s: OrderStatus) => NEXT[s] !== null;
export const canEdit = (s: OrderStatus) => s === 'PENDING';
export const holdsStock = (s: OrderStatus) => s === 'CONFIRMED' || s === 'PACKING' || s === 'READY';
export const canRecordPayment = (s: OrderStatus, p: PaymentStatus) => s !== 'CANCELLED' && p !== 'PAID';
export const canDelete = (s: OrderStatus, role: Role, paymentCount: number) =>
  role === 'ADMIN' && s === 'PENDING' && paymentCount === 0;

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PACKING: 'Packing',
  READY: 'Ready',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export const PAYMENT_LABEL: Record<PaymentStatus, string> = { UNPAID: 'Unpaid', PARTIAL: 'Partial', PAID: 'Paid' };

/** Button label for moving *to* a status. */
export const NEXT_ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  CONFIRMED: 'Confirm order',
  PACKING: 'Start packing',
  READY: 'Mark ready',
  DELIVERED: 'Mark delivered',
};
```

`frontend/src/lib/safe-next.ts`:

```ts
/** Only same-site paths survive; anything else (other hosts, protocol-relative, junk) goes to the dashboard. */
export function safeNext(value: unknown): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\')
    ? value
    : '/dashboard';
}
```

- [ ] **Step 7: Run the tests and watch them pass**

Run: `npm test && npm run lint && npm run typecheck`
Expected: all pass (4 files). Lint and typecheck are clean.

- [ ] **Step 8: Docker service**

`frontend/Dockerfile.dev`:

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install -g npm@11 && npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]
```

`frontend/.dockerignore`:

```text
node_modules
.next
.env.local
playwright-report
test-results
```

In `docker-compose.yml`, add under `services:` (after `backend`):

```yaml
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    environment:
      API_URL: http://backend:4000
      WATCHPACK_POLLING: "true"
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next
    depends_on:
      - backend
```

Add to the root `.gitignore`:

```text
frontend/.next/
frontend/playwright-report/
frontend/test-results/
.env.local
```

Run: `cd .. && docker compose up -d --build frontend && sleep 25 && curl -s -o /dev/null -w "%{http_code}\n" localhost:3000`
Expected: `200` (the Next.js starter page, until Task 4 replaces it).

- [ ] **Step 9: Commit**

```bash
git add .gitignore README.md docker-compose.yml frontend
git commit -m "feat(frontend): Next.js 16 scaffold, shadcn/ui, test tooling, compose service, pure helpers" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: API client, session, action results, expired-session route, proxy

**Files:**
- Create: `frontend/src/lib/session-cookie.ts`, `session.ts`, `api.ts`, `current-user.ts`, `frontend/src/actions/result.ts`, `form.ts`, `frontend/src/app/session/expired/route.ts`, `frontend/src/proxy.ts`
- Test: `frontend/src/lib/api.test.ts`, `frontend/src/actions/result.test.ts`, `frontend/src/app/session/expired/route.test.ts`

**Interfaces:**
- Consumes: `types.ts`.
- Produces:
  - `SESSION_COOKIE = 'of_session'`, `SESSION_MAX_AGE`
  - `getToken(): Promise<string | undefined>`, `setSession(token)`, `clearSession()`
  - `class ApiError { status: number; message: string; details: Record<string, unknown> }`
  - `apiFetch<T = unknown>(path, { method?, body?, query?, auth? = true }): Promise<T>`
  - `toApiError(status, body): ApiError`, `getOrNotFound<T>(p: Promise<T>): Promise<T>`
  - `getCurrentUser(): Promise<User>` (React `cache`)
  - `type ActionResult<T = undefined>`, `type FormAction<T = undefined>`
  - `run<T>(fn): Promise<ActionResult<T>>`, `refreshAll()`
  - `text(fd, key)`, `textOrNull(fd, key)`, `num(fd, key)`

- [ ] **Step 1: Write the failing tests**

`frontend/src/lib/api.test.ts`:

```ts
// @vitest-environment node
const { store, redirect } = vi.hoisted(() => ({
  store: new Map<string, string>(),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (k: string) => (store.has(k) ? { name: k, value: store.get(k) } : undefined),
    set: (k: string, v: string) => store.set(k, v),
    delete: (k: string) => store.delete(k),
  }),
}));
vi.mock('next/navigation', () => ({
  redirect,
  notFound: () => {
    throw new Error('NOT_FOUND');
  },
}));

import { ApiError, apiFetch, getOrNotFound, toApiError } from './api';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

beforeEach(() => {
  store.clear();
  fetchMock.mockReset();
  redirect.mockClear();
  process.env.API_URL = 'http://api.test';
});

describe('apiFetch', () => {
  it('sends the session token as a bearer header and skips empty query values', async () => {
    store.set('of_session', 'tok');
    fetchMock.mockResolvedValue(json(200, { ok: 1 }));
    await apiFetch('/orders', { query: { status: 'PENDING', search: '', page: 2 } });
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit & { headers: Record<string, string> }];
    expect(String(url)).toBe('http://api.test/orders?status=PENDING&page=2');
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(init.cache).toBe('no-store');
  });

  it('sends the session to /session/expired when the API rejects our token', async () => {
    store.set('of_session', 'old');
    fetchMock.mockResolvedValue(json(401, { statusCode: 401, message: 'Unauthorized' }));
    await expect(apiFetch('/auth/me')).rejects.toThrow('REDIRECT:/session/expired');
  });

  it('reports a failed login as an ApiError instead of redirecting', async () => {
    store.set('of_session', 'stale');
    fetchMock.mockResolvedValue(json(401, { statusCode: 401, message: 'Invalid email or password' }));
    await expect(apiFetch('/auth/login', { method: 'POST', body: {}, auth: false })).rejects.toMatchObject({
      status: 401,
      message: 'Invalid email or password',
    });
    expect(redirect).not.toHaveBeenCalled();
    const [, init] = fetchMock.mock.calls[0] as [URL, RequestInit & { headers: Record<string, string> }];
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('maps an unreachable API to a 503', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    await expect(apiFetch('/health')).rejects.toMatchObject({ status: 503, message: 'Cannot reach the OrderFlow API' });
  });

  it('returns undefined for 204 No Content', async () => {
    store.set('of_session', 'tok');
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(apiFetch('/customers/1', { method: 'DELETE' })).resolves.toBeUndefined();
  });
});

describe('toApiError', () => {
  it('joins validation message arrays', () => {
    expect(toApiError(400, { message: ['a must be x', 'b must be y'] }).message).toBe('a must be x; b must be y');
  });

  it('keeps extra details such as stock numbers', () => {
    const err = toApiError(409, { statusCode: 409, error: 'Conflict', message: 'Insufficient stock', sku: 'COKE', requested: 3, available: 1 });
    expect(err).toBeInstanceOf(ApiError);
    expect(err.details).toEqual({ sku: 'COKE', requested: 3, available: 1 });
  });
});

describe('getOrNotFound', () => {
  it('turns 404 and malformed-id 400 into notFound()', async () => {
    await expect(getOrNotFound(Promise.reject(new ApiError(404, 'x')))).rejects.toThrow('NOT_FOUND');
    await expect(getOrNotFound(Promise.reject(new ApiError(400, 'x')))).rejects.toThrow('NOT_FOUND');
  });

  it('lets other errors through', async () => {
    await expect(getOrNotFound(Promise.reject(new ApiError(500, 'boom')))).rejects.toThrow('boom');
  });
});
```

`frontend/src/actions/result.test.ts`:

```ts
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { ApiError } from '@/lib/api';
import { run } from './result';

describe('run', () => {
  it('wraps success', async () => {
    expect(await run(async () => 42)).toEqual({ ok: true, data: 42 });
  });

  it('turns expected API errors into a failed result the form can show', async () => {
    for (const status of [400, 401, 403, 404, 409, 503]) {
      expect(await run(async () => Promise.reject(new ApiError(status, `e${status}`)))).toEqual({ ok: false, error: `e${status}` });
    }
  });

  it('rethrows anything unexpected so the error boundary handles it', async () => {
    await expect(run(async () => Promise.reject(new ApiError(500, 'server')))).rejects.toThrow('server');
    await expect(run(async () => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
  });
});
```

`frontend/src/app/session/expired/route.test.ts`:

```ts
// @vitest-environment node
import { NextRequest } from 'next/server';
import { GET } from './route';

describe('GET /session/expired', () => {
  it('clears the session cookie and sends the user to login', () => {
    const res = GET(new NextRequest('http://localhost:3000/session/expired'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/login?expired=1');
    expect(res.headers.get('set-cookie')).toMatch(/of_session=;/);
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npm test`
Expected: FAIL. `./api`, `./result` and `./route` can't be found.

- [ ] **Step 3: Implement the session and API modules**

`frontend/src/lib/session-cookie.ts`:

```ts
export const SESSION_COOKIE = 'of_session';
export const SESSION_MAX_AGE = 8 * 60 * 60; // matches the API's JWT lifetime
```

`frontend/src/lib/session.ts`:

```ts
import 'server-only';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, SESSION_MAX_AGE } from './session-cookie';

export async function getToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/** Only callable from Server Actions and Route Handlers (Next 16 rule). */
export async function setSession(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
```

`frontend/src/lib/api.ts`:

```ts
import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { getToken } from './session';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;
type Options = { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown; query?: Query; auth?: boolean };

function apiUrl(path: string, query: Query = {}) {
  const url = new URL(path, process.env.API_URL ?? 'http://localhost:4000');
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }
  return url;
}

/** Server-side call to the NestJS API with the session's bearer token. */
export async function apiFetch<T = unknown>(path: string, { method = 'GET', body, query, auth = true }: Options = {}): Promise<T> {
  const token = auth ? await getToken() : undefined;
  let res: Response;
  try {
    res = await fetch(apiUrl(path, query), {
      method,
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(503, 'Cannot reach the OrderFlow API');
  }
  // Our token was rejected (expired or user deactivated): clear it via the route handler.
  if (res.status === 401 && token) redirect('/session/expired');
  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) throw toApiError(res.status, data);
  return data as T;
}

export function toApiError(status: number, body: unknown): ApiError {
  const { message, statusCode: _statusCode, error: _error, ...details } = (body ?? {}) as Record<string, unknown>;
  const text = Array.isArray(message)
    ? message.join('; ')
    : typeof message === 'string'
      ? message
      : `Request failed (${status})`;
  return new ApiError(status, text, details);
}

/** For detail pages: a missing or malformed id renders the 404 page. */
export async function getOrNotFound<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) notFound();
    throw err;
  }
}
```

`frontend/src/lib/current-user.ts`:

```ts
import 'server-only';
import { cache } from 'react';
import { apiFetch } from './api';
import type { User } from './types';

/** One /auth/me call per request, shared by the layout and pages. */
export const getCurrentUser = cache(() => apiFetch<User>('/auth/me'));
```

`frontend/src/actions/result.ts`:

```ts
import { revalidatePath } from 'next/cache';
import { ApiError } from '@/lib/api';

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };
export type FormAction<T = undefined> = (prev: ActionResult<T> | null, formData: FormData) => Promise<ActionResult<T>>;

const EXPECTED = new Set([400, 401, 403, 404, 409, 503]);

/** Runs an API call; business errors become a result the UI shows, anything else goes to the error boundary. */
export async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    if (err instanceof ApiError && EXPECTED.has(err.status)) return { ok: false, error: err.message };
    throw err;
  }
}

/** Every page is dynamic operational data; after a mutation, refresh them all. */
export function refreshAll() {
  revalidatePath('/', 'layout');
}
```

`frontend/src/actions/form.ts`:

```ts
/** Trimmed text, or undefined when blank (field left unchanged / omitted). */
export function text(fd: FormData, key: string): string | undefined {
  const value = fd.get(key);
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

/** Trimmed text, or null when blank (clears a nullable field on update). */
export function textOrNull(fd: FormData, key: string): string | null {
  return text(fd, key) ?? null;
}

export function num(fd: FormData, key: string): number | undefined {
  const value = text(fd, key);
  return value === undefined ? undefined : Number(value);
}
```

`frontend/src/app/session/expired/route.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session-cookie';

/** Server Components cannot delete cookies, so an API 401 during rendering redirects here. */
export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/login?expired=1', request.url));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
```

`frontend/src/proxy.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session-cookie';

const PUBLIC = ['/login', '/register', '/session/expired'];

/** Presence check only: the API validates the token itself. */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  const login = new URL('/login', request.url);
  if (pathname !== '/') login.searchParams.set('next', pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)'],
};
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `npm test && npm run lint && npm run typecheck`
Expected: all pass (7 files).

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat(frontend): server-only API client, session cookie, action results, expired-session route, proxy" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Auth pages, app shell and navigation

**Files:**
- Create: `frontend/src/components/common/field.tsx`, `frontend/src/actions/auth.ts`, `frontend/src/components/auth/login-form.tsx`, `register-form.tsx`, `frontend/src/components/shell/nav.ts`, `nav-links.tsx`, `bottom-nav.tsx`, `logout-button.tsx`
- Create: `frontend/src/app/(auth)/layout.tsx`, `(auth)/login/page.tsx`, `(auth)/register/page.tsx`, `(app)/layout.tsx`, `(app)/loading.tsx`, `(app)/error.tsx`, `(app)/not-found.tsx`, `(app)/dashboard/page.tsx` (placeholder heading, replaced in Task 6), `src/app/error.tsx`
- Modify: `frontend/src/app/layout.tsx`, `frontend/src/app/page.tsx`
- Test: `frontend/src/components/auth/login-form.test.tsx`, `frontend/src/components/shell/nav.test.ts`

**Interfaces:**
- Consumes: `apiFetch`, `setSession`, `clearSession`, `run`, `text`, `safeNext`, `getCurrentUser`.
- Produces:
  - `Field`, `TextareaField`, `SelectField`, `FormError`, `SubmitButton`, `selectClass`
  - Actions: `login`, `register` (both `FormAction`), `logout()`
  - `NAV`, `navFor(role)`, `activeHref(pathname, items?)`
  - Accessible names used by e2e:
    - Login: labels "Email", "Password", button "Log in".
    - Register: labels "Name", "Email", "Password", button "Create account".
    - Logout button: "Log out" (sidebar on desktop; phone: button "More" → "Log out").

- [ ] **Step 1: Write the failing tests**

`frontend/src/components/shell/nav.test.ts`:

```ts
import { activeHref, navFor } from './nav';

describe('navigation', () => {
  it('highlights the most specific section', () => {
    expect(activeHref('/orders/new')).toBe('/orders/new');
    expect(activeHref('/orders/0b6f-uuid')).toBe('/orders');
    expect(activeHref('/dashboard')).toBe('/dashboard');
    expect(activeHref('/nowhere')).toBeUndefined();
  });

  it('hides admin-only sections from STAFF', () => {
    expect(navFor('STAFF').map((i) => i.href)).not.toContain('/users');
    expect(navFor('ADMIN').map((i) => i.href)).toContain('/users');
  });
});
```

`frontend/src/components/auth/login-form.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './login-form';

describe('LoginForm', () => {
  it('submits credentials with the return path and shows the API error', async () => {
    const action = vi.fn(async () => ({ ok: false as const, error: 'Invalid email or password' }));
    render(<LoginForm action={action} next="/orders" />);
    await userEvent.type(screen.getByLabelText('Email'), 'owner@kedai.my');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    const formData = action.mock.calls[0][1] as FormData;
    expect(formData.get('email')).toBe('owner@kedai.my');
    expect(formData.get('next')).toBe('/orders');
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npm test -- nav login-form`
Expected: FAIL. `./nav` and `./login-form` can't be found.

- [ ] **Step 3: Implement the form primitives, actions and navigation**

`frontend/src/components/common/field.tsx`:

```tsx
'use client';

import { useId, type ComponentProps, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export const selectClass =
  'h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50';

type Base = { label: string; name: string; hint?: string; className?: string };

export function Field({ label, name, hint, className, ...props }: Base & Omit<ComponentProps<'input'>, 'name'>) {
  const id = useId();
  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} {...props} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function TextareaField({ label, name, hint, className, ...props }: Base & Omit<ComponentProps<'textarea'>, 'name'>) {
  const id = useId();
  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} name={name} {...props} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function SelectField({
  label,
  name,
  options,
  className,
  ...props
}: Base & { options: { value: string; label: string }[] } & Omit<ComponentProps<'select'>, 'name'>) {
  const id = useId();
  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      <select id={id} name={name} className={selectClass} {...props}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  );
}

export function SubmitButton({ children, pendingLabel = 'Saving…', className }: { children: ReactNode; pendingLabel?: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
```

`frontend/src/actions/auth.ts`:

```ts
'use server';

import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { safeNext } from '@/lib/safe-next';
import { clearSession, setSession } from '@/lib/session';
import { text } from './form';
import { run, type ActionResult } from './result';

type AuthResponse = { accessToken: string };

export async function login(_: unknown, fd: FormData): Promise<ActionResult> {
  const r = await run(() =>
    apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: { email: text(fd, 'email'), password: String(fd.get('password') ?? '') },
      auth: false,
    }),
  );
  if (!r.ok) return r;
  await setSession(r.data.accessToken);
  redirect(safeNext(fd.get('next')));
}

export async function register(_: unknown, fd: FormData): Promise<ActionResult> {
  const r = await run(() =>
    apiFetch<AuthResponse>('/auth/register', {
      method: 'POST',
      body: { name: text(fd, 'name'), email: text(fd, 'email'), password: String(fd.get('password') ?? '') },
      auth: false,
    }),
  );
  if (!r.ok) return r;
  await setSession(r.data.accessToken);
  redirect('/dashboard');
}

export async function logout() {
  await clearSession();
  redirect('/login');
}
```

`frontend/src/components/auth/login-form.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import type { FormAction } from '@/actions/result';
import { Field, FormError, SubmitButton } from '@/components/common/field';

export function LoginForm({ action, next }: { action: FormAction; next: string }) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="next" value={next} />
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required />
      <FormError message={state && !state.ok ? state.error : null} />
      <SubmitButton pendingLabel="Logging in…">Log in</SubmitButton>
    </form>
  );
}
```

`frontend/src/components/auth/register-form.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import type { FormAction } from '@/actions/result';
import { Field, FormError, SubmitButton } from '@/components/common/field';

export function RegisterForm({ action }: { action: FormAction }) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className="grid gap-4">
      <Field label="Name" name="name" autoComplete="name" required maxLength={100} />
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field label="Password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} hint="At least 8 characters" />
      <FormError message={state && !state.ok ? state.error : null} />
      <SubmitButton pendingLabel="Creating…">Create account</SubmitButton>
    </form>
  );
}
```

`frontend/src/components/shell/nav.ts`:

```ts
import { Boxes, ClipboardList, LayoutDashboard, Package, Plus, UserCog, Users, type LucideIcon } from 'lucide-react';
import type { Role } from '@/lib/types';

export type NavItem = { href: string; label: string; icon: LucideIcon; adminOnly?: boolean };

export const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/orders', label: 'Orders', icon: ClipboardList },
  { href: '/orders/new', label: 'New order', icon: Plus },
  { href: '/inventory', label: 'Inventory', icon: Boxes },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/users', label: 'Users', icon: UserCog, adminOnly: true },
];

export const navFor = (role: Role) => NAV.filter((item) => !item.adminOnly || role === 'ADMIN');

/** Longest matching prefix wins, so /orders/new highlights "New order", not "Orders". */
export function activeHref(pathname: string, items: { href: string }[] = NAV): string | undefined {
  return items
    .map((i) => i.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}
```

`frontend/src/components/shell/nav-links.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Role } from '@/lib/types';
import { cn } from '@/lib/utils';
import { activeHref, navFor } from './nav';

export function NavLinks({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = navFor(role);
  const active = activeHref(pathname, items);
  return (
    <nav aria-label="Main" className="grid gap-1">
      {items.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={href === active ? 'page' : undefined}
          className={cn('flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted', href === active && 'bg-muted font-medium')}
        >
          <Icon className="size-4" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
```

`frontend/src/components/shell/logout-button.tsx`:

```tsx
import { logout } from '@/actions/auth';
import { Button } from '@/components/ui/button';

export function LogoutButton({ className }: { className?: string }) {
  return (
    <form action={logout}>
      <Button type="submit" variant="outline" size="sm" className={className}>
        Log out
      </Button>
    </form>
  );
}
```

`frontend/src/components/shell/bottom-nav.tsx`:

```tsx
'use client';

import { Boxes, ClipboardList, Ellipsis, LayoutDashboard, Plus } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import type { Role } from '@/lib/types';
import { cn } from '@/lib/utils';
import { LogoutButton } from './logout-button';
import { activeHref, navFor } from './nav';

const TABS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/orders', label: 'Orders', icon: ClipboardList },
  { href: '/orders/new', label: 'New', icon: Plus },
  { href: '/inventory', label: 'Stock', icon: Boxes },
];
const MORE = ['/products', '/customers', '/users'];

export function BottomNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const active = activeHref(pathname, TABS);
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-20 grid h-14 grid-cols-5 border-t bg-background md:hidden">
      {TABS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={href === active ? 'page' : undefined}
          className={cn('flex flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground', href === active && 'text-foreground font-medium')}
        >
          <Icon className="size-5" />
          {label}
        </Link>
      ))}
      <Sheet>
        <SheetTrigger className="flex flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground">
          <Ellipsis className="size-5" />
          More
        </SheetTrigger>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
          </SheetHeader>
          <div className="grid gap-1 px-4 pb-6">
            {navFor(role)
              .filter((item) => MORE.includes(item.href))
              .map(({ href, label, icon: Icon }) => (
                <SheetClose asChild key={href}>
                  <Link href={href} className="flex items-center gap-3 rounded-md px-3 py-3 hover:bg-muted">
                    <Icon className="size-5" />
                    {label}
                  </Link>
                </SheetClose>
              ))}
            <LogoutButton className="mt-2 h-11 w-full" />
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
```

- [ ] **Step 4: Implement the layouts and pages**

`frontend/src/app/layout.tsx` (replace):

```tsx
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: { default: 'OrderFlow', template: '%s · OrderFlow' },
  description: 'Orders, stock and payments for small businesses',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
```

`frontend/src/app/page.tsx` (replace):

```tsx
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/dashboard');
}
```

`frontend/src/app/error.tsx`:

```tsx
'use client';

export default function RootError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="font-medium">OrderFlow could not load this page.</p>
      <button type="button" onClick={() => retry()} className="rounded-md border px-3 py-2 text-sm">
        Try again
      </button>
    </main>
  );
}
```

`frontend/src/app/(auth)/layout.tsx`:

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">{children}</div>
    </main>
  );
}
```

`frontend/src/app/(auth)/login/page.tsx`:

```tsx
import Link from 'next/link';
import { login } from '@/actions/auth';
import { LoginForm } from '@/components/auth/login-form';
import { safeNext } from '@/lib/safe-next';

export const metadata = { title: 'Log in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; expired?: string }> }) {
  const { next, expired } = await searchParams;
  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-xl font-semibold">Log in to OrderFlow</h1>
        <p className="text-sm text-muted-foreground">Orders, stock and payments in one place.</p>
      </div>
      {expired && (
        <p role="status" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Your session has ended. Please log in again.
        </p>
      )}
      <LoginForm action={login} next={safeNext(next)} />
      <p className="text-sm text-muted-foreground">
        Setting up a new business?{' '}
        <Link href="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
          Create the first account
        </Link>
      </p>
    </div>
  );
}
```

`frontend/src/app/(auth)/register/page.tsx`:

```tsx
import Link from 'next/link';
import { register } from '@/actions/auth';
import { RegisterForm } from '@/components/auth/register-form';

export const metadata = { title: 'Create account' };

export default function RegisterPage() {
  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-xl font-semibold">Create the first account</h1>
        <p className="text-sm text-muted-foreground">The first person to register becomes the admin. After that, admins add staff.</p>
      </div>
      <RegisterForm action={register} />
      <p className="text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
```

`frontend/src/app/(app)/layout.tsx`:

```tsx
import Link from 'next/link';
import { BottomNav } from '@/components/shell/bottom-nav';
import { LogoutButton } from '@/components/shell/logout-button';
import { NavLinks } from '@/components/shell/nav-links';
import { getCurrentUser } from '@/lib/current-user';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <div className="min-h-dvh md:flex">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r bg-muted/30 p-4 md:flex">
        <Link href="/dashboard" className="text-lg font-semibold">
          OrderFlow
        </Link>
        <NavLinks role={user.role} />
        <div className="mt-auto grid gap-2 text-sm">
          <div>
            <p className="font-medium">{user.name}</p>
            <p className="text-muted-foreground">{user.role === 'ADMIN' ? 'Admin' : 'Staff'}</p>
          </div>
          <LogoutButton className="w-full" />
        </div>
      </aside>
      <header className="sticky top-0 z-10 flex h-12 items-center justify-between border-b bg-background px-4 md:hidden">
        <Link href="/dashboard" className="font-semibold">
          OrderFlow
        </Link>
        <span className="text-sm text-muted-foreground">{user.name}</span>
      </header>
      <main className="min-w-0 flex-1 px-4 pb-24 pt-4 md:px-8 md:pb-10 md:pt-6">{children}</main>
      <BottomNav role={user.role} />
    </div>
  );
}
```

`frontend/src/app/(app)/loading.tsx`:

```tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="grid gap-3" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
```

`frontend/src/app/(app)/error.tsx`:

```tsx
'use client';

import { Button } from '@/components/ui/button';

export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center">
      <p className="font-medium">Something went wrong</p>
      <p className="max-w-md text-sm text-muted-foreground">{error.message || 'Please try again.'}</p>
      <Button onClick={() => retry()}>Try again</Button>
    </div>
  );
}
```

`frontend/src/app/(app)/not-found.tsx`:

```tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center">
      <p className="font-medium">We couldn&apos;t find that</p>
      <p className="text-sm text-muted-foreground">It may have been deleted, or the link is wrong.</p>
      <Button asChild variant="outline">
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
```

`frontend/src/app/(app)/dashboard/page.tsx` (temporary until Task 6):

```tsx
export default function DashboardPage() {
  return <h1 className="text-xl font-semibold md:text-2xl">Dashboard</h1>;
}
```

- [ ] **Step 5: Run the tests and watch them pass**

Run: `npm test && npm run lint && npm run typecheck`
Expected: all pass. If `lucide-react` 1.x lacks an icon named here, `typecheck` names it. Swap in the closest icon and record a ruling.

- [ ] **Step 6: Smoke-check the auth flow in the browser**

Run: `docker compose up -d` (from the repo root). Then open http://localhost:3000/orders. Expected: a redirect to `/login?next=%2Forders`. Log in with the seeded `admin@orderflow.local` / `Admin123!` (seed the database first if needed: `docker compose exec backend npm run seed`). You should land on `/orders` (404 until Task 9). Then open `/dashboard` and check the sidebar at desktop width and the bottom tabs at phone width (DevTools device mode).

- [ ] **Step 7: Commit**

```bash
git add frontend
git commit -m "feat(frontend): login, first-user registration, app shell with sidebar and bottom tabs" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Shared display components

**Files:**
- Create: `frontend/src/components/common/page-header.tsx`, `empty-state.tsx`, `money-text.tsx`, `status-badge.tsx`, `pagination.tsx`, `search-input.tsx`, `filter-select.tsx`, `confirm-button.tsx`
- Test: `frontend/src/components/common/pagination.test.tsx`, `status-badge.test.tsx`

**Interfaces:**
- Consumes: `formatRM`, `STATUS_LABEL`, `PAYMENT_LABEL`, `ActionResult`, `selectClass`.
- Produces:
  - `PageHeader({ title, description?, actions? })`
  - `EmptyState({ title, description?, action? })`, `AdminOnly()`
  - `MoneyText({ value, className? })`
  - `StatusBadge({ status })`, `PaymentBadge({ status })`
  - `Pagination({ meta, pathname, params })`
  - `SearchInput({ label, param? = 'search' })`
  - `FilterSelect({ label, param, options })`
  - `ConfirmButton({ label, title, description, confirmLabel, action, successMessage?, variant?, className? })`

- [ ] **Step 1: Write the failing tests**

`frontend/src/components/common/pagination.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { Pagination } from './pagination';

describe('Pagination', () => {
  it('keeps the current filters when moving between pages', () => {
    render(
      <Pagination
        meta={{ page: 2, limit: 20, total: 50, totalPages: 3 }}
        pathname="/orders"
        params={{ status: 'PENDING', search: undefined, page: '2' }}
      />,
    );
    expect(screen.getByRole('link', { name: 'Previous' })).toHaveAttribute('href', '/orders?status=PENDING&page=1');
    expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute('href', '/orders?status=PENDING&page=3');
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
  });

  it('disables Previous on page 1 and renders nothing for a single page', () => {
    const { rerender, container } = render(
      <Pagination meta={{ page: 1, limit: 20, total: 30, totalPages: 2 }} pathname="/orders" params={{}} />,
    );
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    rerender(<Pagination meta={{ page: 1, limit: 20, total: 3, totalPages: 1 }} pathname="/orders" params={{}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

`frontend/src/components/common/status-badge.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { PaymentBadge, StatusBadge } from './status-badge';

describe('badges', () => {
  it('shows human labels for order and payment status', () => {
    render(
      <>
        <StatusBadge status="PACKING" />
        <PaymentBadge status="PARTIAL" />
      </>,
    );
    expect(screen.getByText('Packing')).toBeInTheDocument();
    expect(screen.getByText('Partial')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npm test -- pagination status-badge`
Expected: FAIL. The modules can't be found.

- [ ] **Step 3: Implement**

`frontend/src/components/common/page-header.tsx`:

```tsx
import type { ReactNode } from 'react';

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold md:text-2xl">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
```

`frontend/src/components/common/empty-state.tsx`:

```tsx
import type { ReactNode } from 'react';

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center">
      <p className="font-medium">{title}</p>
      {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

export function AdminOnly() {
  return <EmptyState title="Admins only" description="Ask an admin if you need access to this page." />;
}
```

`frontend/src/components/common/money-text.tsx`:

```tsx
import { formatRM } from '@/lib/money';
import { cn } from '@/lib/utils';

export function MoneyText({ value, className }: { value: string | number; className?: string }) {
  return <span className={cn('tabular-nums', className)}>{formatRM(value)}</span>;
}
```

`frontend/src/components/common/status-badge.tsx`:

```tsx
import { Badge } from '@/components/ui/badge';
import { PAYMENT_LABEL, STATUS_LABEL } from '@/lib/order-status';
import type { OrderStatus, PaymentStatus } from '@/lib/types';

const STATUS_TONE: Record<OrderStatus, string> = {
  PENDING: 'border-amber-300 bg-amber-50 text-amber-800',
  CONFIRMED: 'border-blue-300 bg-blue-50 text-blue-800',
  PACKING: 'border-indigo-300 bg-indigo-50 text-indigo-800',
  READY: 'border-violet-300 bg-violet-50 text-violet-800',
  DELIVERED: 'border-green-300 bg-green-50 text-green-800',
  CANCELLED: 'border-zinc-300 bg-zinc-100 text-zinc-600',
};

const PAYMENT_TONE: Record<PaymentStatus, string> = {
  UNPAID: 'border-red-300 bg-red-50 text-red-800',
  PARTIAL: 'border-amber-300 bg-amber-50 text-amber-800',
  PAID: 'border-green-300 bg-green-50 text-green-800',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant="outline" className={STATUS_TONE[status]}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge variant="outline" className={PAYMENT_TONE[status]}>
      {PAYMENT_LABEL[status]}
    </Badge>
  );
}
```

`frontend/src/components/common/pagination.tsx`:

```tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { Paginated } from '@/lib/types';

type Props = { meta: Paginated<unknown>['meta']; pathname: string; params: Record<string, string | undefined> };

export function Pagination({ meta, pathname, params }: Props) {
  if (meta.totalPages <= 1) return null;
  const href = (page: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
    query.set('page', String(page));
    return `${pathname}?${query}`;
  };
  const hasPrev = meta.page > 1;
  const hasNext = meta.page < meta.totalPages;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-2 py-4">
      {hasPrev ? (
        <Button asChild variant="outline" size="sm">
          <Link href={href(meta.page - 1)}>Previous</Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          Previous
        </Button>
      )}
      <span className="text-sm text-muted-foreground">
        Page {meta.page} of {meta.totalPages}
      </span>
      {hasNext ? (
        <Button asChild variant="outline" size="sm">
          <Link href={href(meta.page + 1)}>Next</Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          Next
        </Button>
      )}
    </nav>
  );
}
```

`frontend/src/components/common/search-input.tsx`:

```tsx
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';

/** Debounced search box that writes `?<param>=` and resets pagination. */
export function SearchInput({ label, param = 'search' }: { label: string; param?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get(param) ?? '');

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      if (value.trim()) next.set(param, value.trim());
      else next.delete(param);
      next.delete('page');
      if (next.toString() !== searchParams.toString()) router.replace(`${pathname}?${next}`);
    }, 300);
    return () => clearTimeout(timer);
  }, [value, param, pathname, router, searchParams]);

  return <Input type="search" aria-label={label} placeholder={label} value={value} onChange={(e) => setValue(e.target.value)} />;
}
```

`frontend/src/components/common/filter-select.tsx`:

```tsx
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useId } from 'react';
import { Label } from '@/components/ui/label';
import { selectClass } from './field';

export function FilterSelect({ label, param, options }: { label: string; param: string; options: { value: string; label: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const id = useId();
  return (
    <div className="grid gap-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <select
        id={id}
        className={selectClass}
        value={searchParams.get(param) ?? ''}
        onChange={(e) => {
          const next = new URLSearchParams(searchParams);
          if (e.target.value) next.set(param, e.target.value);
          else next.delete(param);
          next.delete('page');
          router.replace(`${pathname}?${next}`);
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
```

`frontend/src/components/common/confirm-button.tsx`:

```tsx
'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { ActionResult } from '@/actions/result';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

type Props = {
  label: string;
  title: string;
  description: string;
  confirmLabel: string;
  action: () => Promise<ActionResult | void>;
  successMessage?: string;
  variant?: 'destructive' | 'outline';
  className?: string;
};

export function ConfirmButton({ label, title, description, confirmLabel, action, successMessage, variant = 'outline', className }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const confirm = () =>
    startTransition(async () => {
      const result = await action();
      if (result && !result.ok) {
        toast.error(result.error);
        return;
      }
      if (successMessage) toast.success(successMessage);
      setOpen(false);
    });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} className={className}>
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Keep it
          </Button>
          <Button variant="destructive" disabled={pending} onClick={confirm}>
            {pending ? 'Working…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `npm test && npm run lint && npm run typecheck`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat(frontend): shared page header, badges, money, pagination, URL filters, confirm dialog" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Dashboard (phone and desktop layouts)

**Files:**
- Create: `frontend/src/components/dashboard/attention-cards.tsx`, `recent-orders.tsx`, `low-stock-list.tsx`
- Modify: `frontend/src/app/(app)/dashboard/page.tsx`
- Test: `frontend/src/components/dashboard/attention-cards.test.tsx`

**Interfaces:**
- Consumes: `apiFetch`, `DashboardSummary`, `OrderListItem`, `StockRow`, `formatRM`, badges.
- Produces:
  - `attentionItems(summary): AttentionItem[]`, `AttentionCards({ summary, layout: 'stack' | 'grid' })`
  - Each card is a link with the accessible name `"<label>: <value>"`, e.g. `Completed orders: 1`, `Low-stock products: 1`, `Unpaid orders: 0` (used by e2e).

- [ ] **Step 1: Write the failing test**

`frontend/src/components/dashboard/attention-cards.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import type { DashboardSummary } from '@/lib/types';
import { AttentionCards, attentionItems } from './attention-cards';

const summary: DashboardSummary = {
  todayOrders: 4,
  todaySales: '310.5',
  unpaidOrders: 3,
  outstandingAmount: '8420',
  pendingOrders: 2,
  awaitingFulfilment: 5,
  lowStockProducts: 12,
  completedOrders: 83,
};

describe('AttentionCards', () => {
  it('links each number to the list that explains it', () => {
    const byKey = Object.fromEntries(attentionItems(summary).map((i) => [i.key, i]));
    expect(byKey.unpaid.href).toBe('/orders?paymentStatus=UNPAID,PARTIAL');
    expect(byKey.fulfilment.href).toBe('/orders?status=CONFIRMED,PACKING,READY');
    expect(byKey.lowstock.href).toBe('/inventory?low=1');
    expect(byKey.outstanding.value).toBe('RM 8,420.00');
  });

  it('renders accessible cards', () => {
    render(<AttentionCards summary={summary} layout="stack" />);
    expect(screen.getByRole('link', { name: 'Unpaid orders: 3' })).toHaveAttribute('href', '/orders?paymentStatus=UNPAID,PARTIAL');
    expect(screen.getByRole('link', { name: 'Completed orders: 83' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: "Today's orders: 4 · RM 310.50" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- attention-cards`
Expected: FAIL. The module can't be found.

- [ ] **Step 3: Implement**

`frontend/src/components/dashboard/attention-cards.tsx`:

```tsx
import Link from 'next/link';
import { formatRM } from '@/lib/money';
import type { DashboardSummary } from '@/lib/types';
import { cn } from '@/lib/utils';

type Tone = 'red' | 'amber' | 'blue' | 'green';
export type AttentionItem = { key: string; label: string; value: string; href: string; tone: Tone };

export function attentionItems(s: DashboardSummary): AttentionItem[] {
  return [
    { key: 'unpaid', label: 'Unpaid orders', value: String(s.unpaidOrders), tone: 'red', href: '/orders?paymentStatus=UNPAID,PARTIAL' },
    { key: 'outstanding', label: 'Expected payments', value: formatRM(s.outstandingAmount), tone: 'blue', href: '/orders?paymentStatus=UNPAID,PARTIAL' },
    { key: 'fulfilment', label: 'Awaiting fulfilment', value: String(s.awaitingFulfilment), tone: 'amber', href: '/orders?status=CONFIRMED,PACKING,READY' },
    { key: 'pending', label: 'Pending orders', value: String(s.pendingOrders), tone: 'amber', href: '/orders?status=PENDING' },
    { key: 'lowstock', label: 'Low-stock products', value: String(s.lowStockProducts), tone: 'amber', href: '/inventory?low=1' },
    { key: 'today', label: "Today's orders", value: `${s.todayOrders} · ${formatRM(s.todaySales)}`, tone: 'green', href: '/orders' },
    { key: 'completed', label: 'Completed orders', value: String(s.completedOrders), tone: 'green', href: '/orders?status=DELIVERED' },
  ];
}

const TONE: Record<Tone, string> = {
  red: 'border-l-red-500',
  amber: 'border-l-amber-500',
  blue: 'border-l-blue-500',
  green: 'border-l-green-500',
};

export function AttentionCards({ summary, layout }: { summary: DashboardSummary; layout: 'stack' | 'grid' }) {
  return (
    <ul className={layout === 'stack' ? 'grid gap-2' : 'grid grid-cols-2 gap-3 lg:grid-cols-4'}>
      {attentionItems(summary).map((item) => (
        <li key={item.key}>
          <Link
            href={item.href}
            aria-label={`${item.label}: ${item.value}`}
            className={cn(
              'flex h-full rounded-lg border border-l-4 bg-card p-4 transition-colors hover:bg-muted/50',
              TONE[item.tone],
              layout === 'stack' ? 'items-center justify-between' : 'flex-col gap-1',
            )}
          >
            <span className="text-sm text-muted-foreground">{item.label}</span>
            <span className="text-lg font-semibold tabular-nums">{item.value}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
```

`frontend/src/components/dashboard/recent-orders.tsx`:

```tsx
import Link from 'next/link';
import { MoneyText } from '@/components/common/money-text';
import { PaymentBadge, StatusBadge } from '@/components/common/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { OrderListItem } from '@/lib/types';

export function RecentOrders({ orders }: { orders: OrderListItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent orders</CardTitle>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <Link href={`/orders/${o.id}`} className="font-medium underline-offset-4 hover:underline">
                      {o.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{o.customer.name}</TableCell>
                  <TableCell className="space-x-1">
                    <StatusBadge status={o.status} />
                    <PaymentBadge status={o.paymentStatus} />
                  </TableCell>
                  <TableCell className="text-right">
                    <MoneyText value={o.total} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
```

`frontend/src/components/dashboard/low-stock-list.tsx`:

```tsx
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { StockRow } from '@/lib/types';

export function LowStockList({ items }: { items: StockRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Low stock</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Everything is above its low-stock level.</p>
        ) : (
          <ul className="divide-y">
            {items.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2">
                <Link href={`/products/${p.id}`} className="underline-offset-4 hover:underline">
                  {p.name}
                  <span className="ml-2 text-xs text-muted-foreground">{p.sku}</span>
                </Link>
                <span className="text-sm tabular-nums">
                  <span className="font-semibold text-amber-700">{p.stockQuantity}</span>
                  <span className="text-muted-foreground"> / {p.lowStockThreshold}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
```

`frontend/src/app/(app)/dashboard/page.tsx` (replace):

```tsx
import { PageHeader } from '@/components/common/page-header';
import { AttentionCards } from '@/components/dashboard/attention-cards';
import { LowStockList } from '@/components/dashboard/low-stock-list';
import { RecentOrders } from '@/components/dashboard/recent-orders';
import { apiFetch } from '@/lib/api';
import type { DashboardSummary, OrderListItem, Paginated, StockRow } from '@/lib/types';

export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const [summary, recent, lowStock] = await Promise.all([
    apiFetch<DashboardSummary>('/dashboard/summary'),
    apiFetch<Paginated<OrderListItem>>('/orders', { query: { limit: 5 } }),
    apiFetch<StockRow[]>('/inventory/low-stock'),
  ]);
  return (
    <>
      <PageHeader title="Dashboard" description="What needs your attention" />
      <div className="md:hidden">
        <AttentionCards summary={summary} layout="stack" />
      </div>
      <div className="hidden gap-6 md:grid">
        <AttentionCards summary={summary} layout="grid" />
        <div className="grid gap-6 lg:grid-cols-2">
          <RecentOrders orders={recent.data} />
          <LowStockList items={lowStock} />
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `npm test && npm run lint && npm run typecheck`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat(frontend): dashboard with phone stack and desktop grid layouts" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Customers

**Files:**
- Create: `frontend/src/actions/customers.ts`, `frontend/src/components/customers/customer-form.tsx`, `customer-list.tsx`
- Create: `frontend/src/app/(app)/customers/page.tsx`, `new/page.tsx`, `[id]/page.tsx`
- Test: `frontend/src/components/customers/customer-form.test.tsx`

**Interfaces:**
- Consumes: `apiFetch`, `getOrNotFound`, `getCurrentUser`, `run`, `refreshAll`, `text`, `textOrNull`, the common components.
- Produces:
  - Actions: `createCustomer: FormAction`, `updateCustomer(id): FormAction` (bound), `deleteCustomer(id)`, `searchCustomers(q): Promise<Customer[]>`, `quickAddCustomer({ name, phone? }): Promise<ActionResult<Customer>>`
  - `CustomerForm({ action, customer?, submitLabel })`, with labels "Name", "Phone", "Email", "Address", "Notes"
  - The customer detail page's `h1` is the customer's name.

- [ ] **Step 1: Write the failing test**

`frontend/src/components/customers/customer-form.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Customer } from '@/lib/types';
import { CustomerForm } from './customer-form';

const customer: Customer = {
  id: 'c1',
  name: 'Kedai Runcit Ali',
  phone: '+60123456789',
  email: null,
  address: 'Jalan Pasar, Ipoh',
  notes: null,
  createdAt: '2026-09-29T00:00:00Z',
  updatedAt: '2026-09-29T00:00:00Z',
};

describe('CustomerForm', () => {
  it('prefills an existing customer and confirms a save', async () => {
    const action = vi.fn(async () => ({ ok: true as const, data: undefined }));
    render(<CustomerForm action={action} customer={customer} submitLabel="Save changes" />);
    expect(screen.getByLabelText('Name')).toHaveValue('Kedai Runcit Ali');
    expect(screen.getByLabelText('Address')).toHaveValue('Jalan Pasar, Ipoh');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Saved');
  });

  it('shows the API error', async () => {
    const action = vi.fn(async () => ({ ok: false as const, error: 'email must be an email' }));
    render(<CustomerForm action={action} submitLabel="Save customer" />);
    await userEvent.type(screen.getByLabelText('Name'), 'X');
    await userEvent.click(screen.getByRole('button', { name: 'Save customer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('email must be an email');
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- customer-form`
Expected: FAIL. The module can't be found.

- [ ] **Step 3: Implement**

`frontend/src/actions/customers.ts`:

```ts
'use server';

import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import type { Customer, Paginated } from '@/lib/types';
import { text, textOrNull } from './form';
import { refreshAll, run, type ActionResult } from './result';

function customerBody(fd: FormData, updating: boolean) {
  const optional = updating ? textOrNull : text; // blank clears on update, is omitted on create
  return {
    name: text(fd, 'name'),
    phone: optional(fd, 'phone'),
    email: optional(fd, 'email'),
    address: optional(fd, 'address'),
    notes: optional(fd, 'notes'),
  };
}

export async function createCustomer(_: unknown, fd: FormData): Promise<ActionResult> {
  const r = await run(() => apiFetch<Customer>('/customers', { method: 'POST', body: customerBody(fd, false) }));
  if (!r.ok) return r;
  refreshAll();
  redirect(`/customers/${r.data.id}`);
}

export async function updateCustomer(id: string, _: unknown, fd: FormData): Promise<ActionResult> {
  const r = await run(() => apiFetch<Customer>(`/customers/${id}`, { method: 'PATCH', body: customerBody(fd, true) }));
  if (!r.ok) return r;
  refreshAll();
  return { ok: true, data: undefined };
}

export async function deleteCustomer(id: string): Promise<ActionResult> {
  const r = await run(() => apiFetch(`/customers/${id}`, { method: 'DELETE' }));
  if (!r.ok) return r;
  refreshAll();
  redirect('/customers');
}

export async function searchCustomers(query: string): Promise<Customer[]> {
  if (!query.trim()) return [];
  const r = await apiFetch<Paginated<Customer>>('/customers', { query: { search: query.trim(), limit: 8 } });
  return r.data;
}

/** Inline "new WhatsApp customer" from the order composer. */
export async function quickAddCustomer(input: { name: string; phone?: string }): Promise<ActionResult<Customer>> {
  const r = await run(() =>
    apiFetch<Customer>('/customers', {
      method: 'POST',
      body: { name: input.name.trim(), phone: input.phone?.trim() || undefined },
    }),
  );
  if (r.ok) refreshAll();
  return r;
}
```

`frontend/src/components/customers/customer-form.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import type { FormAction } from '@/actions/result';
import { Field, FormError, SubmitButton, TextareaField } from '@/components/common/field';
import type { Customer } from '@/lib/types';

export function CustomerForm({ action, customer, submitLabel }: { action: FormAction; customer?: Customer; submitLabel: string }) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className="grid max-w-xl gap-4">
      <Field label="Name" name="name" required maxLength={200} defaultValue={customer?.name} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone" name="phone" type="tel" inputMode="tel" pattern="[0-9+\-\s()]{6,20}" defaultValue={customer?.phone ?? ''} />
        <Field label="Email" name="email" type="email" defaultValue={customer?.email ?? ''} />
      </div>
      <TextareaField label="Address" name="address" rows={2} maxLength={500} defaultValue={customer?.address ?? ''} />
      <TextareaField label="Notes" name="notes" rows={2} maxLength={1000} defaultValue={customer?.notes ?? ''} />
      <FormError message={state && !state.ok ? state.error : null} />
      {state?.ok && (
        <p role="status" className="text-sm text-green-700">
          Saved
        </p>
      )}
      <SubmitButton className="justify-self-start">{submitLabel}</SubmitButton>
    </form>
  );
}
```

`frontend/src/components/customers/customer-list.tsx`:

```tsx
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Customer } from '@/lib/types';

export function CustomerList({ customers }: { customers: Customer[] }) {
  return (
    <>
      <ul className="grid gap-2 md:hidden">
        {customers.map((c) => (
          <li key={c.id}>
            <Link href={`/customers/${c.id}`} className="block rounded-lg border bg-card p-3">
              <p className="font-medium">{c.name}</p>
              <p className="text-sm text-muted-foreground">{[c.phone, c.email].filter(Boolean).join(' · ') || 'No contact details'}</p>
            </Link>
          </li>
        ))}
      </ul>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Link href={`/customers/${c.id}`} className="font-medium underline-offset-4 hover:underline">
                    {c.name}
                  </Link>
                </TableCell>
                <TableCell>{c.phone}</TableCell>
                <TableCell>{c.email}</TableCell>
                <TableCell className="max-w-xs truncate">{c.address}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
```

`frontend/src/app/(app)/customers/page.tsx`:

```tsx
import Link from 'next/link';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { Pagination } from '@/components/common/pagination';
import { SearchInput } from '@/components/common/search-input';
import { CustomerList } from '@/components/customers/customer-list';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import type { Customer, Paginated } from '@/lib/types';

export const metadata = { title: 'Customers' };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ search?: string; page?: string }> }) {
  const { search, page } = await searchParams;
  const result = await apiFetch<Paginated<Customer>>('/customers', { query: { search, page, limit: 20 } });
  return (
    <>
      <PageHeader
        title="Customers"
        actions={
          <Button asChild>
            <Link href="/customers/new">New customer</Link>
          </Button>
        }
      />
      <div className="mb-4 max-w-md">
        <SearchInput label="Search customers" />
      </div>
      {result.data.length === 0 ? (
        <EmptyState title="No customers found" description={search ? 'Try a different name, phone or email.' : 'Add your first customer.'} />
      ) : (
        <CustomerList customers={result.data} />
      )}
      <Pagination meta={result.meta} pathname="/customers" params={{ search, page }} />
    </>
  );
}
```

`frontend/src/app/(app)/customers/new/page.tsx`:

```tsx
import { createCustomer } from '@/actions/customers';
import { PageHeader } from '@/components/common/page-header';
import { CustomerForm } from '@/components/customers/customer-form';

export const metadata = { title: 'New customer' };

export default function NewCustomerPage() {
  return (
    <>
      <PageHeader title="New customer" />
      <CustomerForm action={createCustomer} submitLabel="Save customer" />
    </>
  );
}
```

`frontend/src/app/(app)/customers/[id]/page.tsx`:

```tsx
import Link from 'next/link';
import { deleteCustomer, updateCustomer } from '@/actions/customers';
import { ConfirmButton } from '@/components/common/confirm-button';
import { MoneyText } from '@/components/common/money-text';
import { PageHeader } from '@/components/common/page-header';
import { Pagination } from '@/components/common/pagination';
import { PaymentBadge, StatusBadge } from '@/components/common/status-badge';
import { CustomerForm } from '@/components/customers/customer-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiFetch, getOrNotFound } from '@/lib/api';
import { getCurrentUser } from '@/lib/current-user';
import { formatDate } from '@/lib/dates';
import type { CustomerDetail, OrderSummary, Paginated } from '@/lib/types';

export default async function CustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const { page } = await searchParams;
  const [customer, orders, user] = await Promise.all([
    getOrNotFound(apiFetch<CustomerDetail>(`/customers/${id}`)),
    getOrNotFound(apiFetch<Paginated<OrderSummary>>(`/customers/${id}/orders`, { query: { page } })),
    getCurrentUser(),
  ]);
  return (
    <>
      <PageHeader
        title={customer.name}
        description={[customer.phone, customer.email].filter(Boolean).join(' · ')}
        actions={
          user.role === 'ADMIN' && (
            <ConfirmButton
              label="Delete customer"
              title="Delete this customer?"
              description="Their past orders stay; the customer is hidden from lists and new orders."
              confirmLabel="Yes, delete"
              action={deleteCustomer.bind(null, id)}
            />
          )
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerForm action={updateCustomer.bind(null, id)} customer={customer} submitLabel="Save changes" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders yet.</p>
            ) : (
              <ul className="divide-y">
                {orders.data.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <Link href={`/orders/${o.id}`} className="font-medium underline-offset-4 hover:underline">
                      {o.orderNumber}
                    </Link>
                    <span className="text-sm text-muted-foreground">{formatDate(o.createdAt)}</span>
                    <span className="flex gap-1">
                      <StatusBadge status={o.status} />
                      <PaymentBadge status={o.paymentStatus} />
                    </span>
                    <MoneyText value={o.total} />
                  </li>
                ))}
              </ul>
            )}
            <Pagination meta={orders.meta} pathname={`/customers/${id}`} params={{ page }} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `npm test && npm run lint && npm run typecheck`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat(frontend): customers list, create, edit, delete and order history" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Products and inventory

**Files:**
- Create: `frontend/src/actions/products.ts`, `frontend/src/actions/inventory.ts`
- Create: `frontend/src/components/products/product-form.tsx`, `product-list.tsx`, `stock-ledger.tsx`, `frontend/src/components/inventory/stock-list.tsx`, `adjust-stock.tsx`
- Create: `frontend/src/app/(app)/products/page.tsx`, `new/page.tsx`, `[id]/page.tsx`, `frontend/src/app/(app)/inventory/page.tsx`
- Test: `frontend/src/components/inventory/adjust-stock.test.tsx`

**Interfaces:**
- Consumes: the common components, `apiFetch`, `getOrNotFound`, `getCurrentUser`, `run`, `refreshAll`, `text`, `textOrNull`, `num`.
- Produces:
  - Actions: `createProduct: FormAction`, `updateProduct(id): FormAction`, `deactivateProduct(id)`, `searchProducts(q): Promise<Product[]>` (active only), `adjustStock: FormAction`
  - Product form labels: "Name", "SKU", "Description", "Selling price (RM)", "Cost price (RM)", "Opening stock", "Low-stock threshold". Buttons "Save product" / "Save changes". The products list shows a "New product" link only to ADMIN.
  - Inventory: each stock number carries `data-testid="stock-<SKU>"`. The ADMIN-only button is named `Adjust stock for <product name>`. The dialog has "Type", "Quantity", "Note" and "Save adjustment".

- [ ] **Step 1: Write the failing test**

`frontend/src/components/inventory/adjust-stock.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdjustStockForm } from './adjust-stock';

vi.mock('@/actions/inventory', () => ({ adjustStock: vi.fn() }));

describe('AdjustStockForm', () => {
  it('asks for a positive restock and an explained adjustment', async () => {
    const action = vi.fn(async () => ({ ok: true as const, data: undefined }));
    render(<AdjustStockForm action={action} productId="p1" />);
    expect(screen.getByLabelText('Quantity')).toHaveAttribute('min', '1');
    expect(screen.getByLabelText('Note')).not.toBeRequired();

    await userEvent.selectOptions(screen.getByLabelText('Type'), 'ADJUSTMENT');
    expect(screen.getByLabelText('Quantity')).not.toHaveAttribute('min');
    expect(screen.getByLabelText('Note')).toBeRequired();
  });

  it('sends the product id with the adjustment', async () => {
    const action = vi.fn(async () => ({ ok: true as const, data: undefined }));
    const onDone = vi.fn();
    render(<AdjustStockForm action={action} productId="p1" onDone={onDone} />);
    await userEvent.type(screen.getByLabelText('Quantity'), '5');
    await userEvent.click(screen.getByRole('button', { name: 'Save adjustment' }));
    const fd = action.mock.calls[0][1] as FormData;
    expect(fd.get('productId')).toBe('p1');
    expect(fd.get('type')).toBe('RESTOCK');
    expect(fd.get('quantity')).toBe('5');
    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- adjust-stock`
Expected: FAIL. `./adjust-stock` can't be found.

- [ ] **Step 3: Implement the actions**

`frontend/src/actions/products.ts`:

```ts
'use server';

import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import type { Paginated, Product } from '@/lib/types';
import { num, text, textOrNull } from './form';
import { refreshAll, run, type ActionResult } from './result';

function productBody(fd: FormData, creating: boolean) {
  return {
    name: text(fd, 'name'),
    sku: text(fd, 'sku'),
    description: creating ? text(fd, 'description') : textOrNull(fd, 'description'),
    sellingPrice: num(fd, 'sellingPrice'),
    costPrice: num(fd, 'costPrice'),
    lowStockThreshold: num(fd, 'lowStockThreshold'),
    ...(creating && { stockQuantity: num(fd, 'stockQuantity') }),
  };
}

export async function createProduct(_: unknown, fd: FormData): Promise<ActionResult> {
  const r = await run(() => apiFetch<Product>('/products', { method: 'POST', body: productBody(fd, true) }));
  if (!r.ok) return r;
  refreshAll();
  redirect(`/products/${r.data.id}`);
}

export async function updateProduct(id: string, _: unknown, fd: FormData): Promise<ActionResult> {
  const r = await run(() => apiFetch<Product>(`/products/${id}`, { method: 'PATCH', body: productBody(fd, false) }));
  if (!r.ok) return r;
  refreshAll();
  return { ok: true, data: undefined };
}

export async function deactivateProduct(id: string): Promise<ActionResult> {
  const r = await run(() => apiFetch(`/products/${id}`, { method: 'DELETE' }));
  if (!r.ok) return r;
  refreshAll();
  return { ok: true, data: undefined };
}

export async function searchProducts(query: string): Promise<Product[]> {
  if (!query.trim()) return [];
  const r = await apiFetch<Paginated<Product>>('/products', { query: { search: query.trim(), active: true, limit: 10 } });
  return r.data;
}
```

`frontend/src/actions/inventory.ts`:

```ts
'use server';

import { apiFetch } from '@/lib/api';
import { num, text } from './form';
import { refreshAll, run, type ActionResult } from './result';

export async function adjustStock(_: unknown, fd: FormData): Promise<ActionResult> {
  const r = await run(() =>
    apiFetch('/inventory/adjustments', {
      method: 'POST',
      body: { productId: text(fd, 'productId'), type: text(fd, 'type'), quantity: num(fd, 'quantity'), note: text(fd, 'note') },
    }),
  );
  if (!r.ok) return r;
  refreshAll();
  return { ok: true, data: undefined };
}
```

- [ ] **Step 4: Implement the components**

`frontend/src/components/inventory/adjust-stock.tsx`:

```tsx
'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { adjustStock } from '@/actions/inventory';
import type { FormAction } from '@/actions/result';
import { Field, FormError, SelectField, SubmitButton, TextareaField } from '@/components/common/field';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

type AdjustType = 'RESTOCK' | 'ADJUSTMENT';

export function AdjustStockForm({ action, productId, onDone }: { action: FormAction; productId: string; onDone?: () => void }) {
  const [state, formAction] = useActionState(action, null);
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
    <form action={formAction} className="grid gap-3">
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
        hint={type === 'ADJUSTMENT' ? 'Use a negative number to remove stock, e.g. -2' : undefined}
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
      <SubmitButton>Save adjustment</SubmitButton>
    </form>
  );
}

export function AdjustStockDialog({ product }: { product: { id: string; name: string; stockQuantity: number } }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" aria-label={`Adjust stock for ${product.name}`}>
          Adjust
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>
            {product.name} · {product.stockQuantity} in stock
          </DialogDescription>
        </DialogHeader>
        <AdjustStockForm action={adjustStock} productId={product.id} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
```

`frontend/src/components/inventory/stock-list.tsx`:

```tsx
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { StockRow } from '@/lib/types';
import { AdjustStockDialog } from './adjust-stock';

const isLow = (r: StockRow) => r.isLow ?? r.stockQuantity <= r.lowStockThreshold;

function LowBadge() {
  return (
    <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
      Low
    </Badge>
  );
}

export function StockList({ rows, isAdmin }: { rows: StockRow[]; isAdmin: boolean }) {
  return (
    <>
      <ul className="grid gap-2 md:hidden">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-2 rounded-lg border bg-card p-3">
            <div className="min-w-0">
              <Link href={`/products/${r.id}`} className="font-medium">
                {r.name}
              </Link>
              <p className="text-xs text-muted-foreground">
                {r.sku} · low at {r.lowStockThreshold}
                {!r.isActive && ' · inactive'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isLow(r) && <LowBadge />}
              <span data-testid={`stock-${r.sku}`} className="text-lg font-semibold tabular-nums">
                {r.stockQuantity}
              </span>
              {isAdmin && <AdjustStockDialog product={r} />}
            </div>
          </li>
        ))}
      </ul>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">In stock</TableHead>
              <TableHead className="text-right">Low at</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Link href={`/products/${r.id}`} className="font-medium underline-offset-4 hover:underline">
                    {r.name}
                  </Link>
                  {!r.isActive && <span className="ml-2 text-xs text-muted-foreground">inactive</span>}
                </TableCell>
                <TableCell>{r.sku}</TableCell>
                <TableCell className="text-right">
                  <span className="inline-flex items-center gap-2">
                    {isLow(r) && <LowBadge />}
                    <span data-testid={`stock-${r.sku}`} className="font-semibold tabular-nums">
                      {r.stockQuantity}
                    </span>
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">{r.lowStockThreshold}</TableCell>
                <TableCell className="text-right">{isAdmin && <AdjustStockDialog product={r} />}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
```

`frontend/src/components/products/product-form.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import type { FormAction } from '@/actions/result';
import { Field, FormError, SubmitButton, TextareaField } from '@/components/common/field';
import type { Product } from '@/lib/types';

export function ProductForm({ action, product, submitLabel }: { action: FormAction; product?: Product; submitLabel: string }) {
  const [state, formAction] = useActionState(action, null);
  const creating = !product;
  return (
    <form action={formAction} className="grid max-w-xl gap-4">
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
      <SubmitButton className="justify-self-start">{submitLabel}</SubmitButton>
    </form>
  );
}
```

`frontend/src/components/products/product-list.tsx`:

```tsx
import Link from 'next/link';
import { MoneyText } from '@/components/common/money-text';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Product } from '@/lib/types';

const low = (p: Product) => p.stockQuantity <= p.lowStockThreshold;

export function ProductList({ products }: { products: Product[] }) {
  return (
    <>
      <ul className="grid gap-2 md:hidden">
        {products.map((p) => (
          <li key={p.id}>
            <Link href={`/products/${p.id}`} className="flex items-center justify-between rounded-lg border bg-card p-3">
              <span>
                <span className="font-medium">{p.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {p.sku}
                  {!p.isActive && ' · inactive'}
                </span>
              </span>
              <span className="text-right">
                <MoneyText value={p.sellingPrice} className="block font-medium" />
                <span className={low(p) ? 'text-xs text-amber-700' : 'text-xs text-muted-foreground'}>{p.stockQuantity} in stock</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">In stock</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <Link href={`/products/${p.id}`} className="font-medium underline-offset-4 hover:underline">
                    {p.name}
                  </Link>
                </TableCell>
                <TableCell>{p.sku}</TableCell>
                <TableCell className="text-right">
                  <MoneyText value={p.sellingPrice} />
                </TableCell>
                <TableCell className={low(p) ? 'text-right font-semibold text-amber-700' : 'text-right'}>{p.stockQuantity}</TableCell>
                <TableCell>
                  <Badge variant="outline">{p.isActive ? 'Active' : 'Inactive'}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
```

`frontend/src/components/products/stock-ledger.tsx`:

```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/dates';
import type { InventoryTransaction } from '@/lib/types';

const TYPE_LABEL: Record<InventoryTransaction['type'], string> = {
  SALE: 'Sale',
  RESTOCK: 'Restock',
  ADJUSTMENT: 'Adjustment',
  RETURN: 'Returned (cancelled order)',
};

export function StockLedger({ rows }: { rows: InventoryTransaction[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No stock movements yet.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>When</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="text-right">Change</TableHead>
          <TableHead>Note</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((t) => (
          <TableRow key={t.id}>
            <TableCell className="whitespace-nowrap">{formatDateTime(t.createdAt)}</TableCell>
            <TableCell>{TYPE_LABEL[t.type]}</TableCell>
            <TableCell className={t.quantity < 0 ? 'text-right tabular-nums text-red-700' : 'text-right tabular-nums text-green-700'}>
              {t.quantity > 0 ? `+${t.quantity}` : t.quantity}
            </TableCell>
            <TableCell className="text-muted-foreground">{t.note}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 5: Implement the pages**

`frontend/src/app/(app)/products/page.tsx`:

```tsx
import Link from 'next/link';
import { EmptyState } from '@/components/common/empty-state';
import { FilterSelect } from '@/components/common/filter-select';
import { PageHeader } from '@/components/common/page-header';
import { Pagination } from '@/components/common/pagination';
import { SearchInput } from '@/components/common/search-input';
import { ProductList } from '@/components/products/product-list';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { getCurrentUser } from '@/lib/current-user';
import type { Paginated, Product } from '@/lib/types';

export const metadata = { title: 'Products' };

type Search = { search?: string; active?: string; lowStock?: string; page?: string };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const [result, user] = await Promise.all([
    apiFetch<Paginated<Product>>('/products', { query: { ...params, limit: 20 } }),
    getCurrentUser(),
  ]);
  return (
    <>
      <PageHeader
        title="Products"
        actions={
          user.role === 'ADMIN' && (
            <Button asChild>
              <Link href="/products/new">New product</Link>
            </Button>
          )
        }
      />
      <div className="mb-4 grid gap-2 sm:grid-cols-[2fr_1fr_1fr]">
        <div className="self-end">
          <SearchInput label="Search products" />
        </div>
        <FilterSelect
          label="Status"
          param="active"
          options={[
            { value: '', label: 'All' },
            { value: 'true', label: 'Active' },
            { value: 'false', label: 'Inactive' },
          ]}
        />
        <FilterSelect
          label="Stock"
          param="lowStock"
          options={[
            { value: '', label: 'All stock levels' },
            { value: 'true', label: 'Low stock only' },
          ]}
        />
      </div>
      {result.data.length === 0 ? <EmptyState title="No products found" /> : <ProductList products={result.data} />}
      <Pagination meta={result.meta} pathname="/products" params={params} />
    </>
  );
}
```

`frontend/src/app/(app)/products/new/page.tsx`:

```tsx
import { createProduct } from '@/actions/products';
import { AdminOnly } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { ProductForm } from '@/components/products/product-form';
import { getCurrentUser } from '@/lib/current-user';

export const metadata = { title: 'New product' };

export default async function NewProductPage() {
  const user = await getCurrentUser();
  if (user.role !== 'ADMIN') return <AdminOnly />;
  return (
    <>
      <PageHeader title="New product" />
      <ProductForm action={createProduct} submitLabel="Save product" />
    </>
  );
}
```

`frontend/src/app/(app)/products/[id]/page.tsx`:

```tsx
import { deactivateProduct, updateProduct } from '@/actions/products';
import { ConfirmButton } from '@/components/common/confirm-button';
import { MoneyText } from '@/components/common/money-text';
import { PageHeader } from '@/components/common/page-header';
import { Pagination } from '@/components/common/pagination';
import { ProductForm } from '@/components/products/product-form';
import { StockLedger } from '@/components/products/stock-ledger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiFetch, getOrNotFound } from '@/lib/api';
import { getCurrentUser } from '@/lib/current-user';
import type { Ledger, Product } from '@/lib/types';

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const { page } = await searchParams;
  const [product, ledger, user] = await Promise.all([
    getOrNotFound(apiFetch<Product>(`/products/${id}`)),
    getOrNotFound(apiFetch<Ledger>(`/inventory/${id}`, { query: { page } })),
    getCurrentUser(),
  ]);
  const isAdmin = user.role === 'ADMIN';
  return (
    <>
      <PageHeader
        title={product.name}
        description={`${product.sku}${product.isActive ? '' : ' · inactive'}`}
        actions={
          isAdmin &&
          product.isActive && (
            <ConfirmButton
              label="Deactivate"
              title="Deactivate this product?"
              description="It stays on past orders but can't be added to new ones."
              confirmLabel="Yes, deactivate"
              successMessage="Product deactivated"
              action={deactivateProduct.bind(null, id)}
            />
          )
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{isAdmin ? 'Details' : 'Price and stock'}</CardTitle>
          </CardHeader>
          <CardContent>
            {isAdmin ? (
              <ProductForm action={updateProduct.bind(null, id)} product={product} submitLabel="Save changes" />
            ) : (
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <dt className="text-muted-foreground">Price</dt>
                <dd>
                  <MoneyText value={product.sellingPrice} />
                </dd>
                <dt className="text-muted-foreground">In stock</dt>
                <dd>{product.stockQuantity}</dd>
              </dl>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Stock history</CardTitle>
          </CardHeader>
          <CardContent>
            <StockLedger rows={ledger.transactions.data} />
            <Pagination meta={ledger.transactions.meta} pathname={`/products/${id}`} params={{ page }} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
```

`frontend/src/app/(app)/inventory/page.tsx`:

```tsx
import Link from 'next/link';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { Pagination } from '@/components/common/pagination';
import { StockList } from '@/components/inventory/stock-list';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { getCurrentUser } from '@/lib/current-user';
import type { Paginated, StockRow } from '@/lib/types';

export const metadata = { title: 'Inventory' };

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ low?: string; page?: string }> }) {
  const { low, page } = await searchParams;
  const onlyLow = low === '1';
  const [result, user] = await Promise.all([
    onlyLow
      ? apiFetch<StockRow[]>('/inventory/low-stock').then((data) => ({ data, meta: null }))
      : apiFetch<Paginated<StockRow>>('/inventory', { query: { page, limit: 50 } }),
    getCurrentUser(),
  ]);
  return (
    <>
      <PageHeader
        title="Inventory"
        description={onlyLow ? 'Products at or below their low-stock level' : 'Current stock for every product'}
        actions={
          <Button asChild variant="outline">
            <Link href={onlyLow ? '/inventory' : '/inventory?low=1'}>{onlyLow ? 'Show all' : 'Low stock only'}</Link>
          </Button>
        }
      />
      {result.data.length === 0 ? (
        <EmptyState title={onlyLow ? 'Nothing is low on stock' : 'No products yet'} />
      ) : (
        <StockList rows={result.data} isAdmin={user.role === 'ADMIN'} />
      )}
      {result.meta && <Pagination meta={result.meta} pathname="/inventory" params={{ page }} />}
    </>
  );
}
```

- [ ] **Step 6: Run the tests and watch them pass**

Run: `npm test && npm run lint && npm run typecheck`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add frontend
git commit -m "feat(frontend): products and inventory with stock ledger and admin adjustments" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Orders list (phone cards and desktop table)

**Files:**
- Create: `frontend/src/components/orders/order-cards.tsx`, `orders-table.tsx`, `order-filters.tsx`, `frontend/src/app/(app)/orders/page.tsx`
- Test: `frontend/src/components/orders/order-list.test.tsx`

**Interfaces:**
- Consumes: badges, `MoneyText`, `formatDate`, `SearchInput`, `FilterSelect`, `Pagination`.
- Produces: `OrderCards({ orders })`, `OrdersTable({ orders })`, `OrderFilters()`.

- [ ] **Step 1: Write the failing test**

`frontend/src/components/orders/order-list.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react';
import type { OrderListItem } from '@/lib/types';
import { OrderCards } from './order-cards';
import { OrdersTable } from './orders-table';

const order: OrderListItem = {
  id: 'o1',
  orderNumber: 'ORD-20260929-0001',
  status: 'CONFIRMED',
  paymentStatus: 'PARTIAL',
  subtotal: '100.00',
  discount: '0.00',
  total: '100.00',
  paidAmount: '30.00',
  outstandingAmount: '70.00',
  notes: null,
  createdAt: '2026-09-29T03:00:00Z',
  customer: { id: 'c1', name: 'Kedai Runcit Ali' },
};

describe('order lists', () => {
  it('phone cards link to the order and show both statuses', () => {
    render(<OrderCards orders={[order]} />);
    const card = screen.getByRole('link', { name: /ORD-20260929-0001/ });
    expect(card).toHaveAttribute('href', '/orders/o1');
    expect(within(card).getByText('Confirmed')).toBeInTheDocument();
    expect(within(card).getByText('Partial')).toBeInTheDocument();
    expect(within(card).getByText('RM 100.00')).toBeInTheDocument();
  });

  it('desktop table shows the outstanding amount', () => {
    render(<OrdersTable orders={[order]} />);
    expect(screen.getByRole('link', { name: 'ORD-20260929-0001' })).toHaveAttribute('href', '/orders/o1');
    expect(screen.getByText('RM 70.00')).toBeInTheDocument();
    expect(screen.getByText('Kedai Runcit Ali')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- order-list`
Expected: FAIL. The modules can't be found.

- [ ] **Step 3: Implement**

`frontend/src/components/orders/order-cards.tsx`:

```tsx
import Link from 'next/link';
import { MoneyText } from '@/components/common/money-text';
import { PaymentBadge, StatusBadge } from '@/components/common/status-badge';
import { formatDate } from '@/lib/dates';
import type { OrderListItem } from '@/lib/types';

export function OrderCards({ orders }: { orders: OrderListItem[] }) {
  return (
    <ul className="grid gap-2">
      {orders.map((o) => (
        <li key={o.id}>
          <Link href={`/orders/${o.id}`} className="block rounded-lg border bg-card p-3 active:bg-muted">
            <div className="flex items-center justify-between">
              <span className="font-medium">{o.orderNumber}</span>
              <MoneyText value={o.total} className="font-semibold" />
            </div>
            <div className="mt-1 flex items-center justify-between text-sm text-muted-foreground">
              <span>{o.customer.name}</span>
              <span>{formatDate(o.createdAt)}</span>
            </div>
            <div className="mt-2 flex gap-2">
              <StatusBadge status={o.status} />
              <PaymentBadge status={o.paymentStatus} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
```

`frontend/src/components/orders/orders-table.tsx`:

```tsx
import Link from 'next/link';
import { MoneyText } from '@/components/common/money-text';
import { PaymentBadge, StatusBadge } from '@/components/common/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/dates';
import type { OrderListItem } from '@/lib/types';

export function OrdersTable({ orders }: { orders: OrderListItem[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Payment</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="text-right">Outstanding</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((o) => (
          <TableRow key={o.id}>
            <TableCell>
              <Link href={`/orders/${o.id}`} className="font-medium underline-offset-4 hover:underline">
                {o.orderNumber}
              </Link>
            </TableCell>
            <TableCell>{o.customer.name}</TableCell>
            <TableCell className="whitespace-nowrap">{formatDate(o.createdAt)}</TableCell>
            <TableCell>
              <StatusBadge status={o.status} />
            </TableCell>
            <TableCell>
              <PaymentBadge status={o.paymentStatus} />
            </TableCell>
            <TableCell className="text-right">
              <MoneyText value={o.total} />
            </TableCell>
            <TableCell className="text-right">
              <MoneyText value={o.outstandingAmount} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

`frontend/src/components/orders/order-filters.tsx`:

```tsx
import { FilterSelect } from '@/components/common/filter-select';
import { SearchInput } from '@/components/common/search-input';

export function OrderFilters() {
  return (
    <div className="mb-4 grid gap-2 sm:grid-cols-[2fr_1fr_1fr]">
      <div className="self-end">
        <SearchInput label="Search orders" />
      </div>
      <FilterSelect
        label="Status"
        param="status"
        options={[
          { value: '', label: 'All statuses' },
          { value: 'PENDING', label: 'Pending' },
          { value: 'CONFIRMED,PACKING,READY', label: 'Awaiting fulfilment' },
          { value: 'CONFIRMED', label: 'Confirmed' },
          { value: 'PACKING', label: 'Packing' },
          { value: 'READY', label: 'Ready' },
          { value: 'DELIVERED', label: 'Delivered' },
          { value: 'CANCELLED', label: 'Cancelled' },
        ]}
      />
      <FilterSelect
        label="Payment"
        param="paymentStatus"
        options={[
          { value: '', label: 'All payments' },
          { value: 'UNPAID,PARTIAL', label: 'Not fully paid' },
          { value: 'UNPAID', label: 'Unpaid' },
          { value: 'PARTIAL', label: 'Partial' },
          { value: 'PAID', label: 'Paid' },
        ]}
      />
    </div>
  );
}
```

`frontend/src/app/(app)/orders/page.tsx`:

```tsx
import Link from 'next/link';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { Pagination } from '@/components/common/pagination';
import { OrderCards } from '@/components/orders/order-cards';
import { OrderFilters } from '@/components/orders/order-filters';
import { OrdersTable } from '@/components/orders/orders-table';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import type { OrderListItem, Paginated } from '@/lib/types';

export const metadata = { title: 'Orders' };

type Search = { status?: string; paymentStatus?: string; search?: string; page?: string };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { status, paymentStatus, search, page } = await searchParams;
  const params = { status, paymentStatus, search, page };
  const result = await apiFetch<Paginated<OrderListItem>>('/orders', { query: { ...params, limit: 20 } });
  const filtered = Boolean(status || paymentStatus || search);
  return (
    <>
      <PageHeader
        title="Orders"
        actions={
          <Button asChild>
            <Link href="/orders/new">New order</Link>
          </Button>
        }
      />
      <OrderFilters />
      {result.data.length === 0 ? (
        <EmptyState
          title={filtered ? 'No orders match these filters' : 'No orders yet'}
          description={filtered ? 'Try clearing a filter.' : 'Orders you take on WhatsApp or the phone go here.'}
        />
      ) : (
        <>
          <div className="md:hidden">
            <OrderCards orders={result.data} />
          </div>
          <div className="hidden md:block">
            <OrdersTable orders={result.data} />
          </div>
        </>
      )}
      <Pagination meta={result.meta} pathname="/orders" params={params} />
    </>
  );
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `npm test && npm run lint && npm run typecheck`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat(frontend): orders list with phone cards, desktop table and URL filters" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Order composer (new and edit, phone steps and desktop single screen)

**Files:**
- Create: `frontend/src/actions/orders.ts`, `frontend/src/lib/use-debounced-search.ts`
- Create: `frontend/src/components/orders/order-draft.ts`, `composer-types.ts`, `composer-parts.tsx`, `customer-picker.tsx`, `product-picker.tsx`, `line-items.tsx`, `phone-composer.tsx`, `desktop-composer.tsx`, `order-composer.tsx`
- Create: `frontend/src/app/(app)/orders/new/page.tsx`, `frontend/src/app/(app)/orders/[id]/edit/page.tsx`
- Test: `frontend/src/components/orders/order-draft.test.ts`, `order-composer.test.tsx`

**Interfaces:**
- Consumes: `searchCustomers`, `quickAddCustomer` (Task 7), `searchProducts` (Task 8), `toSen`, `fromSen`, `formatRM`, `canEdit`, `Field`, `FormError`.
- Produces:
  - Actions: `createOrder(input: OrderInput): Promise<ActionResult<{ id: string; stockWarnings: StockWarning[] }>>`, `updateOrder(id, input)` (same result), `changeOrderStatus(id, status): Promise<ActionResult>`, `deleteOrder(id)`
  - `Draft`, `DraftLine`, `DraftAction`, `emptyDraft`, `draftReducer`, `draftTotals(draft): DraftTotals`, `draftToInput(draft): OrderInput`
  - `OrderComposer({ mode, initial?, submit })`
  - Accessible names used by e2e:
    - Search boxes "Search customers" and "Search products". Customer results are buttons named by customer name (plus phone). Product results are buttons named `Add <name>`.
    - Steppers `Increase <name>` / `Decrease <name>`, and the quantity input `Quantity for <name>`.
    - The "Discount (RM)" input.
    - `<output aria-label="Order total">`, which has role `status`.
    - Phone steps "Next: items" and "Next: review".
    - Submit "Create order" (edit: "Save changes").

- [ ] **Step 1: Write the failing tests**

`frontend/src/components/orders/order-draft.test.ts`:

```ts
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
```

`frontend/src/components/orders/order-composer.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Draft } from './order-draft';
import { OrderComposer } from './order-composer';

const { push, toast } = vi.hoisted(() => ({
  push: vi.fn(),
  toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('sonner', () => ({ toast }));
vi.mock('@/actions/customers', () => ({
  searchCustomers: vi.fn(async () => [{ id: 'c1', name: 'Kedai Runcit Ali', phone: '+60123456789' }]),
  quickAddCustomer: vi.fn(),
}));
vi.mock('@/actions/products', () => ({ searchProducts: vi.fn(async () => []) }));

const ready: Draft = {
  customer: { id: 'c1', name: 'Kedai Runcit Ali' },
  lines: [{ productId: 'p1', name: 'Coke', sku: 'COKE-24', unitPrice: '12.50', stock: 1, quantity: 1 }],
  discount: '',
  notes: '',
};

beforeEach(() => {
  push.mockReset();
  Object.values(toast).forEach((f) => f.mockReset());
});

describe('OrderComposer', () => {
  it('keeps phone and desktop views in sync (resizing never loses the draft)', async () => {
    render(<OrderComposer mode="create" initial={ready} submit={vi.fn()} />);
    const totals = screen.getAllByRole('status', { name: 'Order total' });
    expect(totals).toHaveLength(2); // phone bottom bar + desktop summary
    totals.forEach((t) => expect(t).toHaveTextContent('RM 12.50'));

    await userEvent.click(screen.getByRole('button', { name: 'Increase Coke' })); // desktop line editor
    screen.getAllByRole('status', { name: 'Order total' }).forEach((t) => expect(t).toHaveTextContent('RM 25.00'));
  });

  it('submits once even when tapped twice, then opens the order with a stock warning', async () => {
    let resolve!: (v: unknown) => void;
    const submit = vi.fn(() => new Promise((r) => (resolve = r)));
    render(<OrderComposer mode="create" initial={ready} submit={submit as never} />);
    const [phoneSubmit] = screen.getAllByRole('button', { name: 'Create order' });
    await userEvent.click(phoneSubmit);
    await userEvent.click(phoneSubmit);
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledWith({ customerId: 'c1', items: [{ productId: 'p1', quantity: 1 }], discount: 0, notes: null });

    resolve({ ok: true, data: { id: 'o1', stockWarnings: [{ productId: 'p1', sku: 'COKE-24', requested: 2, available: 1 }] } });
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/orders/o1'));
    expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining('COKE-24'));
  });

  it('shows the API error and stays on the page', async () => {
    const submit = vi.fn(async () => ({ ok: false as const, error: 'Product COKE-24 is inactive' }));
    render(<OrderComposer mode="create" initial={ready} submit={submit} />);
    await userEvent.click(screen.getAllByRole('button', { name: 'Create order' })[1]);
    expect((await screen.findAllByRole('alert'))[0]).toHaveTextContent('Product COKE-24 is inactive');
    expect(push).not.toHaveBeenCalled();
  });

  it('picks a customer from search on an empty draft', async () => {
    render(<OrderComposer mode="create" submit={vi.fn()} />);
    const [phoneSearch] = screen.getAllByRole('searchbox', { name: 'Search customers' });
    await userEvent.type(phoneSearch, 'ali');
    await userEvent.click((await screen.findAllByRole('button', { name: /Kedai Runcit Ali/ }))[0]);
    expect(screen.getByText('Step 2 of 3 · Items')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npm test -- order-draft order-composer`
Expected: FAIL. The modules can't be found.

- [ ] **Step 3: Implement the actions and the draft logic**

`frontend/src/actions/orders.ts`:

```ts
'use server';

import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import type { OrderDetail, OrderInput, OrderStatus, StockWarning } from '@/lib/types';
import { refreshAll, run, type ActionResult } from './result';

type Saved = { id: string; stockWarnings: StockWarning[] };

export async function createOrder(input: OrderInput): Promise<ActionResult<Saved>> {
  const r = await run(() => apiFetch<OrderDetail & { stockWarnings: StockWarning[] }>('/orders', { method: 'POST', body: input }));
  if (!r.ok) return r;
  refreshAll();
  return { ok: true, data: { id: r.data.id, stockWarnings: r.data.stockWarnings } };
}

export async function updateOrder(id: string, input: OrderInput): Promise<ActionResult<Saved>> {
  const r = await run(() => apiFetch<OrderDetail>(`/orders/${id}`, { method: 'PATCH', body: input }));
  if (!r.ok) return r;
  refreshAll();
  return { ok: true, data: { id, stockWarnings: [] } };
}

export async function changeOrderStatus(id: string, status: OrderStatus): Promise<ActionResult> {
  const r = await run(() => apiFetch(`/orders/${id}/status`, { method: 'PATCH', body: { status } }));
  if (!r.ok) return r;
  refreshAll();
  return { ok: true, data: undefined };
}

export async function deleteOrder(id: string): Promise<ActionResult> {
  const r = await run(() => apiFetch(`/orders/${id}`, { method: 'DELETE' }));
  if (!r.ok) return r;
  refreshAll();
  redirect('/orders');
}
```

`frontend/src/lib/use-debounced-search.ts`:

```ts
import { useEffect, useState } from 'react';

/** Debounced async search; late responses for an old query are ignored. */
export function useDebouncedSearch<T>(query: string, search: (q: string) => Promise<T[]>, delay = 250) {
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const found = await search(q);
        if (!cancelled) setResults(found);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, search, delay]);
  return { results: query.trim() ? results : [], loading };
}
```

`frontend/src/components/orders/order-draft.ts`:

```ts
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
```

`frontend/src/components/orders/composer-types.ts`:

```ts
import type { Dispatch } from 'react';
import type { Draft, DraftAction, DraftTotals } from './order-draft';

/** Everything both layouts need; one OrderComposer owns it so resizing never loses the draft. */
export type ComposerViewProps = {
  draft: Draft;
  dispatch: Dispatch<DraftAction>;
  totals: DraftTotals;
  pending: boolean;
  error: string | null;
  onSubmit: () => void;
  submitLabel: string;
};
```

- [ ] **Step 4: Implement the pickers, line items and shared parts**

`frontend/src/components/orders/customer-picker.tsx`:

```tsx
'use client';

import { useState, useTransition } from 'react';
import { quickAddCustomer, searchCustomers } from '@/actions/customers';
import { Field, FormError } from '@/components/common/field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDebouncedSearch } from '@/lib/use-debounced-search';
import type { Draft } from './order-draft';

export function CustomerPicker({ selected, onSelect }: { selected: Draft['customer']; onSelect: (c: Draft['customer']) => void }) {
  const [query, setQuery] = useState('');
  const { results, loading } = useDebouncedSearch(query, searchCustomers);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-xs text-muted-foreground">Customer</p>
          <p className="font-medium">{selected.name}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => onSelect(null)}>
          Change
        </Button>
      </div>
    );
  }

  const add = () =>
    startTransition(async () => {
      setError(null);
      const r = await quickAddCustomer({ name, phone });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      onSelect({ id: r.data.id, name: r.data.name });
      setAdding(false);
      setName('');
      setPhone('');
    });

  return (
    <div className="grid gap-2">
      <Input
        type="search"
        aria-label="Search customers"
        placeholder="Search customers by name or phone"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {loading && <p className="text-sm text-muted-foreground">Searching…</p>}
      {results.length > 0 && (
        <ul className="grid gap-1">
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onSelect({ id: c.id, name: c.name })}
                className="w-full rounded-md border px-3 py-2 text-left hover:bg-muted"
              >
                <span className="font-medium">{c.name}</span>
                {c.phone && <span className="ml-2 text-sm text-muted-foreground">{c.phone}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {adding ? (
        <div className="grid gap-2 rounded-lg border p-3">
          <Field label="New customer name" name="newCustomerName" value={name} onChange={(e) => setName(e.target.value)} />
          <Field label="New customer phone" name="newCustomerPhone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <FormError message={error} />
          <div className="flex gap-2">
            <Button type="button" disabled={pending || !name.trim()} onClick={add}>
              Add customer
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="link" className="justify-self-start px-0" onClick={() => setAdding(true)}>
          + Add new customer
        </Button>
      )}
    </div>
  );
}
```

`frontend/src/components/orders/product-picker.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { searchProducts } from '@/actions/products';
import { MoneyText } from '@/components/common/money-text';
import { Input } from '@/components/ui/input';
import type { Product } from '@/lib/types';
import { useDebouncedSearch } from '@/lib/use-debounced-search';

export function ProductPicker({ onAdd }: { onAdd: (p: Product) => void }) {
  const [query, setQuery] = useState('');
  const { results, loading } = useDebouncedSearch(query, searchProducts);
  return (
    <div className="grid gap-2">
      <Input type="search" aria-label="Search products" placeholder="Search products by name or SKU" value={query} onChange={(e) => setQuery(e.target.value)} />
      {loading && <p className="text-sm text-muted-foreground">Searching…</p>}
      {results.length > 0 && (
        <ul className="grid gap-1">
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                aria-label={`Add ${p.name}`}
                onClick={() => onAdd(p)}
                className="flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left hover:bg-muted"
              >
                <span>
                  <span className="font-medium">{p.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {p.sku} · {p.stockQuantity} in stock
                  </span>
                </span>
                <MoneyText value={p.sellingPrice} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

`frontend/src/components/orders/line-items.tsx`:

```tsx
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
```

`frontend/src/components/orders/composer-parts.tsx`:

```tsx
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
```

- [ ] **Step 5: Implement the two layouts and the state owner**

`frontend/src/components/orders/phone-composer.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { FormError } from '@/components/common/field';
import { Button } from '@/components/ui/button';
import { formatRM, fromSen } from '@/lib/money';
import { DiscountField, NotesField, StockWarnings, SummaryRow } from './composer-parts';
import type { ComposerViewProps } from './composer-types';
import { CustomerPicker } from './customer-picker';
import { LineItems } from './line-items';
import { ProductPicker } from './product-picker';

const STEPS = ['Customer', 'Items', 'Review'] as const;

export function PhoneComposer(props: ComposerViewProps) {
  const { draft, dispatch, totals, pending, error, onSubmit, submitLabel } = props;
  const [step, setStep] = useState(draft.customer ? (draft.lines.length ? 2 : 1) : 0);
  return (
    <div className="pb-36">
      <p className="mb-3 text-sm text-muted-foreground">
        Step {step + 1} of 3 · {STEPS[step]}
      </p>

      {step === 0 && (
        <CustomerPicker
          selected={draft.customer}
          onSelect={(c) => {
            dispatch({ type: 'setCustomer', customer: c });
            if (c) setStep(1);
          }}
        />
      )}

      {step === 1 && (
        <div className="grid gap-4">
          <ProductPicker onAdd={(p) => dispatch({ type: 'addProduct', product: p })} />
          <LineItems lines={draft.lines} dispatch={dispatch} />
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-4">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Customer</p>
            <p className="font-medium">{draft.customer?.name}</p>
          </div>
          <LineItems lines={draft.lines} dispatch={dispatch} readOnly />
          <SummaryRow label="Subtotal" sen={totals.subtotalSen} />
          <DiscountField draft={draft} dispatch={dispatch} />
          <NotesField draft={draft} dispatch={dispatch} />
          <StockWarnings totals={totals} />
          <FormError message={error} />
        </div>
      )}

      <div className="fixed inset-x-0 bottom-14 z-10 border-t bg-background p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {draft.lines.length} {draft.lines.length === 1 ? 'item' : 'items'}
          </span>
          <output aria-label="Order total" className="text-lg font-semibold tabular-nums">
            {formatRM(fromSen(totals.totalSen))}
          </output>
        </div>
        <div className="flex gap-2">
          {step > 0 && (
            <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          {step === 0 && (
            <Button type="button" className="h-11 flex-1" disabled={!draft.customer} onClick={() => setStep(1)}>
              Next: items
            </Button>
          )}
          {step === 1 && (
            <Button type="button" className="h-11 flex-1" disabled={draft.lines.length === 0} onClick={() => setStep(2)}>
              Next: review
            </Button>
          )}
          {step === 2 && (
            <Button type="button" className="h-11 flex-1" disabled={!totals.canSubmit || pending} onClick={onSubmit}>
              {pending ? 'Saving…' : submitLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
```

`frontend/src/components/orders/desktop-composer.tsx`:

```tsx
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
```

`frontend/src/components/orders/order-composer.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useReducer, useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { ActionResult } from '@/actions/result';
import type { OrderInput, StockWarning } from '@/lib/types';
import { DesktopComposer } from './desktop-composer';
import { draftReducer, draftToInput, draftTotals, emptyDraft, type Draft } from './order-draft';
import { PhoneComposer } from './phone-composer';

type Props = {
  mode: 'create' | 'edit';
  initial?: Draft;
  submit: (input: OrderInput) => Promise<ActionResult<{ id: string; stockWarnings: StockWarning[] }>>;
};

/** Owns the draft so the phone and desktop layouts render the same state. */
export function OrderComposer({ mode, initial, submit }: Props) {
  const [draft, dispatch] = useReducer(draftReducer, initial ?? emptyDraft);
  const totals = draftTotals(draft);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = () => {
    if (pending || !totals.canSubmit) return;
    startTransition(async () => {
      setError(null);
      const result = await submit(draftToInput(draft));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const warnings = result.data.stockWarnings;
      if (warnings.length) {
        toast.warning(
          `Saved, but stock is short for ${warnings.map((w) => `${w.sku} (need ${w.requested}, have ${w.available})`).join(', ')}. Restock before confirming.`,
        );
      } else {
        toast.success(mode === 'create' ? 'Order created' : 'Order updated');
      }
      router.push(`/orders/${result.data.id}`);
    });
  };

  const view = { draft, dispatch, totals, pending, error, onSubmit, submitLabel: mode === 'create' ? 'Create order' : 'Save changes' };
  return (
    <>
      <div className="md:hidden">
        <PhoneComposer {...view} />
      </div>
      <div className="hidden md:block">
        <DesktopComposer {...view} />
      </div>
    </>
  );
}
```

- [ ] **Step 6: Implement the pages**

`frontend/src/app/(app)/orders/new/page.tsx`:

```tsx
import { createOrder } from '@/actions/orders';
import { PageHeader } from '@/components/common/page-header';
import { OrderComposer } from '@/components/orders/order-composer';

export const metadata = { title: 'New order' };

export default function NewOrderPage() {
  return (
    <>
      <PageHeader title="New order" />
      <OrderComposer mode="create" submit={createOrder} />
    </>
  );
}
```

`frontend/src/app/(app)/orders/[id]/edit/page.tsx`:

```tsx
import { redirect } from 'next/navigation';
import { updateOrder } from '@/actions/orders';
import { PageHeader } from '@/components/common/page-header';
import { OrderComposer } from '@/components/orders/order-composer';
import type { Draft } from '@/components/orders/order-draft';
import { apiFetch, getOrNotFound } from '@/lib/api';
import { canEdit } from '@/lib/order-status';
import type { OrderDetail } from '@/lib/types';

export default async function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrNotFound(apiFetch<OrderDetail>(`/orders/${id}`));
  if (!canEdit(order.status)) redirect(`/orders/${id}`);
  const initial: Draft = {
    customer: { id: order.customer.id, name: order.customer.name },
    lines: order.items.map((i) => ({
      productId: i.productId,
      name: i.product.name,
      sku: i.product.sku,
      unitPrice: i.unitPrice,
      stock: null, // current stock is not on the order; the API warns again on save
      quantity: i.quantity,
    })),
    discount: Number(order.discount) === 0 ? '' : order.discount,
    notes: order.notes ?? '',
  };
  return (
    <>
      <PageHeader title={`Edit ${order.orderNumber}`} description="Saving re-prices items at today's prices." />
      <OrderComposer mode="edit" initial={initial} submit={updateOrder.bind(null, id)} />
    </>
  );
}
```

- [ ] **Step 7: Run the tests and watch them pass**

Run: `npm test && npm run lint && npm run typecheck`
Expected: all pass. If eslint's `react-hooks` rules flag an effect, restructure the code rather than disabling the rule, and record a ruling.

- [ ] **Step 8: Commit**

```bash
git add frontend
git commit -m "feat(frontend): order composer with phone steps, desktop single screen and shared draft" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Order detail (status actions, payments)

**Files:**
- Create: `frontend/src/actions/payments.ts`
- Create: `frontend/src/components/orders/status-actions.tsx`, `payment-form.tsx`, `payment-sheet.tsx`, `payments-timeline.tsx`, `order-items.tsx`, `order-detail-view.tsx`, `frontend/src/app/(app)/orders/[id]/page.tsx`
- Test: `frontend/src/components/orders/status-actions.test.tsx`, `payment-form.test.tsx`

**Interfaces:**
- Consumes: `changeOrderStatus`, `deleteOrder` (Task 10), `paidAtForApi`, `todayMyt`, the order-status helpers, `ConfirmButton`, badges.
- Produces:
  - `recordPayment(orderId): FormAction` (bound)
  - The order page's `h1` is the order number.
  - Status buttons: "Confirm order", "Start packing", "Mark ready", "Mark delivered", "Edit order" (link), "Cancel order" → confirm "Yes, cancel order", "Delete order" → "Yes, delete order".
  - Payment: phone button "Record payment" opens a sheet; desktop shows the form inline. Fields "Amount (RM)", "Method", "Reference", "Paid on"; button "Save payment".

- [ ] **Step 1: Write the failing tests**

`frontend/src/components/orders/status-actions.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatusActions } from './status-actions';

const { changeOrderStatus, toast } = vi.hoisted(() => ({
  changeOrderStatus: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('@/actions/orders', () => ({ changeOrderStatus, deleteOrder: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

beforeEach(() => {
  changeOrderStatus.mockReset();
  toast.success.mockReset();
  toast.error.mockReset();
});

describe('StatusActions', () => {
  it('offers the next step, edit, cancel and (for admins) delete on a new order', () => {
    render(<StatusActions orderId="o1" status="PENDING" role="ADMIN" paymentCount={0} layout="desktop" />);
    expect(screen.getByRole('button', { name: 'Confirm order' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit order' })).toHaveAttribute('href', '/orders/o1/edit');
    expect(screen.getByRole('button', { name: 'Cancel order' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete order' })).toBeInTheDocument();
  });

  it('hides delete from staff and everything on a delivered order', () => {
    const { rerender } = render(<StatusActions orderId="o1" status="PENDING" role="STAFF" paymentCount={0} layout="desktop" />);
    expect(screen.queryByRole('button', { name: 'Delete order' })).not.toBeInTheDocument();
    rerender(<StatusActions orderId="o1" status="DELIVERED" role="ADMIN" paymentCount={0} layout="desktop" />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('moves the order and reports insufficient stock', async () => {
    changeOrderStatus.mockResolvedValueOnce({ ok: false, error: 'Insufficient stock for COKE-24: requested 11, available 10' });
    render(<StatusActions orderId="o1" status="PENDING" role="STAFF" paymentCount={0} layout="phone" />);
    await userEvent.click(screen.getByRole('button', { name: 'Confirm order' }));
    expect(changeOrderStatus).toHaveBeenCalledWith('o1', 'CONFIRMED');
    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith('Insufficient stock for COKE-24: requested 11, available 10'));
  });
});
```

`frontend/src/components/orders/payment-form.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentForm } from './payment-form';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('PaymentForm', () => {
  it('defaults to the outstanding amount and today, and caps at the outstanding amount', () => {
    render(<PaymentForm action={vi.fn()} outstanding="40.00" />);
    expect(screen.getByLabelText('Amount (RM)')).toHaveValue(40);
    expect(screen.getByLabelText('Amount (RM)')).toHaveAttribute('max', '40.00');
    expect(screen.getByLabelText('Method')).toHaveValue('BANK_TRANSFER');
    expect(screen.getByLabelText('Paid on')).toHaveValue(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
  });

  it('shows an API error and closes when saved', async () => {
    const action = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, error: 'Payment exceeds outstanding amount (RM 40.00)' })
      .mockResolvedValueOnce({ ok: true, data: undefined });
    const onDone = vi.fn();
    render(<PaymentForm action={action} outstanding="40.00" onDone={onDone} />);
    await userEvent.click(screen.getByRole('button', { name: 'Save payment' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Payment exceeds outstanding amount (RM 40.00)');
    await userEvent.click(screen.getByRole('button', { name: 'Save payment' }));
    await vi.waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npm test -- status-actions payment-form`
Expected: FAIL. The modules can't be found.

- [ ] **Step 3: Implement**

`frontend/src/actions/payments.ts`:

```ts
'use server';

import { apiFetch } from '@/lib/api';
import { paidAtForApi } from '@/lib/dates';
import { num, text } from './form';
import { refreshAll, run, type ActionResult } from './result';

export async function recordPayment(orderId: string, _: unknown, fd: FormData): Promise<ActionResult> {
  const r = await run(() =>
    apiFetch('/payments', {
      method: 'POST',
      body: {
        orderId,
        amount: num(fd, 'amount'),
        method: text(fd, 'method'),
        reference: text(fd, 'reference'),
        paidAt: paidAtForApi(text(fd, 'paidAt')),
      },
    }),
  );
  if (!r.ok) return r;
  refreshAll();
  return { ok: true, data: undefined };
}
```

`frontend/src/components/orders/status-actions.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { changeOrderStatus, deleteOrder } from '@/actions/orders';
import { ConfirmButton } from '@/components/common/confirm-button';
import { Button } from '@/components/ui/button';
import { canCancel, canDelete, canEdit, holdsStock, NEXT_ACTION_LABEL, nextStatus, STATUS_LABEL } from '@/lib/order-status';
import type { OrderStatus, Role } from '@/lib/types';
import { cn } from '@/lib/utils';

type Props = { orderId: string; status: OrderStatus; role: Role; paymentCount: number; layout: 'phone' | 'desktop' };

export function StatusActions({ orderId, status, role, paymentCount, layout }: Props) {
  const [pending, startTransition] = useTransition();
  const next = nextStatus(status);
  const big = layout === 'phone' ? 'h-11 w-full text-base' : '';

  const move = (to: OrderStatus) =>
    startTransition(async () => {
      const result = await changeOrderStatus(orderId, to);
      if (result.ok) toast.success(`Order ${STATUS_LABEL[to].toLowerCase()}`);
      else toast.error(result.error);
    });

  return (
    <div className={cn('grid gap-2', layout === 'desktop' && 'sm:flex sm:flex-wrap')}>
      {next && (
        <Button className={big} disabled={pending} onClick={() => move(next)}>
          {NEXT_ACTION_LABEL[next]}
        </Button>
      )}
      {canEdit(status) && (
        <Button asChild variant="outline" className={big}>
          <Link href={`/orders/${orderId}/edit`}>Edit order</Link>
        </Button>
      )}
      {canCancel(status) && (
        <ConfirmButton
          label="Cancel order"
          title="Cancel this order?"
          description={holdsStock(status) ? 'The stock taken for this order goes back to inventory.' : 'The order will be marked as cancelled.'}
          confirmLabel="Yes, cancel order"
          successMessage="Order cancelled"
          action={() => changeOrderStatus(orderId, 'CANCELLED')}
          className={big}
        />
      )}
      {canDelete(status, role, paymentCount) && (
        <ConfirmButton
          label="Delete order"
          title="Delete this order?"
          description="This removes the order completely. Use Cancel if you want to keep a record."
          confirmLabel="Yes, delete order"
          variant="destructive"
          action={() => deleteOrder(orderId)}
          className={big}
        />
      )}
    </div>
  );
}
```

`frontend/src/components/orders/payment-form.tsx`:

```tsx
'use client';

import { useActionState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { FormAction } from '@/actions/result';
import { Field, FormError, SelectField, SubmitButton } from '@/components/common/field';
import { todayMyt } from '@/lib/dates';
import type { Money } from '@/lib/types';

const METHODS = [
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'OTHER', label: 'Other' },
];

export function PaymentForm({ action, outstanding, onDone }: { action: FormAction; outstanding: Money; onDone?: () => void }) {
  const [state, formAction] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);
  const handled = useRef<unknown>(null);
  useEffect(() => {
    if (state?.ok && handled.current !== state) {
      handled.current = state;
      toast.success('Payment recorded');
      formRef.current?.reset();
      onDone?.();
    }
  }, [state, onDone]);
  const today = todayMyt();
  return (
    <form ref={formRef} action={formAction} className="grid gap-3">
      <Field label="Amount (RM)" name="amount" type="number" inputMode="decimal" step="0.01" min="0.01" max={outstanding} defaultValue={outstanding} required />
      <SelectField label="Method" name="method" options={METHODS} defaultValue="BANK_TRANSFER" />
      <Field label="Reference" name="reference" maxLength={100} placeholder="Bank ref or receipt no." />
      <Field label="Paid on" name="paidAt" type="date" max={today} defaultValue={today} required />
      <FormError message={state && !state.ok ? state.error : null} />
      <SubmitButton>Save payment</SubmitButton>
    </form>
  );
}
```

`frontend/src/components/orders/payment-sheet.tsx`:

```tsx
'use client';

import { useMemo, useState } from 'react';
import { recordPayment } from '@/actions/payments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { formatRM } from '@/lib/money';
import type { Money } from '@/lib/types';
import { PaymentForm } from './payment-form';

/** Phone: a big button that opens a bottom sheet. */
export function PaymentSheet({ orderId, outstanding }: { orderId: string; outstanding: Money }) {
  const [open, setOpen] = useState(false);
  const action = useMemo(() => recordPayment.bind(null, orderId), [orderId]);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="secondary" className="h-11 w-full text-base">
          Record payment
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Record payment</SheetTitle>
          <SheetDescription>Outstanding {formatRM(outstanding)}</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          <PaymentForm action={action} outstanding={outstanding} onDone={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Desktop: the form is always visible in the side column. */
export function PaymentPanel({ orderId, outstanding }: { orderId: string; outstanding: Money }) {
  const action = useMemo(() => recordPayment.bind(null, orderId), [orderId]);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Record payment</CardTitle>
        <p className="text-sm text-muted-foreground">Outstanding {formatRM(outstanding)}</p>
      </CardHeader>
      <CardContent>
        <PaymentForm action={action} outstanding={outstanding} />
      </CardContent>
    </Card>
  );
}
```

`frontend/src/components/orders/payments-timeline.tsx`:

```tsx
import { MoneyText } from '@/components/common/money-text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/dates';
import type { Payment } from '@/lib/types';

const METHOD_LABEL: Record<Payment['method'], string> = { CASH: 'Cash', BANK_TRANSFER: 'Bank transfer', CARD: 'Card', OTHER: 'Other' };

export function PaymentsTimeline({ payments }: { payments: Payment[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payments</CardTitle>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments yet.</p>
        ) : (
          <ol className="grid gap-3">
            {payments.map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-2 border-l-2 border-green-500 pl-3">
                <div>
                  <p className="text-sm font-medium">{METHOD_LABEL[p.method]}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(p.paidAt)}
                    {p.reference && ` · ${p.reference}`}
                  </p>
                </div>
                <MoneyText value={p.amount} className="font-medium" />
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
```

`frontend/src/components/orders/order-items.tsx`:

```tsx
import { MoneyText } from '@/components/common/money-text';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ORDER_FLOW, STATUS_LABEL } from '@/lib/order-status';
import type { OrderDetail, OrderItem } from '@/lib/types';
import { cn } from '@/lib/utils';

export function OrderItemsList({ items }: { items: OrderItem[] }) {
  return (
    <ul className="divide-y rounded-lg border">
      {items.map((i) => (
        <li key={i.id} className="flex items-center justify-between gap-2 p-3">
          <div>
            <p className="font-medium">{i.product.name}</p>
            <p className="text-xs text-muted-foreground">
              {i.quantity} × <MoneyText value={i.unitPrice} />
            </p>
          </div>
          <MoneyText value={i.subtotal} className="font-medium" />
        </li>
      ))}
    </ul>
  );
}

export function OrderItemsTable({ items }: { items: OrderItem[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead className="text-right">Qty</TableHead>
          <TableHead className="text-right">Unit price</TableHead>
          <TableHead className="text-right">Subtotal</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((i) => (
          <TableRow key={i.id}>
            <TableCell className="font-medium">{i.product.name}</TableCell>
            <TableCell>{i.product.sku}</TableCell>
            <TableCell className="text-right tabular-nums">{i.quantity}</TableCell>
            <TableCell className="text-right">
              <MoneyText value={i.unitPrice} />
            </TableCell>
            <TableCell className="text-right">
              <MoneyText value={i.subtotal} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function OrderTotals({ order }: { order: OrderDetail }) {
  const rows: [string, string][] = [
    ['Subtotal', order.subtotal],
    ['Discount', order.discount],
    ['Total', order.total],
    ['Paid', order.paidAmount],
    ['Outstanding', order.outstandingAmount],
  ];
  return (
    <dl className="mt-3 grid gap-1 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className={cn('flex justify-between', (label === 'Total' || label === 'Outstanding') && 'font-semibold')}>
          <dt className="text-muted-foreground">{label}</dt>
          <dd>
            <MoneyText value={value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function StatusStepper({ status }: { status: OrderDetail['status'] }) {
  if (status === 'CANCELLED') return <p className="mt-3 text-sm text-muted-foreground">This order was cancelled.</p>;
  const current = ORDER_FLOW.indexOf(status);
  return (
    <ol className="mt-4 grid gap-1 text-sm" aria-label="Order progress">
      {ORDER_FLOW.map((s, i) => (
        <li key={s} className={cn('flex items-center gap-2', i > current && 'text-muted-foreground')} aria-current={i === current ? 'step' : undefined}>
          <span className={cn('size-2 rounded-full', i <= current ? 'bg-primary' : 'bg-muted-foreground/30')} />
          {STATUS_LABEL[s]}
        </li>
      ))}
    </ol>
  );
}
```

`frontend/src/components/orders/order-detail-view.tsx`:

```tsx
import Link from 'next/link';
import { PaymentBadge, StatusBadge } from '@/components/common/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime } from '@/lib/dates';
import { canRecordPayment } from '@/lib/order-status';
import type { OrderDetail, Role } from '@/lib/types';
import { OrderItemsList, OrderItemsTable, OrderTotals, StatusStepper } from './order-items';
import { PaymentPanel, PaymentSheet } from './payment-sheet';
import { PaymentsTimeline } from './payments-timeline';
import { StatusActions } from './status-actions';

export function OrderDetailView({ order, role }: { order: OrderDetail; role: Role }) {
  const payable = canRecordPayment(order.status, order.paymentStatus);
  const actions = (layout: 'phone' | 'desktop') => (
    <StatusActions orderId={order.id} status={order.status} role={role} paymentCount={order.payments.length} layout={layout} />
  );
  return (
    <div className="grid gap-4">
      <header className="grid gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold md:text-2xl">{order.orderNumber}</h1>
          <StatusBadge status={order.status} />
          <PaymentBadge status={order.paymentStatus} />
        </div>
        <p className="text-sm text-muted-foreground">
          <Link href={`/customers/${order.customer.id}`} className="underline-offset-4 hover:underline">
            {order.customer.name}
          </Link>
          {order.customer.phone && ` · ${order.customer.phone}`} · {formatDateTime(order.createdAt)}
        </p>
        {order.notes && <p className="text-sm">{order.notes}</p>}
      </header>

      <div className="grid gap-4 md:hidden">
        {actions('phone')}
        {payable && <PaymentSheet orderId={order.id} outstanding={order.outstandingAmount} />}
        <OrderItemsList items={order.items} />
        <OrderTotals order={order} />
        <PaymentsTimeline payments={order.payments} />
      </div>

      <div className="hidden items-start gap-6 md:grid md:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent>
            <OrderItemsTable items={order.items} />
            <OrderTotals order={order} />
          </CardContent>
        </Card>
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              {actions('desktop')}
              <StatusStepper status={order.status} />
            </CardContent>
          </Card>
          {payable && <PaymentPanel orderId={order.id} outstanding={order.outstandingAmount} />}
          <PaymentsTimeline payments={order.payments} />
        </div>
      </div>
    </div>
  );
}
```

`frontend/src/app/(app)/orders/[id]/page.tsx`:

```tsx
import { OrderDetailView } from '@/components/orders/order-detail-view';
import { apiFetch, getOrNotFound } from '@/lib/api';
import { getCurrentUser } from '@/lib/current-user';
import type { OrderDetail } from '@/lib/types';

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [order, user] = await Promise.all([getOrNotFound(apiFetch<OrderDetail>(`/orders/${id}`)), getCurrentUser()]);
  return <OrderDetailView order={order} role={user.role} />;
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `npm test && npm run lint && npm run typecheck`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat(frontend): order detail with status actions, payment sheet/panel and timeline" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Users (admin)

**Files:**
- Create: `frontend/src/actions/users.ts`, `frontend/src/components/users/create-user-form.tsx`, `user-actions.tsx`, `users-list.tsx`, `frontend/src/app/(app)/users/page.tsx`
- Test: `frontend/src/components/users/user-actions.test.tsx`

**Interfaces:**
- Consumes: `apiFetch`, `getCurrentUser`, `run`, `refreshAll`, `text`, the form primitives, `AdminOnly`.
- Produces:
  - Actions: `createUser: FormAction`, `updateUser(id, patch: { role?: Role; isActive?: boolean; password?: string }): Promise<ActionResult>`
  - The create form has labels "Name", "Email", "Password", "Role" and the button "Create user". Non-admins see "Admins only".

- [ ] **Step 1: Write the failing test**

`frontend/src/components/users/user-actions.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { User } from '@/lib/types';
import { UserActions } from './user-actions';

const { updateUser } = vi.hoisted(() => ({ updateUser: vi.fn(async () => ({ ok: true, data: undefined })) }));
vi.mock('@/actions/users', () => ({ updateUser }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const staff: User = { id: 'u2', name: 'Siti', email: 'siti@kedai.my', role: 'STAFF', isActive: true, createdAt: '', updatedAt: '' };

describe('UserActions', () => {
  it('stops an admin from demoting or deactivating themselves', () => {
    render(<UserActions user={{ ...staff, id: 'me', role: 'ADMIN' }} isSelf />);
    expect(screen.getByLabelText('Role for Siti')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Deactivate' })).toBeDisabled();
  });

  it('deactivates and promotes other users', async () => {
    render(<UserActions user={staff} isSelf={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
    expect(updateUser).toHaveBeenCalledWith('u2', { isActive: false });
    await userEvent.selectOptions(screen.getByLabelText('Role for Siti'), 'ADMIN');
    expect(updateUser).toHaveBeenCalledWith('u2', { role: 'ADMIN' });
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- user-actions`
Expected: FAIL. The module can't be found.

- [ ] **Step 3: Implement**

`frontend/src/actions/users.ts`:

```ts
'use server';

import { apiFetch } from '@/lib/api';
import type { Role, User } from '@/lib/types';
import { text } from './form';
import { refreshAll, run, type ActionResult } from './result';

export async function createUser(_: unknown, fd: FormData): Promise<ActionResult> {
  const r = await run(() =>
    apiFetch<User>('/users', {
      method: 'POST',
      body: { name: text(fd, 'name'), email: text(fd, 'email'), password: String(fd.get('password') ?? ''), role: text(fd, 'role') },
    }),
  );
  if (!r.ok) return r;
  refreshAll();
  return { ok: true, data: undefined };
}

export async function updateUser(id: string, patch: { role?: Role; isActive?: boolean; password?: string }): Promise<ActionResult> {
  const r = await run(() => apiFetch<User>(`/users/${id}`, { method: 'PATCH', body: patch }));
  if (!r.ok) return r;
  refreshAll();
  return { ok: true, data: undefined };
}
```

`frontend/src/components/users/create-user-form.tsx`:

```tsx
'use client';

import { useActionState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { FormAction } from '@/actions/result';
import { Field, FormError, SelectField, SubmitButton } from '@/components/common/field';

export function CreateUserForm({ action }: { action: FormAction }) {
  const [state, formAction] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);
  const handled = useRef<unknown>(null);
  useEffect(() => {
    if (state?.ok && handled.current !== state) {
      handled.current = state;
      toast.success('User created');
      formRef.current?.reset();
    }
  }, [state]);
  return (
    <form ref={formRef} action={formAction} className="grid gap-3 sm:grid-cols-2">
      <Field label="Name" name="name" required maxLength={100} />
      <Field label="Email" name="email" type="email" required />
      <Field label="Password" name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" />
      <SelectField
        label="Role"
        name="role"
        defaultValue="STAFF"
        options={[
          { value: 'STAFF', label: 'Staff' },
          { value: 'ADMIN', label: 'Admin' },
        ]}
      />
      <FormError message={state && !state.ok ? state.error : null} />
      <SubmitButton className="justify-self-start sm:col-span-2">Create user</SubmitButton>
    </form>
  );
}
```

`frontend/src/components/users/user-actions.tsx`:

```tsx
'use client';

import { useId, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { updateUser } from '@/actions/users';
import { selectClass } from '@/components/common/field';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Role, User } from '@/lib/types';

export function UserActions({ user, isSelf }: { user: User; isSelf: boolean }) {
  const [pending, startTransition] = useTransition();
  const roleId = useId();
  const save = (patch: { role?: Role; isActive?: boolean; password?: string }, message: string) =>
    startTransition(async () => {
      const r = await updateUser(user.id, patch);
      if (r.ok) toast.success(message);
      else toast.error(r.error);
    });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Label htmlFor={roleId} className="sr-only">
        Role for {user.name}
      </Label>
      <select
        id={roleId}
        className={`${selectClass} w-28`}
        value={user.role}
        disabled={isSelf || pending}
        onChange={(e) => save({ role: e.target.value as Role }, 'Role updated')}
      >
        <option value="STAFF">Staff</option>
        <option value="ADMIN">Admin</option>
      </select>
      <Button
        variant="outline"
        size="sm"
        disabled={isSelf || pending}
        onClick={() => save({ isActive: !user.isActive }, user.isActive ? 'User deactivated' : 'User activated')}
      >
        {user.isActive ? 'Deactivate' : 'Activate'}
      </Button>
      <ResetPassword user={user} onSave={(password) => save({ password }, 'Password reset')} />
    </div>
  );
}

function ResetPassword({ user, onSave }: { user: User; onSave: (password: string) => void }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const id = useId();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Reset password
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>Set a new password for {user.name}. Share it with them privately.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label htmlFor={id}>New password</Label>
          <Input id={id} type="password" minLength={8} maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <DialogFooter>
          <Button
            disabled={password.length < 8}
            onClick={() => {
              onSave(password);
              setPassword('');
              setOpen(false);
            }}
          >
            Save password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

`frontend/src/components/users/users-list.tsx`:

```tsx
import { Badge } from '@/components/ui/badge';
import type { User } from '@/lib/types';
import { UserActions } from './user-actions';

export function UsersList({ users, currentUserId }: { users: User[]; currentUserId: string }) {
  return (
    <ul className="divide-y rounded-lg border">
      {users.map((u) => (
        <li key={u.id} className="grid gap-2 p-3 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="font-medium">
              {u.name}
              {u.id === currentUserId && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
            </p>
            <p className="text-sm text-muted-foreground">{u.email}</p>
            <div className="mt-1 flex gap-1">
              <Badge variant="outline">{u.role === 'ADMIN' ? 'Admin' : 'Staff'}</Badge>
              {!u.isActive && (
                <Badge variant="outline" className="border-zinc-300 bg-zinc-100 text-zinc-600">
                  Inactive
                </Badge>
              )}
            </div>
          </div>
          <UserActions user={u} isSelf={u.id === currentUserId} />
        </li>
      ))}
    </ul>
  );
}
```

`frontend/src/app/(app)/users/page.tsx`:

```tsx
import { createUser } from '@/actions/users';
import { AdminOnly } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateUserForm } from '@/components/users/create-user-form';
import { UsersList } from '@/components/users/users-list';
import { apiFetch } from '@/lib/api';
import { getCurrentUser } from '@/lib/current-user';
import type { Paginated, User } from '@/lib/types';

export const metadata = { title: 'Users' };

export default async function UsersPage() {
  const me = await getCurrentUser();
  if (me.role !== 'ADMIN') return <AdminOnly />;
  const users = await apiFetch<Paginated<User>>('/users', { query: { limit: 100 } });
  return (
    <>
      <PageHeader title="Users" description="Give staff their own logins. Deactivating someone signs them out at once." />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <UsersList users={users.data} currentUserId={me.id} />
        <Card>
          <CardHeader>
            <CardTitle>Add a user</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateUserForm action={createUser} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `npm test && npm run lint && npm run typecheck`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat(frontend): admin user management" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: End-to-end journey (Playwright, phone and desktop)

**Files:**
- Create: `frontend/playwright.config.ts`, `frontend/e2e/db.ts`, `global-setup.ts`, `helpers.ts`, `journey.spec.ts`

**Interfaces:**
- Consumes: every accessible name listed in Tasks 4–12, and the backend on port 4001 against `orderflow_test`.

- [ ] **Step 1: Install the browser**

```bash
npx playwright install chromium
```

- [ ] **Step 2: Write the config and helpers**

`frontend/playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';
import { TEST_DB } from './e2e/db';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1, // one shared test database
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  globalSetup: './e2e/global-setup.ts',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://localhost:3001', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      command: 'npm run build && node dist/main.js',
      cwd: '../backend',
      url: 'http://localhost:4001/health',
      env: { PORT: '4001', DATABASE_URL: TEST_DB, JWT_SECRET: 'e2e-secret', JWT_EXPIRES_IN: '8h', CORS_ORIGIN: 'http://localhost:3001' },
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      command: 'npm run build && npm run start -- --port 3001',
      url: 'http://localhost:3001/login',
      env: { API_URL: 'http://localhost:4001' },
      reuseExistingServer: false,
      timeout: 300_000,
    },
  ],
});
```

`frontend/e2e/db.ts`:

```ts
import { Client } from 'pg';

export const TEST_DB = 'postgresql://orderflow:orderflow@localhost:5432/orderflow_test';

/** Same guarded wipe as the backend e2e suite: only ever the orderflow_test database. */
export async function resetDb() {
  const client = new Client({ connectionString: TEST_DB });
  await client.connect();
  try {
    const { rows } = await client.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`,
    );
    if (rows.length) await client.query(`TRUNCATE ${rows.map((r) => `"${r.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`);
    await client.query('ALTER SEQUENCE IF EXISTS order_number_seq RESTART WITH 1');
  } finally {
    await client.end();
  }
}
```

`frontend/e2e/global-setup.ts`:

```ts
import { execSync } from 'node:child_process';
import { TEST_DB } from './db';

export default function globalSetup() {
  execSync('npx prisma migrate deploy', { cwd: '../backend', stdio: 'inherit', env: { ...process.env, DATABASE_URL: TEST_DB } });
}
```

`frontend/e2e/helpers.ts`:

```ts
import { expect, type Page } from '@playwright/test';

export const PASSWORD = 'Password123!';

export async function registerOwner(page: Page, email = 'owner@kedai.my') {
  await page.goto('/register');
  await page.getByLabel('Name').fill('Aisyah');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

export async function logIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

export async function logOut(page: Page, phone: boolean) {
  if (phone) await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/login$/);
}

export async function createProduct(page: Page, p: { name: string; sku: string; price: string; stock: string; threshold: string }) {
  await page.goto('/products/new');
  await page.getByLabel('Name').fill(p.name);
  await page.getByLabel('SKU').fill(p.sku);
  await page.getByLabel('Selling price (RM)').fill(p.price);
  await page.getByLabel('Cost price (RM)').fill('1.00');
  await page.getByLabel('Opening stock').fill(p.stock);
  await page.getByLabel('Low-stock threshold').fill(p.threshold);
  await page.getByRole('button', { name: 'Save product' }).click();
  await expect(page.getByRole('heading', { name: p.name })).toBeVisible();
}

export async function createCustomer(page: Page, name: string, phone: string) {
  await page.goto('/customers/new');
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Phone').fill(phone);
  await page.getByRole('button', { name: 'Save customer' }).click();
  await expect(page.getByRole('heading', { name })).toBeVisible();
}

/** Drives the composer; on phones this walks the 3 steps. */
export async function createOrder(
  page: Page,
  phone: boolean,
  o: { customer: string; items: { name: string; search: string; quantity: number }[]; discount?: string },
) {
  await page.goto('/orders/new');
  await page.getByRole('searchbox', { name: 'Search customers' }).fill(o.customer.split(' ').at(-1)!);
  await page.getByRole('button', { name: new RegExp(o.customer) }).click();
  for (const item of o.items) {
    await page.getByRole('searchbox', { name: 'Search products' }).fill(item.search);
    await page.getByRole('button', { name: `Add ${item.name}` }).click();
    for (let i = 1; i < item.quantity; i++) await page.getByRole('button', { name: `Increase ${item.name}` }).click();
  }
  if (phone) await page.getByRole('button', { name: 'Next: review' }).click();
  if (o.discount) await page.getByRole('textbox', { name: 'Discount (RM)' }).fill(o.discount);
}
```

- [ ] **Step 3: Write the journey tests**

`frontend/e2e/journey.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { resetDb } from './db';
import { createCustomer, createOrder, createProduct, logIn, logOut, PASSWORD, registerOwner } from './helpers';

test.beforeEach(async () => {
  await resetDb();
});

test('an owner takes a WhatsApp order all the way to paid (brief §23)', async ({ page }, info) => {
  const phone = info.project.name === 'phone';

  // Signed-out visitors are sent to login and kept on the page they wanted.
  await page.goto('/orders');
  await expect(page).toHaveURL(/\/login\?next=%2Forders$/);

  // 1. Register the first admin; log out; log back in.
  await registerOwner(page);
  await logOut(page, phone);
  await logIn(page, 'owner@kedai.my');

  // 2–3. Products (one that will be low) and a customer.
  await createProduct(page, { name: 'Coca-Cola 24 x 320ml', sku: 'COKE-24', price: '36.50', stock: '10', threshold: '2' });
  await createProduct(page, { name: 'Milo 3in1', sku: 'MILO-18', price: '17.90', stock: '3', threshold: '5' });
  await createCustomer(page, 'Kedai Runcit Ali', '+60123456789');

  // 4–5. An order with two items and a discount: 2 × 36.50 + 17.90 − 0.90 = 90.00.
  await createOrder(page, phone, {
    customer: 'Kedai Runcit Ali',
    items: [
      { name: 'Coca-Cola 24 x 320ml', search: 'Coca', quantity: 2 },
      { name: 'Milo 3in1', search: 'Milo', quantity: 1 },
    ],
    discount: '0.90',
  });
  await expect(page.getByRole('status', { name: 'Order total' })).toHaveText('RM 90.00');
  await page.getByRole('button', { name: 'Create order' }).click();
  await expect(page.getByRole('heading', { name: /^ORD-\d{8}-0001$/ })).toBeVisible();
  const orderUrl = page.url();

  // 6–7. Confirm deducts stock.
  await page.getByRole('button', { name: 'Confirm order' }).click();
  await expect(page.getByRole('button', { name: 'Start packing' })).toBeVisible();
  await page.goto('/inventory');
  await expect(page.getByTestId('stock-COKE-24').filter({ visible: true })).toHaveText('8');

  // 8. Fulfilment.
  await page.goto(orderUrl);
  for (const [click, next] of [
    ['Start packing', 'Mark ready'],
    ['Mark ready', 'Mark delivered'],
  ]) {
    await page.getByRole('button', { name: click }).click();
    await expect(page.getByRole('button', { name: next })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Mark delivered' }).click();
  await expect(page.getByRole('button', { name: 'Cancel order' })).toHaveCount(0);

  // 9–10. Partial payment, then the rest.
  if (phone) await page.getByRole('button', { name: 'Record payment' }).click();
  await page.getByRole('spinbutton', { name: 'Amount (RM)' }).fill('50');
  await page.getByRole('button', { name: 'Save payment' }).click();
  await expect(page.getByText('Partial', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  if (phone) await page.getByRole('button', { name: 'Record payment' }).click();
  await expect(page.getByRole('spinbutton', { name: 'Amount (RM)' })).toHaveValue('40.00');
  await page.getByRole('button', { name: 'Save payment' }).click();
  await expect(page.getByText('Paid', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Record payment' })).toHaveCount(0);

  // 11–12. The dashboard reflects it.
  await page.goto('/dashboard');
  await expect(page.getByRole('link', { name: 'Completed orders: 1' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Low-stock products: 1' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Unpaid orders: 0' })).toBeVisible();

  // STAFF don't get admin controls.
  await page.goto('/users');
  await page.getByLabel('Name').fill('Siti');
  await page.getByLabel('Email').fill('siti@kedai.my');
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create user' }).click();
  await expect(page.getByText('siti@kedai.my')).toBeVisible();
  await logOut(page, phone);
  await logIn(page, 'siti@kedai.my');
  await page.goto('/inventory');
  await expect(page.getByRole('button', { name: /Adjust stock for/ })).toHaveCount(0);
  await page.goto('/products');
  await expect(page.getByRole('link', { name: 'New product' })).toHaveCount(0);
  await page.goto('/users');
  await expect(page.getByText('Admins only')).toBeVisible();
});

test('confirming without enough stock explains why and keeps the order pending', async ({ page }, info) => {
  const phone = info.project.name === 'phone';
  await registerOwner(page);
  await createProduct(page, { name: 'Tepung Gandum 1kg', sku: 'TEPUNG-1', price: '2.90', stock: '1', threshold: '0' });
  await createCustomer(page, 'Pasar Mini Siti', '+60145556666');
  await createOrder(page, phone, { customer: 'Pasar Mini Siti', items: [{ name: 'Tepung Gandum 1kg', search: 'Tepung', quantity: 3 }] });
  await page.getByRole('button', { name: 'Create order' }).click();
  await expect(page.getByText(/stock is short for TEPUNG-1/)).toBeVisible();

  await page.getByRole('button', { name: 'Confirm order' }).click();
  await expect(page.getByText('Insufficient stock for TEPUNG-1: requested 3, available 1')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirm order' })).toBeVisible();
});
```

- [ ] **Step 4: Run the journey**

Make sure Postgres is up (`docker compose up -d postgres`) and that no backend e2e run is using `orderflow_test`. Then:

Run: `npm run test:e2e`
Expected: 4 passed (2 tests × desktop and phone).

If a step fails, open the trace with `npx playwright show-trace test-results/**/trace.zip`. Fix the product code, not the test, unless the test contradicts an accessible name defined in Tasks 4–12. In that case, record a ruling.

- [ ] **Step 5: Commit**

```bash
git add frontend/playwright.config.ts frontend/e2e
git commit -m "test(frontend): Playwright journey for brief §23 at phone and desktop sizes" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Docs and full-stack verification

**Files:**
- Modify: `README.md`, `CLAUDE.md`, `.claude/MEMORY.md`

- [ ] **Step 1: README frontend section**

In `README.md`, replace the Quick start bullet list with:

```markdown
- App: http://localhost:3000 (log in, or create the first account)
- API: http://localhost:4000 · Swagger UI: http://localhost:4000/docs
- Postgres: localhost:5432 (`orderflow` / `orderflow`)
```

Then add this section after "Backend development":

````markdown
## Frontend development

```bash
cd frontend
cp .env.example .env.local   # API_URL=http://localhost:4000
npm install
npm run dev                  # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm test` | Component and helper tests (Vitest + Testing Library) |
| `npm run test:e2e` | Playwright journey at phone and desktop sizes. It starts its own backend (:4001) and app (:3001) against `orderflow_test`. |
| `npm run lint` / `npm run typecheck` / `npm run build` | ESLint / tsc / production build |

The browser only ever talks to Next.js. Server Components and Server Actions call the API with the JWT from an httpOnly cookie, so the token is never exposed to page scripts.
````

- [ ] **Step 2: CLAUDE.md and project memory**

In `CLAUDE.md`, change the Frontend row of the Tech Stack table to:

```markdown
| Frontend | Next.js 16 App Router, React 19, Tailwind 4, shadcn/ui (radix-nova), BFF via Server Actions |
```

Add this row to the Implemented Features table:

```markdown
| — | Frontend: auth, dashboard, orders (phone + desktop layouts), customers, products, inventory, users, Playwright journey |
```

Add these lines under Architecture Rules:

```markdown
- Frontend: the browser never calls the API. `frontend/src/lib/api.ts` (server-only) adds the bearer token from the `of_session` httpOnly cookie. Mutations are Server Actions in `frontend/src/actions/` returning `ActionResult`.
- Frontend dual layouts: `md:hidden` / `hidden md:block` siblings rendering the same data; interactive screens keep one state owner (e.g. `OrderComposer`).
- Next 16: `proxy.ts` (not middleware), async `params`/`searchParams`/`cookies()`, `error.tsx` gets `retry`. Read `frontend/node_modules/next/dist/docs/` before using an unfamiliar API.
```

In `.claude/MEMORY.md`, add under Key File Paths:

```markdown
| Frontend spec | docs/superpowers/specs/2026-09-29-orderflow-frontend-design.md |
| Frontend plan | docs/superpowers/plans/2026-09-29-orderflow-frontend.md |
```

- [ ] **Step 3: Full verification**

```bash
cd frontend && npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e
cd ../backend && npm run lint && npm run typecheck && npm test && npm run test:e2e
cd .. && docker compose up -d --build
sleep 40
curl -s -o /dev/null -w "login %{http_code}\n" localhost:3000/login
curl -s -o /dev/null -w "orders (signed out) %{http_code} -> %{redirect_url}\n" localhost:3000/orders
```

Expected: every command passes. `login 200`. `orders (signed out) 307 -> http://localhost:3000/login?next=%2Forders`.

- [ ] **Step 4: Commit**

```bash
git add README.md CLAUDE.md .claude/MEMORY.md
git commit -m "docs: frontend setup, architecture notes and test commands" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

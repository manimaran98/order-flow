# OrderFlow — Sub-project 2: Frontend

Date: 2026-09-29
Builds on: [backend spec](2026-09-29-orderflow-backend-foundation-design.md) (merged in PR #1)
Status: Draft — awaiting review

---

## 1. Scope

A Next.js web app over the existing NestJS API that runs the whole brief §23 flow for ADMIN and STAFF users, on phones and desktops.

**In scope:** auth (first-user register, login, logout), dashboard, orders (list, new, detail with status and payments), products (list, detail, create/edit, deactivate), customers (list, detail, create/edit, delete), inventory (stock list, low stock, adjustments), users (admin creates/edits staff), a `frontend` Docker Compose service, and tests.

**Out of scope:** everything in brief §24; PWA/offline; i18n (English only); dark mode; charts; production Dockerfile and CI (sub-project 3); backend changes other than bugs found while integrating.

**Done when:** on `docker compose up`, a user can complete brief §23 steps 1–12 in the browser on both a 390px phone viewport and a 1280px desktop viewport, and the Playwright journey test passes for both.

---

## 2. Agreed decisions

| # | Decision |
|---|---|
| F1 | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui components (copied into the repo). |
| F2 | Users on phones and desktops count equally. The four daily screens get **separate phone and desktop layouts**: dashboard, orders list, new order, order detail. Products, customers, inventory and users get one responsive layout each. |
| F3 | The browser never talks to NestJS and never sees the JWT. Server Components and Server Actions call the API from the Next.js server with `Authorization: Bearer`, reading the token from an httpOnly cookie (backend spec D7). |
| F4 | Mutations are Server Actions followed by `revalidatePath`. No client-side data cache library. |
| F5 | List state (search, filters, page) lives in the URL query string, so lists are shareable, back-button friendly and rendered on the server. |
| F6 | Money arrives from the API as strings (`"12.50"`). It is displayed as `RM 12.50` with `Intl.NumberFormat('en-MY')`. The only client-side money maths is the new-order total preview, done in integer sen; the server's totals are authoritative. |
| F7 | Dates are shown in Asia/Kuala_Lumpur time. |
| F8 | Role-aware UI: STAFF don't see admin-only actions. The API still enforces roles; the UI hiding is a convenience, not a control. |
| F9 | Tests: Vitest + React Testing Library for components and helpers; Playwright for one end-to-end journey against a real backend and a dedicated test database, run at phone and desktop viewports. |

---

## 3. Architecture

```text
Browser ──(HTML, RSC payloads, Server Action POSTs; cookie of_session)──► Next.js server (:3000)
                                                                              │ fetch + Bearer <jwt>
                                                                              ▼
                                                                         NestJS API (:4000) ──► PostgreSQL
```

- `API_URL` (server-only env var, e.g. `http://backend:4000`) is the only place the API address lives. There is no `NEXT_PUBLIC_*` API URL, because the browser never calls the API.
- **Session cookie** `of_session`: httpOnly, `SameSite=Lax`, `Secure` when `NODE_ENV=production`, `Max-Age` 8h (matching the JWT).
- **Route protection:** a Next.js request interceptor (`proxy.ts`, formerly `middleware.ts`) redirects requests without the cookie to `/login?next=<path>`, except `/login`, `/register` and static assets. It only checks that the cookie exists; the API validates the token.
- **Current user:** `getCurrentUser()` calls `GET /auth/me`, wrapped in React `cache()` so it runs once per request. A 401 from any API call clears the cookie and redirects to `/login`. This covers expired tokens and deactivated users.

### 3.1 Repository layout

```text
frontend/
├── Dockerfile.dev
├── src/
│   ├── proxy.ts                     # cookie presence → redirect to /login
│   ├── app/
│   │   ├── layout.tsx               # fonts, <Toaster/>
│   │   ├── (auth)/login/page.tsx
│   │   ├── (auth)/register/page.tsx
│   │   └── (app)/                   # authenticated shell: sidebar (desktop) / bottom nav (phone)
│   │       ├── layout.tsx
│   │       ├── dashboard/page.tsx
│   │       ├── orders/page.tsx, new/page.tsx, [id]/page.tsx
│   │       ├── products/page.tsx, new/page.tsx, [id]/page.tsx
│   │       ├── customers/page.tsx, new/page.tsx, [id]/page.tsx
│   │       ├── inventory/page.tsx
│   │       ├── users/page.tsx       # ADMIN only
│   │       ├── loading.tsx, error.tsx, not-found.tsx
│   ├── lib/
│   │   ├── api.ts                   # server-only fetch wrapper (token, errors, 401 handling)
│   │   ├── session.ts               # cookie get/set/clear, getCurrentUser()
│   │   ├── money.ts                 # formatRM(), toSen(), fromSen()
│   │   ├── dates.ts                 # MYT formatting
│   │   └── types.ts                 # API response types (hand-written, mirror backend DTOs)
│   ├── actions/                     # Server Actions per domain: auth, orders, payments, products, customers, inventory, users
│   └── components/
│       ├── ui/                      # shadcn/ui primitives
│       ├── shell/                   # Sidebar, BottomNav, UserMenu
│       ├── orders/                  # OrderCards, OrdersTable, OrderComposer (+ PhoneSteps, DesktopComposer), StatusActions, PaymentSheet
│       ├── dashboard/               # AttentionCards, RecentOrders
│       └── common/                  # MoneyText, StatusBadge, Pagination, SearchInput, EmptyState, ConfirmDialog
└── e2e/                             # Playwright
```

Types are hand-written in `lib/types.ts` rather than generated from Swagger. The API surface is small, and generation adds a toolchain step for little gain at this size.

---

## 4. Phone vs desktop layouts

**Mechanism:** each dual-layout screen renders both variants from the same data and switches with Tailwind breakpoints (`md:hidden` / `hidden md:block`, breakpoint 768px). There's no user-agent sniffing and no JS media queries, so there's no hydration flash, and server rendering stays simple. The hidden variant is `display:none`, which also removes it from the accessibility tree.

Where a screen has interactive state (new order, order detail), one parent Client Component owns the state and both variants render from it. Resizing the window never loses a half-entered order.

| Screen | Phone (< 768px) | Desktop (≥ 768px) |
|---|---|---|
| Shell | Top bar + bottom tab nav (Dashboard, Orders, New, Stock, More) | Left sidebar with all sections + user menu |
| Dashboard | Stacked attention cards (unpaid, low stock, awaiting fulfilment, pending, outstanding RM, today's sales), each tappable to the filtered list | Card grid across the top + "Recent orders" table + "Low stock" list side by side |
| Orders list | Cards: order number, customer, total, status + payment chips; filter chips row; "Load more" | Table with sortable columns, filter bar (status, payment, search, date range), numbered pagination |
| New order | 3 steps: **Customer** (search or quick-add) → **Items** (search products, +/− steppers) → **Review** (discount, notes, stock warnings, submit); sticky bottom bar with running total | One screen: customer picker at top, product search + item grid on the left, sticky summary panel (subtotal, discount, total, warnings, submit) on the right |
| Order detail | Header with status + payment chips; items list; big full-width button for the next status; "Record payment" opens a bottom sheet; "Cancel order" behind a confirm | Two columns: items table + totals on the left; status stepper, next-status and cancel actions, payment timeline and inline payment form on the right |

The single-layout screens use cards below 768px and tables at or above it inside one component (products, customers, inventory, users), plus stacked forms.

---

## 5. Screens and behaviour

**Login `/login`:** email + password. On success, the Server Action stores the token cookie and redirects to `next` or `/dashboard`. A 401 shows "Invalid email or password". There's a link to `/register`.

**Register `/register`:** the first-user form. If the API answers 403, the page shows "Registration is closed — ask your admin for an account" with a link to login. On success it logs in and goes to the dashboard.

**Dashboard:** the eight `GET /dashboard/summary` numbers. Each card links to a filtered list:
- unpaid → `/orders?paymentStatus=UNPAID` (and PARTIAL)
- pending → `?status=PENDING`
- awaiting fulfilment → `?status=CONFIRMED,PACKING,READY`
- low stock → `/inventory?low=1`

On desktop it also shows the 5 most recent orders and the low-stock list.

**Orders list:** filters mirror the API query. Awaiting fulfilment needs several statuses at once, which the API doesn't support, so the frontend sends one request per status and merges the results. See the ruling in §9.

**New order:**
- Customer search calls `GET /customers?search=` through a Server Action, debounced by 250ms.
- "Add new customer" (name + phone) creates the customer inline without leaving the flow, which is the common WhatsApp case.
- Product search shows active products only, with current stock.
- Quantity steppers can't go below 1.
- The total preview is computed in sen.
- Submit calls `POST /orders`. If the response includes `stockWarnings`, the new order's page shows a banner listing them. The order is created regardless; confirming later is what can fail.
- Validation errors from the API (400) show next to the form. A 404 for a customer or product shows as a form error.

**Order detail:**
- Shows the next valid status as the primary action, using the same forward-only rule as the backend (`nextStatus(status)`), plus Cancel for non-terminal orders.
- A 409 on confirm (insufficient stock) shows the API's message, e.g. "Insufficient stock for COKE-24: requested 11, available 10", as a toast. The page then re-renders with fresh data.
- Edit (PENDING only) reuses the order composer, pre-filled.
- Delete (ADMIN, PENDING, no payments) sits behind a confirm dialog.
- Record payment: amount (defaulting to the outstanding amount), method, reference, date (defaulting to today). It is hidden for CANCELLED orders and fully paid ones.
- The payment timeline lists payments with method and reference.

**Products:** the list has search, an "active only" toggle and a low-stock toggle.
- ADMIN can create, edit and deactivate products.
- Stock is read-only on the product form and links to inventory, matching the backend rule.
- The detail page shows the stock ledger, paginated.

**Customers:** list with search; create/edit; ADMIN delete behind a confirm. The detail page shows contact info and paginated order history.

**Inventory:** the stock table with a "low" badge and a `?low=1` filter. ADMIN gets a "Adjust stock" dialog (RESTOCK/ADJUSTMENT, quantity, note, with a note required for ADJUSTMENT).

**Users (ADMIN):** a list of users, a create-staff form, a role/active toggle and a password reset. The admin's own row can't be demoted or deactivated in the UI, matching the API rule. STAFF who hit `/users` get the 403 page.

---

## 6. Data flow and errors

`lib/api.ts` (marked `server-only`):

```ts
apiFetch<T>(path: string, init?: { method?; body?; searchParams? }): Promise<T>
```

- Reads the cookie, adds `Authorization: Bearer <token>` and `Content-Type: application/json`, and uses `cache: 'no-store'`. This is operational data, so it is never cached.
- On a non-2xx response it throws `ApiError { status, message, details }`, parsed from the API's `{ statusCode, message, error }` body. `message` may be an array for validation errors; it is joined for display.
- A **401** clears the cookie and calls `redirect('/login')`.
- If the API is unreachable, it throws `ApiError { status: 503, message: 'Cannot reach the OrderFlow API' }`.

Server Actions return a discriminated result instead of throwing, so forms can show errors:

```ts
type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string> }
```

- 400/404/409 become `{ ok: false }` with the API message.
- Anything else re-throws to the nearest `error.tsx`.
- After a successful mutation the action calls `revalidatePath` for the affected pages.

`error.tsx` shows the message and a "Try again" button (`reset()`), and `not-found.tsx` handles 404s from detail pages (`notFound()` when the API returns 404). `loading.tsx` renders skeletons that match each layout.

---

## 7. Docker Compose

Add a `frontend` service: `frontend/Dockerfile.dev` (`node:22-alpine`, npm@11, `npm ci`), `next dev` on port 3000, source bind-mounted with an anonymous `node_modules` volume, `API_URL=http://backend:4000`, `depends_on: backend`, and `WATCHPACK_POLLING=true` for Windows bind mounts.

---

## 8. Testing

**Unit and component tests (Vitest + React Testing Library, jsdom):**
- `money.ts`: formatting `"1234.5"` → `RM 1,234.50`; sen maths for 0.10 × 3 = 0.30.
- `nextStatus()` / `canCancel()` for every status.
- The order composer: adding and removing items, merging duplicates, the total preview with discount, blocking submit with no customer or no items, and phone and desktop views sharing state.
- `StatusActions`: shows the right buttons per status and role.
- `apiFetch` error parsing: string vs array messages, and the network-failure mapping. `fetch` is mocked here — the one place a mock is the point.

**End-to-end (Playwright):**
- `playwright.config.ts` starts the backend from `../backend` on port 4001 with `DATABASE_URL=…/orderflow_test`, and `next dev` on port 3001 with `API_URL=http://localhost:4001`.
- Global setup truncates the test database's tables with the same guarded TRUNCATE as the backend e2e suite (only if the URL contains `orderflow_test`).
- **Journey test**, run as two projects (Pixel 7 at 412px, desktop Chrome at 1280px):
  1. Register the first admin; log out; log in.
  2. Create two products (one with low stock) and a customer.
  3. Create an order with two items and a discount; check the total.
  4. Confirm it; check the stock dropped on the inventory page.
  5. Move it to DELIVERED.
  6. Record a partial payment, then the rest; check the payment status reads PAID.
  7. Check the dashboard counts; check the low-stock product appears.
  8. As a created STAFF user, check the admin actions are absent.
- **Plus one error-path test:** confirming an order without enough stock shows the API's insufficient-stock message.

---

## 9. Rulings on gaps between the brief, the backend and this UI

- **Multi-status filters** ("awaiting fulfilment" = CONFIRMED, PACKING or READY; "unpaid" = UNPAID or PARTIAL): the API filters one value at a time. For the MVP the dashboard links use a comma list. The orders page sends one request per status (at most 3) and merges and sorts the results, with a note that pagination is approximate in that mode. *Cost if wrong:* approximate pages on those filtered views. Upgrade path: accept `status=A,B` in the backend (a one-line `in` filter).
- **"Recent orders" on the desktop dashboard** uses `GET /orders?limit=5`, so no new endpoint is needed.
- **README encoding:** convert `README.md` from UTF-16 to UTF-8 on this branch, and add frontend run instructions.

---

## 10. Plan-time amendments

1. Multi-status filters: the backend now accepts comma lists (`?status=CONFIRMED,PACKING,READY`, `?paymentStatus=UNPAID,PARTIAL`). This replaces the client-side merge in §9, so pagination is exact.
2. A 401 during rendering redirects to the route handler `/session/expired`, which deletes the cookie and redirects to `/login?expired=1`. Next 16 only allows cookie writes in Server Functions and Route Handlers.
3. Stock warnings after creating an order are shown as a toast during navigation, not as a banner.
4. Pagination is Previous/Next with "Page x of y" on both layouts. There is no column sorting because the API has no sort parameter.
5. Forms show one API error message plus native HTML validation. There are no per-field server errors.
6. One generic loading skeleton for the authenticated area.

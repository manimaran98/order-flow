# OrderFlow — Sub-project 1: Foundation, Data Model & Backend API

Date: 2026-09-29
Source brief: [OrderFlow_Malaysian_SME_MVP.md](../../../OrderFlow_Malaysian_SME_MVP.md)
Status: Draft — awaiting review

---

## 1. Scope

OrderFlow is split into three sub-projects, each with its own spec → plan → build cycle:

1. **Foundation + data model + backend API** ← this spec (foundation and backend merged because the schema and transaction rules are designed together)
2. Frontend (Next.js pages, dashboard)
3. DevOps (production Dockerfiles, GitHub Actions, AWS)

**In scope:** repo layout, project setup files, Docker Compose (Postgres + backend), Prisma schema + migrations + seed, NestJS modules for auth, users, customers, products, orders, inventory, payments, dashboard, health; validation, error handling, Swagger, backend tests.

**Out of scope:** everything in brief §24 (WhatsApp, AI, banking, Redis, queues, multi-company…), the frontend, production Dockerfiles, CI, cloud, refunds, refresh tokens, password reset.

**Done when:** `docker compose up` on a clean machine starts Postgres + API with migrations applied, and the API alone can execute brief §23 steps 1–11 (step 12 is served by `GET /dashboard/summary`), with the test suite green.

---

## 2. Agreed decisions

| # | Decision |
|---|---|
| D1 | Single business per deployment. No tenant/company entity. |
| D2 | Money = Postgres `DECIMAL(12,2)`, RM only. Serialized as strings in JSON (`"500.00"`). Arithmetic with `Prisma.Decimal`, never JS floats. |
| D3 | No stock reservation at order creation. Creation returns stock *warnings*; the hard check happens at confirm. |
| D4 | Repo: `frontend/` and `backend/` as independent npm projects (no workspaces). |
| D5 | First user to call `POST /auth/register` becomes ADMIN; afterwards register returns 403. ADMINs create STAFF via `POST /users`. |
| D6 | Strict order state machine (§6). Only PENDING orders are editable/deletable. |
| D7 | NestJS accepts `Authorization: Bearer <jwt>` only. Single access token, 8h expiry, no refresh token. (Next.js will hold it in an httpOnly cookie — sub-project 2.) |
| D8 | Tests: pure-logic unit tests + Supertest API tests against a real `orderflow_test` Postgres. One concurrency test. No mocked Prisma. |
| D9 | Concurrency via conditional updates (`UPDATE … WHERE <guard>`, check affected rows) + DB `CHECK` constraints as backstop. No explicit locks, no version columns. |
| D10 | Order number `ORD-YYYYMMDD-NNNN` from a global Postgres sequence (does not reset daily; date part uses Asia/Kuala_Lumpur). |
| D11 | Discount is a fixed RM amount, `0 ≤ discount ≤ subtotal`. |
| D12 | `OrderItem.unitPrice` is snapshotted from `Product.sellingPrice` when the item is added. |
| D13 | `Product.stockQuantity` is the cached current stock; every change also writes an `InventoryTransaction` row in the same DB transaction. |
| D14 | No `Payment.status`. A recorded payment is final. Order `paymentStatus` is derived from `paidAmount` vs `total`. |
| D15 | `POST /inventory/adjustments` (ADMIN) for RESTOCK/ADJUSTMENT — the brief's API had no way to add stock. |
| D16 | Swagger UI at `/docs` via `@nestjs/swagger`. |
| D17 | "Today" for dashboard metrics = calendar day in `Asia/Kuala_Lumpur`. |

---

## 3. Repository layout

```text
order-flow/
├── CLAUDE.md                     # from ~/.claude/templates (NEW_PROJECT_SETUP.md)
├── .claude/
│   ├── MEMORY.md
│   └── skills/                   # new-feature.md, qa-review.md
├── docker-compose.yml
├── .env.example
├── docker/
│   └── postgres-init.sql         # creates orderflow_test database
├── docs/superpowers/specs/
├── OrderFlow_Malaysian_SME_MVP.md
├── backend/
│   ├── Dockerfile.dev
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── prisma/               # PrismaService (global module)
│   │   ├── common/               # guards, decorators, filters, pagination, money helpers
│   │   ├── auth/
│   │   ├── users/
│   │   ├── customers/
│   │   ├── products/
│   │   ├── orders/
│   │   ├── inventory/
│   │   ├── payments/
│   │   ├── dashboard/
│   │   └── health/
│   └── test/                     # Supertest API tests
└── frontend/                     # created in sub-project 2
```

Each feature module: `*.controller.ts`, `*.service.ts`, `dto/`, `*.module.ts`. Services use `PrismaService` directly — no separate repository layer (Prisma is the repository).

---

## 4. Local environment

**docker-compose.yml** services:

| Service | Image / build | Port | Notes |
|---|---|---|---|
| `postgres` | `postgres:16-alpine` | 5432 | Named volume; `docker/postgres-init.sql` creates `orderflow_test`; healthcheck `pg_isready`. |
| `backend` | `backend/Dockerfile.dev` (Node 22) | 4000 | Source bind-mounted; command `npx prisma migrate deploy && npm run start:dev`; `depends_on: postgres (healthy)`. |

`frontend` is added in sub-project 2.

**Environment variables** (`.env.example`, validated at boot — the app refuses to start if any is missing):

```text
DATABASE_URL=postgresql://orderflow:orderflow@postgres:5432/orderflow
JWT_SECRET=change-me
JWT_EXPIRES_IN=8h
PORT=4000
CORS_ORIGIN=http://localhost:3000
```

Tests use `DATABASE_URL` pointing to `orderflow_test` (via `backend/.env.test`).

**Seed** (`npm run seed`, dev only): ~15 products (some below threshold), ~8 customers, a handful of orders in mixed states with payments, plus a demo ADMIN `admin@orderflow.local` / `Admin123!` and one STAFF. Seeding goes through the same service-level rules (no raw stock edits) so the ledger stays consistent. Skip seeding if you want to exercise first-user registration.

---

## 5. Data model

### 5.1 Enums

```text
Role:              ADMIN | STAFF
OrderStatus:       PENDING | CONFIRMED | PACKING | READY | DELIVERED | CANCELLED
PaymentStatus:     UNPAID | PARTIAL | PAID
PaymentMethod:     CASH | BANK_TRANSFER | CARD | OTHER
InventoryTxType:   SALE | RESTOCK | ADJUSTMENT | RETURN
InventoryRefType:  ORDER | MANUAL
```

### 5.2 Models

**User**
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | string | |
| email | string | unique, stored lowercased |
| passwordHash | string | bcrypt, cost 10 |
| role | Role | |
| isActive | bool | default true; inactive users cannot log in or use existing tokens |
| createdAt / updatedAt | timestamptz | |

**Customer**
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | string | required |
| phone | string? | indexed (WhatsApp lookup) |
| email | string? | |
| address, notes | string? | |
| deletedAt | timestamptz? | soft delete — orders keep referencing the customer |
| createdAt / updatedAt | | |

**Product**
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | string | indexed |
| sku | string | unique |
| description | string? | |
| sellingPrice | Decimal(12,2) | `CHECK (selling_price >= 0)` |
| costPrice | Decimal(12,2) | `CHECK (cost_price >= 0)` |
| stockQuantity | int | default 0, `CHECK (stock_quantity >= 0)` |
| lowStockThreshold | int | default 0, ≥ 0 |
| isActive | bool | "delete" = deactivate |
| createdAt / updatedAt | | |

**Order**
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| orderNumber | string | unique; `ORD-YYYYMMDD-NNNN` from sequence `order_number_seq` |
| customerId | FK → Customer | indexed |
| status | OrderStatus | default PENDING, indexed |
| paymentStatus | PaymentStatus | default UNPAID, indexed |
| subtotal | Decimal(12,2) | sum of item subtotals |
| discount | Decimal(12,2) | default 0 |
| total | Decimal(12,2) | subtotal − discount |
| paidAmount | Decimal(12,2) | default 0; `CHECK (paid_amount >= 0 AND paid_amount <= total)` |
| notes | string? | |
| createdById | FK → User | |
| confirmedAt, cancelledAt, deliveredAt | timestamptz? | set on the relevant transition |
| createdAt / updatedAt | | createdAt indexed |

`outstandingAmount` is computed (`total − paidAmount`) and returned in responses, not stored. `paidAmount` is stored (denormalized) so the overpayment guard can be a single conditional update and so list/dashboard queries don't aggregate payments.

Additional constraints: `CHECK (discount >= 0 AND discount <= subtotal)`, `CHECK (total = subtotal - discount)`.

**OrderItem**
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| orderId | FK → Order | cascade delete (only reachable while PENDING) |
| productId | FK → Product | |
| quantity | int | `CHECK (quantity > 0)` |
| unitPrice | Decimal(12,2) | snapshot |
| subtotal | Decimal(12,2) | quantity × unitPrice |

Unique `(orderId, productId)` — the same product appears once per order; quantities are merged in the DTO.

**Payment**
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| orderId | FK → Order | indexed |
| amount | Decimal(12,2) | `CHECK (amount > 0)` |
| method | PaymentMethod | |
| reference | string? | bank ref / receipt no. |
| paidAt | timestamptz | defaults to now; may be backdated, not in the future |
| recordedById | FK → User | |
| createdAt | | |

**InventoryTransaction**
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| productId | FK → Product | indexed with createdAt |
| type | InventoryTxType | |
| quantity | int | signed: SALE < 0, RETURN > 0, RESTOCK > 0, ADJUSTMENT ≠ 0 |
| referenceType | InventoryRefType | |
| referenceId | uuid? | orderId when referenceType = ORDER |
| note | string? | required for ADJUSTMENT |
| createdById | FK → User | |
| createdAt | | |

CHECK constraints and the sequence are added by hand-editing the generated SQL migration (Prisma doesn't express them in the schema).

---

## 6. Order lifecycle

```text
PENDING ──► CONFIRMED ──► PACKING ──► READY ──► DELIVERED
   │            │            │          │
   └────────────┴────────────┴──────────┴──► CANCELLED
```

- Transitions are forward one step, or to CANCELLED from any non-terminal state. DELIVERED and CANCELLED are terminal. Anything else → **409 Conflict** `"Cannot change status from X to Y"`.
- The allowed-transition table lives in one pure function `canTransition(from, to)` (unit-tested).
- **PENDING → CONFIRMED** deducts stock (§7.2).
- **→ CANCELLED from CONFIRMED/PACKING/READY** restores stock (§7.3). Cancelling from PENDING touches no stock.
- **Editing** (`PATCH /orders/:id`: customer, items, discount, notes) is allowed only while PENDING. If the new total would be below `paidAmount` (deposit already taken) → 409.
- **Deleting** (`DELETE /orders/:id`) is ADMIN-only and PENDING-only, and only if the order has no payments. Otherwise → 409 "cancel instead".

Payment status is independent of order status (brief §6).

---

## 7. Transactional workflows

All multi-row writes run inside `prisma.$transaction(async tx => …)` at the default READ COMMITTED isolation. Correctness comes from guarded conditional updates; each one either changes exactly the expected rows or the transaction throws and rolls back.

### 7.1 Create order (`POST /orders`)

1. Validate customer exists and is not deleted; all products exist and are active (else 400/404).
2. Merge duplicate productIds; snapshot `unitPrice`; compute item subtotals, `subtotal`, validate discount, compute `total`.
3. `SELECT nextval('order_number_seq')` → build `orderNumber`.
4. Insert order + items (status PENDING, paymentStatus UNPAID, paidAmount 0).
5. Response includes `stockWarnings: [{ productId, sku, requested, available }]` for any item where `requested > stockQuantity`. The order is still created (D3).

### 7.2 Confirm (`PATCH /orders/:id/status` → CONFIRMED)

In one transaction:

1. **Claim:** `tx.order.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'CONFIRMED', confirmedAt: now } })`. `count === 0` → re-read the order: not found → 404, else 409 with its current status. This is what prevents double confirmation.
2. For each item (ordered by productId): `tx.product.updateMany({ where: { id: productId, stockQuantity: { gte: qty } }, data: { stockQuantity: { decrement: qty } } })`. `count === 0` → throw `InsufficientStockException(sku, requested, available)` → **409**, whole transaction rolls back (order stays PENDING).
3. Insert one `SALE` InventoryTransaction per item (`quantity: -qty`, `referenceType: ORDER`, `referenceId: orderId`).

Postgres takes a row lock on each updated product, so two concurrent confirms that compete for the same stock are serialized: the second one re-evaluates `stockQuantity >= qty` against the committed value. The `CHECK (stock_quantity >= 0)` constraint is the backstop if code ever regresses.

### 7.3 Cancel (`PATCH /orders/:id/status` → CANCELLED)

1. **Claim:** read the current status `prev` (must be non-terminal, else 409), then `updateMany({ where: { id, status: prev }, data: { status: 'CANCELLED', cancelledAt: now } })`. `count === 0` means the status changed underneath us → 409. Guarding on the exact `prev` is what makes step 2's stock decision correct.
2. If previous status was CONFIRMED/PACKING/READY: increment each product's stock and insert `RETURN` rows (`+qty`).

The status claim makes sure stock can't be restored twice.

### 7.4 Other status moves

CONFIRMED → PACKING → READY → DELIVERED: the same guarded `updateMany` with `where: { id, status: <expected previous> }`; `deliveredAt` is set on DELIVERED. No stock effect.

### 7.5 Record payment (`POST /payments`)

In one transaction:

1. Guarded raw update (Prisma can't express column arithmetic in `where`):
   ```sql
   UPDATE orders
   SET paid_amount = paid_amount + $amount,
       payment_status = CASE WHEN paid_amount + $amount = total THEN 'PAID' ELSE 'PARTIAL' END,
       updated_at = now()
   WHERE id = $orderId
     AND status <> 'CANCELLED'
     AND paid_amount + $amount <= total
   ```
   0 rows → re-read the order: not found → 404; cancelled → 409; else → 409 `"Payment exceeds outstanding amount (RM x)"`.
2. Insert the Payment row.

The `paid_amount <= total` CHECK is the backstop. A payment is allowed in any status except CANCELLED (deposits on PENDING orders are OK).

Editing a PENDING order's items/discount recomputes `total` and then `paymentStatus` from `paidAmount` via the pure function `derivePaymentStatus(total, paid)`.

### 7.6 Inventory adjustment (`POST /inventory/adjustments`, ADMIN)

Body: `{ productId, type: RESTOCK | ADJUSTMENT, quantity, note? }`. RESTOCK needs quantity > 0; ADJUSTMENT needs quantity ≠ 0 and a note. Negative adjustments use the same `stockQuantity: { gte: |qty| }` guard → 409 if it would go negative. Writes the ledger row in the same transaction.

---

## 8. API

Global conventions:

- JSON only. Money as strings. Dates as ISO-8601 UTC.
- List endpoints: `?page=1&limit=20` (limit max 100) → `{ data: [...], meta: { page, limit, total, totalPages } }`.
- Validation: global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`.
- Auth: global `JwtAuthGuard`; `@Public()` opts out. `@Roles('ADMIN')` + `RolesGuard` for admin-only routes.
- `JwtStrategy.validate` loads the user by id and rejects inactive/deleted users (so deactivation takes effect immediately, at the cost of one indexed lookup per request).

| Method & path | Access | Notes |
|---|---|---|
| `POST /auth/register` | Public | Works only while the users table is empty → creates ADMIN; else 403. Returns `{ accessToken, user }`. |
| `POST /auth/login` | Public | 401 on bad credentials or inactive user (same message for both). |
| `GET /auth/me` | Any | |
| `GET /users` | ADMIN | |
| `GET /users/:id` | ADMIN | |
| `POST /users` | ADMIN | Create STAFF or ADMIN. |
| `PATCH /users/:id` | ADMIN | name, role, isActive, password. An admin cannot deactivate or demote themselves. |
| `GET /customers` | Any | `?search=` name/phone/email (ILIKE); excludes deleted. |
| `GET /customers/:id` | Any | Includes the last 20 orders summary. |
| `GET /customers/:id/orders` | Any | Paginated order history. |
| `POST /customers` | Any | Staff create customers while taking WhatsApp orders. |
| `PATCH /customers/:id` | Any | |
| `DELETE /customers/:id` | ADMIN | Soft delete. |
| `GET /products` | Any | `?search=` name/SKU, `?active=true|false`, `?lowStock=true`. |
| `GET /products/:id` | Any | |
| `POST /products` | ADMIN | Initial `stockQuantity` > 0 writes a RESTOCK ledger row. |
| `PATCH /products/:id` | ADMIN | `stockQuantity` is **not** patchable — use adjustments. |
| `DELETE /products/:id` | ADMIN | Sets `isActive = false`. |
| `GET /orders` | Any | `?status= &paymentStatus= &customerId= &search=` (orderNumber or customer name) `&from= &to=`; newest first. |
| `GET /orders/:id` | Any | Items, customer, payments, `outstandingAmount`. |
| `POST /orders` | Any | §7.1. |
| `PATCH /orders/:id` | Any | PENDING only. |
| `PATCH /orders/:id/status` | Any | `{ status }` — §6/§7. |
| `DELETE /orders/:id` | ADMIN | PENDING, no payments. |
| `GET /inventory` | Any | Products with stock + threshold + `isLow`. |
| `GET /inventory/low-stock` | Any | Active products with `stockQuantity <= lowStockThreshold`. |
| `GET /inventory/:productId` | Any | Product + paginated ledger. |
| `POST /inventory/adjustments` | ADMIN | §7.6. |
| `GET /payments` | Any | `?orderId= &method= &from= &to=` |
| `GET /payments/:id` | Any | |
| `POST /payments` | Any | §7.5. |
| `GET /dashboard/summary` | Any | §9. |
| `GET /health` | Public | `{ status: 'ok' }` after a `SELECT 1`. |

`/docs` serves Swagger UI with bearer auth configured.

---

## 9. Dashboard summary

`GET /dashboard/summary` → one object, computed with a few aggregate queries:

| Field | Definition |
|---|---|
| `todayOrders` | orders created today (MYT), excluding CANCELLED |
| `todaySales` | sum of `total` of those orders |
| `unpaidOrders` | count of non-cancelled orders with paymentStatus ≠ PAID |
| `outstandingAmount` | sum of `total − paidAmount` over those |
| `pendingOrders` | status = PENDING |
| `awaitingFulfilment` | status ∈ CONFIRMED, PACKING, READY |
| `lowStockProducts` | active products with `stockQuantity <= lowStockThreshold` |
| `completedOrders` | status = DELIVERED (all time) |

---

## 10. Error handling

- Built-in Nest HTTP exceptions keep the brief's shape `{ statusCode, message, error }`.
- A global `PrismaExceptionFilter` maps: `P2002` unique violation → 409 (`"SKU already exists"` etc. using the target field), `P2025` not found → 404, `P2003` FK violation → 400, CHECK violation (`23514`) → 409. Anything unmapped → 500, logged with a stack trace, generic message to the client.
- Domain exceptions: `InsufficientStockException` (409, includes `sku`, `requested`, `available`), `InvalidStatusTransitionException` (409), `OverpaymentException` (409).

---

## 11. Testing

Runner: Jest (Nest default). `npm test` = unit tests; `npm run test:e2e` = API tests against `orderflow_test`.

**Unit (no DB):** `canTransition` full matrix; `derivePaymentStatus`; order totals/discount maths with Decimal edge cases (e.g. 0.1 + 0.2); order-number formatting (MYT date boundary).

**API (Supertest, real Postgres):** before the suite, `prisma migrate reset --force --skip-seed` on the test DB; tables truncated between test files. Scenarios, covering brief §19:

- Register first user → ADMIN; second register → 403; login; inactive user → 401; STAFF hitting ADMIN route → 403; no token → 401.
- Product CRUD; duplicate SKU → 409; negative price → 400.
- Customer CRUD; soft delete hides from list.
- Create order: totals correct; discount > subtotal → 400; inactive product → 400; stock warning returned.
- Confirm: stock deducted + SALE ledger rows; insufficient stock → 409 and nothing changed; confirm twice → 409.
- Invalid transitions (PENDING → READY, DELIVERED → CANCELLED) → 409.
- Cancel after confirm restores stock + RETURN rows; cancel from PENDING leaves stock alone.
- Edit a non-PENDING order → 409.
- Payment: partial → PARTIAL; completing → PAID; overpayment → 409; payment on a cancelled order → 409.
- Adjustment: restock; negative beyond stock → 409.
- Dashboard numbers match seeded fixtures.
- **Concurrency:** product stock = 5; two PENDING orders of qty 5 each; `Promise.all` both confirms → exactly one 200, one 409, final stock 0, exactly one SALE row. Same pattern for two concurrent payments that together exceed the total.

---

## 12. Project setup (per ~/.claude/NEW_PROJECT_SETUP.md)

The first implementation task: `git init`, `.gitignore`, `CLAUDE.md` from the template (filled in with this stack and the rules in §6–§7), `.claude/skills/` (new-feature, qa-review adapted to Nest + Prisma), `.claude/MEMORY.md`.

---

## 13. Open for later sub-projects

- Frontend (sub-project 2): Next.js route handlers for login/logout that set the httpOnly cookie; the `frontend` compose service.
- DevOps (sub-project 3): production multi-stage Dockerfiles, GitHub Actions (lint, unit, e2e with a Postgres service container, build images), ECR/ECS/RDS.

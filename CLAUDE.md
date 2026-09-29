# Project Brain: OrderFlow
# Order-to-payment tracker for Malaysian SMEs: orders, stock, payments and fulfilment in one place.

---

## Tech Stack
| Layer | Technology |
|---|---|
| Backend | NestJS 12 (ESM), TypeScript 6, Node 22 |
| Database | PostgreSQL 16 |
| ORM / Migrations | Prisma 7.10 (`prisma-client` generator, `@prisma/adapter-pg`) |
| Frontend | Next.js App Router + Tailwind (sub-project 2, not built yet) |
| Auth | JWT bearer (`@nestjs/jwt`), 8h access token, ADMIN / STAFF roles |
| Tests | Vitest + Supertest against real Postgres (`orderflow_test`) |
| Infra | Docker Compose (postgres, backend) |

---

## Architecture Rules
- Relative imports end in `.js` (ESM). Type aliases used in decorated signatures need `import type`.
- Controllers stay thin; business rules live in services. Services use `PrismaService` directly (no repository layer).
- Money: `Prisma.Decimal` only, created with `money()`; never JS number maths. JSON serializes as `"12.50"`.
- Every stock change goes through `InventoryService` and writes an `InventoryTransaction` row in the same transaction. `Product.stockQuantity` is never PATCHed directly.
- Concurrency: guarded conditional updates (`updateMany({ where: { id, status: 'PENDING' } })`, then check `count`), with no explicit locks. DB CHECK constraints are the backstop and are hand-added to migration SQL.
- Order lifecycle is `canTransition()` in `backend/src/orders/order-rules.ts`: forward one step, or cancel from any non-terminal state. Only PENDING orders are editable or deletable.
- Order status and payment status are independent. Payment status is derived from `paidAmount` vs `total`.
- The business timezone for "today" and order numbers is Asia/Kuala_Lumpur.

---

## Key File Paths
| Purpose | Path |
|---|---|
| Prisma schema | `backend/prisma/schema.prisma` |
| Migrations | `backend/prisma/migrations/` |
| Generated client (git-ignored) | `backend/src/generated/prisma/` |
| Feature modules | `backend/src/<feature>/` |
| Shared helpers | `backend/src/common/` |
| App bootstrap / global setup | `backend/src/main.ts`, `backend/src/app.setup.ts` |
| Env validation | `backend/src/config/env.validation.ts` |
| API tests | `backend/test/*.e2e-spec.ts` |
| Specs & plans | `docs/superpowers/` |

---

## Access Control
- Roles: ADMIN > STAFF
- How it works: global `JwtAuthGuard` + `RolesGuard` (`backend/src/auth/`). `@Public()` opts out, `@Roles('ADMIN')` restricts.
- Rule: new admin-only endpoints need `@Roles('ADMIN')` plus an e2e test showing STAFF gets 403.

---

## Implemented Features (log of what's been built)
| Version / Migration | Feature |
|---|---|
| `init` | Core schema: users, customers, products, orders, order items, payments, inventory ledger |
| — | Auth (first-user ADMIN, JWT), users, customers, products, inventory adjustments, orders + lifecycle, payments, dashboard, seed, Swagger |

---

## Collaboration Preferences
- Ask clarifying questions before building when requirements are ambiguous
- Build fully — no stubs or placeholder implementations
- Match existing code style; don't refactor beyond what's asked
- Prefer taking the recommended option and moving; batch decisions rather than asking one at a time for small defaults

---

# Workflow Reference

## Agentic Loop (use for every feature)
1. **Spec first** — brainstorm → spec in `docs/superpowers/specs/`
2. **Plan** — `docs/superpowers/plans/`
3. **Build** — TDD, one task per commit
4. **QA** — spawn a QA agent with the `qa-review` skill
5. **Verify** — `npm run lint && npm run build && npm test && npm run test:e2e` in `backend/`

## Skills (`.claude/skills/`)
- **`new-feature`** — end-to-end checklist for adding any new feature
- **`qa-review`** — what to check before a feature is merged
- **`new-migration`** — safe Prisma migration authoring

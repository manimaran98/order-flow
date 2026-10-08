# OrderFlow

Order-to-payment tracking for Malaysian SMEs that take orders over WhatsApp and the phone. It keeps orders, stock, payments and fulfilment in one place. It is not a POS and not accounting.

See the [product brief](OrderFlow_Malaysian_SME_MVP.md) and the [backend design spec](docs/superpowers/specs/2026-09-29-orderflow-backend-foundation-design.md).

## Quick start

```bash
docker compose up --build
```

- App: http://localhost:3000 (log in, or create the first account)
- API: http://localhost:4000 · Swagger UI: http://localhost:4000/docs
- Postgres: localhost:5432 (`orderflow` / `orderflow`)

Load demo data (optional; skip it to try first-user registration):

```bash
docker compose exec backend npm run seed
# admin@orderflow.local / Admin123!   staff@orderflow.local / Staff123!
```

## Backend development

```bash
cd backend
cp .env.example .env
npm install
docker compose up -d postgres
npx prisma migrate deploy
npm run start:dev
```

| Command | What it does |
|---|---|
| `npm test` | Unit tests (pure rules, helpers) |
| `npm run test:e2e` | API tests against the `orderflow_test` database (tables emptied before each test) |
| `npm run lint` / `npm run build` | oxlint / compile |
| `npm run db:migrate` | Create and apply a migration in development |

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
| `npm run test:e2e` | Playwright journey at phone and desktop sizes. It starts its own backend (:4001) and app (:3001) against `orderflow_test`; stop the compose `backend`/`frontend` containers first. |
| `npm run lint` / `npm run typecheck` / `npm run build` | ESLint / tsc / production build |

The browser only ever talks to Next.js. Server Components and Server Actions call the API with the JWT from an httpOnly cookie, so the token is never exposed to page scripts.

## Production images

`docker-compose.yml` is for development (hot reload, source mounted). The production images are multi-stage builds that run as the non-root `node` user:

| Image | Dockerfile target | What it does |
|---|---|---|
| backend | `backend/Dockerfile` → `runtime` | Compiled API with production dependencies only. Health check on `/health`. |
| backend-migrate | `backend/Dockerfile` → `migrate` | One-off job: `prisma migrate deploy`, then exits. Run it before each backend release. |
| frontend | `frontend/Dockerfile` | Next.js standalone server. `API_URL` is read at runtime, so one image serves every environment. |

To run them locally:

```bash
JWT_SECRET=$(openssl rand -hex 32) docker compose -f docker-compose.prod.yml up --build
docker compose -f docker-compose.prod.yml exec backend node dist/seed.js   # optional demo data
```

## CI

`.github/workflows/ci.yml` runs on every pull request and every push to `main`:

1. **Backend**: lint, typecheck, build, unit tests and API e2e tests against a Postgres 16 service container.
2. **Frontend**: lint, typecheck, unit tests and production build.
3. **Playwright**: the phone and desktop journey, once both jobs above pass. If it fails, the report is uploaded as an artifact.
4. **Docker images**: all three images are built on every run. Pushes to `main` also publish them to GHCR as `ghcr.io/<owner>/order-flow-<image>:<sha>` and `:latest`.

## How the tricky parts work

- **No overselling:** confirming an order runs `UPDATE products SET stock = stock - q WHERE stock >= q` per item inside one transaction. Zero rows updated means insufficient stock, and everything rolls back. A `CHECK (stock_quantity >= 0)` constraint backs it up.
- **No double confirmation or restore:** status changes claim the row with `WHERE status = <expected>`. The loser of a race gets a 409.
- **No overpayment:** one guarded `UPDATE orders … WHERE paid_amount + amount <= total`, backed by a CHECK constraint.
- **Audit trail:** every stock change writes an `inventory_transactions` row in the same transaction.

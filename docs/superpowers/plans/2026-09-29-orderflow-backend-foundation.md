# OrderFlow Backend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the OrderFlow NestJS + PostgreSQL backend: auth, customers, products, inventory ledger, orders with a strict lifecycle and race-safe stock deduction, payments with overpayment protection, and an operational dashboard. It runs with `docker compose up`.

**Architecture:** One NestJS 12 app (ESM) with a feature module per domain (controller → service → Prisma). Correctness under concurrency comes from guarded conditional updates (`UPDATE … WHERE <guard>`, then check the affected-row count) inside Prisma interactive transactions, backed by Postgres CHECK constraints. Stock changes always write an `InventoryTransaction` row in the same transaction.

**Tech Stack:** Node 22, NestJS 12, TypeScript 6, Prisma 7.10 (`prisma-client` generator + `@prisma/adapter-pg`), PostgreSQL 16, `@nestjs/jwt`, bcryptjs, class-validator, `@nestjs/swagger`, Vitest 4 + Supertest, oxlint, Docker Compose.

**Spec:** [docs/superpowers/specs/2026-09-29-orderflow-backend-foundation-design.md](../specs/2026-09-29-orderflow-backend-foundation-design.md)

**Branch:** work on `feat/backend-foundation`, branched from `spec/backend-foundation`.

## Global Constraints

- Node 22 in containers (`node:22-alpine`). `engines.node` is `>=22`.
- The backend is ESM (`"type": "module"`). **Every relative import ends in `.js`**, e.g. `import { X } from './x.js'`.
- `isolatedModules` + `emitDecoratorMetadata` are on. A **type alias** used in a decorated signature (e.g. `@CurrentUser() user: PublicUser`) must be imported with `import type`, or tsc fails with TS1272. Classes (services, DTOs) use normal imports so DI and validation metadata work.
- Prisma is pinned `^7.10.0` (npm `latest` is an 8.0 RC; do not use it). Import generated types from `src/generated/prisma/client.js` (git-ignored, produced by `prisma generate`).
- Prisma 7 does **not** auto-run `generate` or seed after `migrate dev` / `migrate reset`. Run `npx prisma generate` explicitly.
- Money is `DECIMAL(12,2)` and uses `Prisma.Decimal` arithmetic only, never JS number maths. Incoming money DTO fields are `@IsNumber({ maxDecimalPlaces: 2 })`. Convert them with `money()` from `src/common/money.ts`. Money serializes in JSON as strings with 2 decimals (`"12.50"`).
- Raw SQL uses snake_case column names. It casts parameters: `${id}::uuid`, `${amount}::numeric`, `(…)::"PaymentStatus"`.
- Error body shape: `{ statusCode, message, error }`.
- Business timezone is `Asia/Kuala_Lumpur` (UTC+8, no DST).
- Access: global `JwtAuthGuard` (`@Public()` opts out) and `RolesGuard` (`@Roles('ADMIN')`).
- Tests: unit specs in `src/**/*.spec.ts` (`npm test`). API specs in `test/**/*.e2e-spec.ts` (`npm run test:e2e`) run against real Postgres `orderflow_test`. Never mock Prisma. Each e2e test starts from `resetDb()`.
- Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- **Malformed UUIDs in path params** (e.g. `/users/abc`) → 400, never a 500 from Postgres. Pinned in Task 4 (users) and Task 8 (orders).
- **Money with more than 2 decimals** (`12.345`) → 400, never silently rounded. Pinned in Task 6 (product price) and Task 10 (payment amount).
- **Email case** (`Aisyah@Shop.my` at register, `AISYAH@shop.my` at login) → same account. Pinned in Task 4.
- **Out-of-range pagination** (`limit=0`, `limit=101`, `page=0`) → 400. Pinned in Task 8.
- **Duplicate product lines in one order** → merged into one item, never a unique-constraint 409/500. Pinned in Task 8.

---

## File Map

```text
.gitattributes / .gitignore / README.md / CLAUDE.md
.claude/MEMORY.md, .claude/skills/{new-feature,qa-review,new-migration}.md
docker-compose.yml
docker/postgres-init.sql
backend/
  Dockerfile.dev, .dockerignore, .env.example, .env.test
  prisma.config.ts, prisma/schema.prisma, prisma/migrations/
  vitest.config.ts, vitest.config.e2e.ts, oxlint.json, nest-cli.json
  src/
    main.ts                 bootstrap + Swagger
    app.module.ts           root module
    app.setup.ts            configureApp(): pipes, filter, CORS (shared by main + tests)
    seed.ts                 dev seed via services
    config/env.validation.ts
    prisma/prisma.module.ts, prisma.service.ts
    common/money.ts         Decimal helpers + JSON serialization
    common/time.ts          business-day helpers (MYT)
    common/pagination.ts    PaginationQueryDto, paginate(), skipTake()
    common/transforms.ts    ToBoolean()
    common/exceptions.ts    InsufficientStock / InvalidStatusTransition / Overpayment
    common/prisma-exception.filter.ts
    health/health.controller.ts
    auth/   auth.module.ts, auth.controller.ts, auth.service.ts, password.ts,
            jwt-auth.guard.ts, roles.guard.ts, decorators.ts, dto/{register,login}.dto.ts
    users/  users.module.ts, users.controller.ts, users.service.ts, user.select.ts, dto/{create-user,update-user}.dto.ts
    customers/ customers.module.ts, customers.controller.ts, customers.service.ts, dto/customer.dto.ts
    products/  products.module.ts, products.controller.ts, products.service.ts, dto/product.dto.ts
    inventory/ inventory.module.ts, inventory.controller.ts, inventory.service.ts, dto/adjust-stock.dto.ts
    orders/    orders.module.ts, orders.controller.ts, orders.service.ts, order-rules.ts, dto/order.dto.ts
    payments/  payments.module.ts, payments.controller.ts, payments.service.ts, dto/payment.dto.ts
    dashboard/ dashboard.module.ts, dashboard.controller.ts, dashboard.service.ts
  test/
    global-setup.ts
    utils/{app,db,auth,fixtures}.ts
    *.e2e-spec.ts
```

---

### Task 0: Project setup files

**Files:**
- Create: `.gitattributes`, `.gitignore`, `CLAUDE.md`, `.claude/MEMORY.md`, `.claude/skills/new-feature.md`, `.claude/skills/qa-review.md`, `.claude/skills/new-migration.md`

**Interfaces:** none (docs and config only).

- [ ] **Step 1: Create the branch**

```bash
git checkout -b feat/backend-foundation
```

- [ ] **Step 2: Write `.gitattributes`**

```text
* text=auto eol=lf
*.png binary
*.jpg binary
```

- [ ] **Step 3: Write `.gitignore`**

```text
node_modules/
dist/
coverage/
.env
!.env.example
!.env.test
backend/src/generated/
*.log
.DS_Store
```

- [ ] **Step 4: Write `CLAUDE.md`** (filled from `~/.claude/templates/CLAUDE.md`)

````markdown
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
````

- [ ] **Step 5: Write `.claude/skills/new-feature.md`**

```markdown
# Skill: Add a New Backend Feature (OrderFlow)

Work top-to-bottom. Do not skip steps.

## 1. Plan
- [ ] Confirm scope with the user; list every file to create/modify
- [ ] Decide DB changes and who may call each endpoint (ADMIN / STAFF)

## 2. Database
- [ ] Follow the `new-migration` skill

## 3. Backend
- [ ] `src/<feature>/dto/*.ts` with class-validator (money: `@IsNumber({ maxDecimalPlaces: 2 })`)
- [ ] `src/<feature>/<feature>.service.ts`: multi-row writes in `prisma.$transaction`, guarded `updateMany` for state changes
- [ ] `src/<feature>/<feature>.controller.ts`: `ParseUUIDPipe` on ids, `@Roles('ADMIN')` where needed
- [ ] Register the module in `src/app.module.ts`

## 4. Tests
- [ ] Pure logic → `src/**/*.spec.ts`
- [ ] Endpoints → `test/<feature>.e2e-spec.ts` (happy path, validation 400, 403 for STAFF on admin routes, 404, 409 rules)

## 5. Verify
- [ ] `npm run lint && npm run build && npm test && npm run test:e2e`
- [ ] Run the QA agent with the `qa-review` skill
```

- [ ] **Step 6: Write `.claude/skills/qa-review.md`**

```markdown
# Skill: QA Review (OrderFlow backend)

Report each finding as `[SEVERITY] file:line — description — suggested fix`. End with **PASS** or **FAIL** + must-fix list.

## Security
- [ ] Every route is authenticated unless marked `@Public()` on purpose
- [ ] Admin-only routes carry `@Roles('ADMIN')` and have a STAFF-403 test
- [ ] No `passwordHash` in any response (use `publicUserSelect`)
- [ ] Raw SQL uses tagged templates (`$queryRaw\`…\``), never string concatenation of input

## Correctness
- [ ] Money uses `Prisma.Decimal`; no `Number(...)` maths on amounts
- [ ] Stock changes write an `InventoryTransaction` in the same transaction
- [ ] State changes use a guarded `updateMany` and check `count`
- [ ] Status codes: 400 validation, 401 auth, 403 role, 404 missing, 409 business rule
- [ ] `ParseUUIDPipe` on every `:id`

## Data Integrity
- [ ] Migrations additive; CHECK constraints added for new invariants
- [ ] Soft-deleted customers excluded from reads

## Tests
- [ ] E2E covers the rule, not just the happy path; concurrency-sensitive paths have a `Promise.all` race test
```

- [ ] **Step 7: Write `.claude/skills/new-migration.md`**

````markdown
# Skill: Author a Prisma Migration Safely (OrderFlow)

## Rules
- Never edit an applied migration. Create a new one.
- Generate with `npx prisma migrate dev --name <snake_case> --create-only`, review the SQL, and hand-add CHECK constraints / sequences, then `npx prisma migrate dev` and `npx prisma generate`.
- Map every model and field to snake_case (`@map` / `@@map`). Raw SQL depends on it.
- New columns on existing tables need a DEFAULT or must be nullable.
- Add a `-- Why:` comment above hand-written SQL.

## Checklist
- [ ] FKs and indexes for new query paths
- [ ] CHECK constraints for new invariants (and a test in `test/schema.e2e-spec.ts`)
- [ ] `npm run test:e2e` passes (global setup runs `migrate reset` on the test DB)
````

- [ ] **Step 8: Write `.claude/MEMORY.md`**

```markdown
# OrderFlow — Claude Memory

## Project Stack
- NestJS 12 (ESM) + Prisma 7.10 + PostgreSQL 16, Vitest, Docker Compose. Frontend (Next.js) not started.

## Key File Paths
| Purpose | Path |
|---|---|
| Spec | docs/superpowers/specs/2026-09-29-orderflow-backend-foundation-design.md |
| Plan | docs/superpowers/plans/2026-09-29-orderflow-backend-foundation.md |
| Schema | backend/prisma/schema.prisma |

## Patterns
- Guarded `updateMany` + count check for state changes; CHECK constraints as backstop.
- Prisma CHECK violations surface as P2039 (ORM) / P2010 (raw); read `meta.driverAdapterError.cause.originalCode`.

## User Preferences
- Ask clarifying questions before building when requirements are ambiguous
- Build fully — no stubs or placeholder implementations
- Accepts recommended options readily; keep decision rounds short
```

- [ ] **Step 9: Normalize line endings and commit**

```bash
git add --renormalize .
git add .gitattributes .gitignore CLAUDE.md .claude
git commit -m "chore: project setup files (CLAUDE.md, skills, memory, git config)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 1: Backend scaffold, Docker Compose, Prisma wiring, health endpoint, e2e harness

**Files:**
- Create: `backend/` (via Nest CLI), `backend/prisma.config.ts`, `backend/prisma/schema.prisma`, `backend/src/config/env.validation.ts`, `backend/src/prisma/prisma.module.ts`, `backend/src/prisma/prisma.service.ts`, `backend/src/app.setup.ts`, `backend/src/health/health.controller.ts`, `backend/Dockerfile.dev`, `backend/.dockerignore`, `backend/.env.example`, `backend/.env.test`, `backend/test/global-setup.ts`, `backend/test/utils/app.ts`, `backend/test/utils/db.ts`, `backend/test/health.e2e-spec.ts`, `docker-compose.yml`, `docker/postgres-init.sql`
- Modify: `backend/src/main.ts`, `backend/src/app.module.ts`, `backend/package.json`, `backend/vitest.config.e2e.ts`, `backend/oxlint.json`
- Delete: `backend/src/app.controller.ts`, `backend/src/app.controller.spec.ts`, `backend/src/app.service.ts`, `backend/test/app.e2e-spec.ts`

**Interfaces:**
- Produces: `PrismaService` (extends `PrismaClient`, global). `configureApp(app: INestApplication): void`. Test utils: `createTestApp(): Promise<TestApp>`, `api(app)` (supertest agent), `prismaOf(app): PrismaService`, `resetDb(prisma): Promise<void>`. `type TestApp = INestApplication<App>`.

- [ ] **Step 1: Scaffold the Nest app**

Run from the repo root:

```bash
npx -y @nestjs/cli@12 new backend --package-manager npm --skip-git --strict
cd backend
rm src/app.controller.ts src/app.controller.spec.ts src/app.service.ts test/app.e2e-spec.ts
```

- [ ] **Step 2: Install dependencies and scripts**

```bash
npm i @nestjs/config @nestjs/jwt @nestjs/swagger @prisma/client@^7.10.0 @prisma/adapter-pg@^7.10.0 pg class-validator class-transformer bcryptjs dotenv
npm i -D prisma@^7.10.0 @types/pg
npm pkg set scripts.postinstall="prisma generate" \
  scripts.db:migrate="prisma migrate dev" \
  scripts.db:deploy="prisma migrate deploy" \
  scripts.seed="nest start --entryFile seed" \
  scripts.typecheck="tsc --noEmit" \
  engines.node=">=22"
```

- [ ] **Step 3: Prisma config and base schema**

`backend/prisma.config.ts`:

```ts
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: env('DATABASE_URL') },
});
```

`backend/prisma/schema.prisma`:

```prisma
generator client {
  provider            = "prisma-client"
  output              = "../src/generated/prisma"
  moduleFormat        = "esm"
  importFileExtension = "js"
}

datasource db {
  provider = "postgresql"
}
```

- [ ] **Step 4: Env files**

`backend/.env.example` (copy to `backend/.env` for host runs):

```text
DATABASE_URL=postgresql://orderflow:orderflow@localhost:5432/orderflow
JWT_SECRET=dev-only-secret-change-me
JWT_EXPIRES_IN=8h
PORT=4000
CORS_ORIGIN=http://localhost:3000
```

`backend/.env.test` (committed; test-only credentials):

```text
DATABASE_URL=postgresql://orderflow:orderflow@localhost:5432/orderflow_test
JWT_SECRET=test-secret
JWT_EXPIRES_IN=8h
```

```bash
cp .env.example .env
```

- [ ] **Step 5: Docker Compose**

`docker/postgres-init.sql`:

```sql
-- Why: API tests run against a separate database so they can wipe it freely.
CREATE DATABASE orderflow_test;
```

`docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: orderflow
      POSTGRES_PASSWORD: orderflow
      POSTGRES_DB: orderflow
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./docker/postgres-init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U orderflow -d orderflow"]
      interval: 5s
      timeout: 3s
      retries: 10

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    environment:
      DATABASE_URL: postgresql://orderflow:orderflow@postgres:5432/orderflow
      JWT_SECRET: ${JWT_SECRET:-dev-only-secret-change-me}
      JWT_EXPIRES_IN: 8h
      PORT: 4000
      CORS_ORIGIN: http://localhost:3000
      TSC_WATCHFILE: DynamicPriorityPolling
    ports:
      - "4000:4000"
    volumes:
      - ./backend:/app
      - /app/node_modules
    depends_on:
      postgres:
        condition: service_healthy
    command: sh -c "npx prisma generate && npx prisma migrate deploy && npm run start:dev"

volumes:
  pgdata:
```

`backend/Dockerfile.dev`:

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npx prisma generate
EXPOSE 4000
CMD ["npm", "run", "start:dev"]
```

`backend/.dockerignore`:

```text
node_modules
dist
coverage
src/generated
.env
```

- [ ] **Step 6: Env validation, Prisma service, app setup**

`backend/src/config/env.validation.ts`:

```ts
const REQUIRED = ['DATABASE_URL', 'JWT_SECRET', 'JWT_EXPIRES_IN'] as const;

export function validateEnv(config: Record<string, unknown>) {
  const missing = REQUIRED.filter((key) => !config[key]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  return config;
}
```

`backend/src/prisma/prisma.service.ts`:

```ts
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(config: ConfigService) {
    super({ adapter: new PrismaPg({ connectionString: config.getOrThrow<string>('DATABASE_URL') }) });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

`backend/src/prisma/prisma.module.ts`:

```ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

@Global()
@Module({ providers: [PrismaService], exports: [PrismaService] })
export class PrismaModule {}
```

`backend/src/app.setup.ts`:

```ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Global app configuration shared by main.ts and the e2e tests. */
export function configureApp(app: INestApplication) {
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableCors({ origin: app.get(ConfigService).get<string>('CORS_ORIGIN') ?? 'http://localhost:3000' });
  app.enableShutdownHooks();
}
```

`backend/src/app.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation.js';
import { HealthController } from './health/health.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }), PrismaModule],
  controllers: [HealthController],
})
export class AppModule {}
```

`backend/src/main.ts`:

```ts
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';

const app = await NestFactory.create(AppModule);
configureApp(app);
await app.listen(app.get(ConfigService).get<number>('PORT') ?? 4000);
```

- [ ] **Step 7: E2E harness**

`backend/vitest.config.e2e.ts` (replace):

```ts
import { config } from 'dotenv';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

// Load test env before workers spawn so the app, Prisma CLI and global setup all see it.
config({ path: '.env.test', override: true, quiet: true });

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    globalSetup: ['test/global-setup.ts'],
    fileParallelism: false,
    hookTimeout: 60_000,
    testTimeout: 30_000,
  },
});
```

`backend/test/global-setup.ts`:

```ts
import { execSync } from 'node:child_process';

export default function setup() {
  const url = process.env.DATABASE_URL ?? '';
  if (!url.includes('orderflow_test')) {
    throw new Error(`Refusing to reset a non-test database: ${url}`);
  }
  execSync('npx prisma migrate reset --force', { stdio: 'inherit' });
}
```

`backend/test/utils/app.ts`:

```ts
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';

export type TestApp = INestApplication<App>;

export async function createTestApp(): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<TestApp>();
  configureApp(app);
  await app.init();
  return app;
}

export const api = (app: TestApp) => request(app.getHttpServer());
export const prismaOf = (app: TestApp) => app.get(PrismaService);
```

`backend/test/utils/db.ts`:

```ts
import { PrismaService } from '../../src/prisma/prisma.service.js';

/** Empties every application table and restarts the order-number sequence. */
export async function resetDb(prisma: PrismaService) {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length) {
    await prisma.$executeRawUnsafe(
      `TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`,
    );
  }
  await prisma.$executeRawUnsafe('ALTER SEQUENCE IF EXISTS order_number_seq RESTART WITH 1');
}
```

Add the generated client to `backend/oxlint.json` so lint skips it:

```json
{
  "$schema": "https://raw.githubusercontent.com/oxc-project/oxc/main/crates/oxc_linter/src/rules.rs",
  "ignorePatterns": ["src/generated/**"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-floating-promises": "warn"
  },
  "env": { "node": true }
}
```

- [ ] **Step 8: Write the failing health test**

`backend/test/health.e2e-spec.ts`:

```ts
import { api, createTestApp, TestApp } from './utils/app.js';

describe('GET /health', () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns ok when the database is reachable', async () => {
    await api(app).get('/health').expect(200).expect({ status: 'ok' });
  });
});
```

- [ ] **Step 9: Start Postgres and run the test to see it fail**

```bash
docker compose up -d postgres
npx prisma generate
npm run test:e2e
```

Expected: FAIL. `health.controller.js` cannot be resolved (the import in `app.module.ts` points at a file that doesn't exist yet).

- [ ] **Step 10: Implement the health controller**

`backend/src/health/health.controller.ts`:

```ts
import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok' };
  }
}
```

- [ ] **Step 11: Run the tests to see them pass**

```bash
npm run test:e2e
npm run lint && npm run build
```

Expected: 1 test passes. Lint and build are clean.

- [ ] **Step 12: Verify the container stack**

```bash
cd .. && docker compose up -d --build backend
sleep 20 && curl -s localhost:4000/health
```

Expected: `{"status":"ok"}`. Then `docker compose stop backend` (host tests use the host Node).

- [ ] **Step 13: Commit**

```bash
git add docker-compose.yml docker backend
git commit -m "feat(backend): NestJS 12 scaffold, Prisma 7 wiring, compose stack, health endpoint

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Database schema and constraints migration

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/<timestamp>_init/migration.sql` (generated, then hand-edited), `backend/test/schema.e2e-spec.ts`

**Interfaces:**
- Produces: Prisma models `User`, `Customer`, `Product`, `Order`, `OrderItem`, `Payment`, `InventoryTransaction`. Enums `Role`, `OrderStatus`, `PaymentStatus`, `PaymentMethod`, `InventoryTxType`, `InventoryRefType` (import from `src/generated/prisma/client.js`). Sequence `order_number_seq`. Postgres enum type names match the Prisma names (e.g. `"PaymentStatus"`).

- [ ] **Step 1: Write the failing constraint test**

`backend/test/schema.e2e-spec.ts`:

```ts
import { api, createTestApp, prismaOf, TestApp } from './utils/app.js';
import { resetDb } from './utils/db.js';

describe('database constraints', () => {
  let app: TestApp;
  const prisma = () => prismaOf(app);

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb(prisma());
  });
  afterAll(async () => {
    await app.close();
  });

  async function seedOrder() {
    const user = await prisma().user.create({
      data: { name: 'A', email: 'a@x.my', passwordHash: 'x', role: 'ADMIN' },
    });
    const customer = await prisma().customer.create({ data: { name: 'C' } });
    return prisma().order.create({
      data: {
        orderNumber: 'ORD-TEST-1',
        customerId: customer.id,
        createdById: user.id,
        subtotal: '100.00',
        discount: '0.00',
        total: '100.00',
      },
    });
  }

  it('never allows negative stock', async () => {
    const p = await prisma().product.create({
      data: { name: 'X', sku: 'X1', sellingPrice: '1.00', costPrice: '0.50', stockQuantity: 1 },
    });
    await expect(
      prisma().product.update({ where: { id: p.id }, data: { stockQuantity: -1 } }),
    ).rejects.toThrow(/products_stock_nonneg/);
  });

  it('never allows paid amount above the order total', async () => {
    const order = await seedOrder();
    await expect(
      prisma().order.update({ where: { id: order.id }, data: { paidAmount: '100.01' } }),
    ).rejects.toThrow(/orders_paid_range/);
  });

  it('never allows a discount larger than the subtotal', async () => {
    const order = await seedOrder();
    await expect(
      prisma().order.update({
        where: { id: order.id },
        data: { discount: '150.00', total: '-50.00' },
      }),
    ).rejects.toThrow(/orders_discount_range/);
  });

  it('provides the order number sequence', async () => {
    const [row] = await prisma().$queryRaw<{ n: bigint }[]>`SELECT nextval('order_number_seq') AS n`;
    expect(row.n).toBe(1n);
  });

  it('keeps health working after migrations', async () => {
    await api(app).get('/health').expect(200);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm run test:e2e -- schema`
Expected: FAIL. TypeScript/runtime errors because `prisma().product` does not exist.

- [ ] **Step 3: Write the full schema**

Append to `backend/prisma/schema.prisma`:

```prisma
enum Role {
  ADMIN
  STAFF
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PACKING
  READY
  DELIVERED
  CANCELLED
}

enum PaymentStatus {
  UNPAID
  PARTIAL
  PAID
}

enum PaymentMethod {
  CASH
  BANK_TRANSFER
  CARD
  OTHER
}

enum InventoryTxType {
  SALE
  RESTOCK
  ADJUSTMENT
  RETURN
}

enum InventoryRefType {
  ORDER
  MANUAL
}

model User {
  id           String   @id @default(uuid()) @db.Uuid
  name         String
  email        String   @unique
  passwordHash String   @map("password_hash")
  role         Role
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt    DateTime @updatedAt @map("updated_at") @db.Timestamptz(3)

  ordersCreated         Order[]
  paymentsRecorded      Payment[]
  inventoryTransactions InventoryTransaction[]

  @@map("users")
}

model Customer {
  id        String    @id @default(uuid()) @db.Uuid
  name      String
  phone     String?
  email     String?
  address   String?
  notes     String?
  deletedAt DateTime? @map("deleted_at") @db.Timestamptz(3)
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt DateTime  @updatedAt @map("updated_at") @db.Timestamptz(3)

  orders Order[]

  @@index([name])
  @@index([phone])
  @@map("customers")
}

model Product {
  id                String   @id @default(uuid()) @db.Uuid
  name              String
  sku               String   @unique
  description       String?
  sellingPrice      Decimal  @map("selling_price") @db.Decimal(12, 2)
  costPrice         Decimal  @map("cost_price") @db.Decimal(12, 2)
  stockQuantity     Int      @default(0) @map("stock_quantity")
  lowStockThreshold Int      @default(0) @map("low_stock_threshold")
  isActive          Boolean  @default(true) @map("is_active")
  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt         DateTime @updatedAt @map("updated_at") @db.Timestamptz(3)

  orderItems            OrderItem[]
  inventoryTransactions InventoryTransaction[]

  @@index([name])
  @@map("products")
}

model Order {
  id            String        @id @default(uuid()) @db.Uuid
  orderNumber   String        @unique @map("order_number")
  customerId    String        @map("customer_id") @db.Uuid
  status        OrderStatus   @default(PENDING)
  paymentStatus PaymentStatus @default(UNPAID) @map("payment_status")
  subtotal      Decimal       @db.Decimal(12, 2)
  discount      Decimal       @default(0) @db.Decimal(12, 2)
  total         Decimal       @db.Decimal(12, 2)
  paidAmount    Decimal       @default(0) @map("paid_amount") @db.Decimal(12, 2)
  notes         String?
  createdById   String        @map("created_by_id") @db.Uuid
  confirmedAt   DateTime?     @map("confirmed_at") @db.Timestamptz(3)
  cancelledAt   DateTime?     @map("cancelled_at") @db.Timestamptz(3)
  deliveredAt   DateTime?     @map("delivered_at") @db.Timestamptz(3)
  createdAt     DateTime      @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt     DateTime      @updatedAt @map("updated_at") @db.Timestamptz(3)

  customer  Customer    @relation(fields: [customerId], references: [id])
  createdBy User        @relation(fields: [createdById], references: [id])
  items     OrderItem[]
  payments  Payment[]

  @@index([status])
  @@index([paymentStatus])
  @@index([customerId])
  @@index([createdAt])
  @@map("orders")
}

model OrderItem {
  id        String  @id @default(uuid()) @db.Uuid
  orderId   String  @map("order_id") @db.Uuid
  productId String  @map("product_id") @db.Uuid
  quantity  Int
  unitPrice Decimal @map("unit_price") @db.Decimal(12, 2)
  subtotal  Decimal @db.Decimal(12, 2)

  order   Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id])

  @@unique([orderId, productId])
  @@index([productId])
  @@map("order_items")
}

model Payment {
  id           String        @id @default(uuid()) @db.Uuid
  orderId      String        @map("order_id") @db.Uuid
  amount       Decimal       @db.Decimal(12, 2)
  method       PaymentMethod
  reference    String?
  paidAt       DateTime      @default(now()) @map("paid_at") @db.Timestamptz(3)
  recordedById String        @map("recorded_by_id") @db.Uuid
  createdAt    DateTime      @default(now()) @map("created_at") @db.Timestamptz(3)

  order      Order @relation(fields: [orderId], references: [id])
  recordedBy User  @relation(fields: [recordedById], references: [id])

  @@index([orderId])
  @@index([paidAt])
  @@map("payments")
}

model InventoryTransaction {
  id            String           @id @default(uuid()) @db.Uuid
  productId     String           @map("product_id") @db.Uuid
  type          InventoryTxType
  quantity      Int
  referenceType InventoryRefType @map("reference_type")
  referenceId   String?          @map("reference_id") @db.Uuid
  note          String?
  createdById   String           @map("created_by_id") @db.Uuid
  createdAt     DateTime         @default(now()) @map("created_at") @db.Timestamptz(3)

  product   Product @relation(fields: [productId], references: [id])
  createdBy User    @relation(fields: [createdById], references: [id])

  @@index([productId, createdAt])
  @@index([referenceType, referenceId])
  @@map("inventory_transactions")
}
```

- [ ] **Step 4: Generate the migration, add constraints, apply**

```bash
npx prisma migrate dev --name init --create-only
```

Append to the generated `prisma/migrations/<timestamp>_init/migration.sql`:

```sql
-- Why: business invariants enforced by the database as a backstop for service-level guards (spec §5, §7).
ALTER TABLE "products" ADD CONSTRAINT "products_prices_nonneg" CHECK ("selling_price" >= 0 AND "cost_price" >= 0);
ALTER TABLE "products" ADD CONSTRAINT "products_stock_nonneg" CHECK ("stock_quantity" >= 0);
ALTER TABLE "products" ADD CONSTRAINT "products_threshold_nonneg" CHECK ("low_stock_threshold" >= 0);
ALTER TABLE "orders" ADD CONSTRAINT "orders_discount_range" CHECK ("discount" >= 0 AND "discount" <= "subtotal");
ALTER TABLE "orders" ADD CONSTRAINT "orders_total_consistent" CHECK ("total" = "subtotal" - "discount");
ALTER TABLE "orders" ADD CONSTRAINT "orders_paid_range" CHECK ("paid_amount" >= 0 AND "paid_amount" <= "total");
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_quantity_pos" CHECK ("quantity" > 0);
ALTER TABLE "payments" ADD CONSTRAINT "payments_amount_pos" CHECK ("amount" > 0);
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_tx_quantity_nonzero" CHECK ("quantity" <> 0);

-- Why: gap-tolerant, concurrency-safe source for ORD-YYYYMMDD-NNNN order numbers (spec D10).
CREATE SEQUENCE "order_number_seq";
```

```bash
npx prisma migrate dev
npx prisma generate
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `npm run test:e2e`
Expected: health + 5 schema tests pass.

- [ ] **Step 6: Commit**

```bash
git add prisma test/schema.e2e-spec.ts
git commit -m "feat(db): core schema with CHECK constraints and order number sequence

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Shared helpers: money, time, pagination, errors

**Files:**
- Create: `backend/src/common/money.ts`, `backend/src/common/time.ts`, `backend/src/common/pagination.ts`, `backend/src/common/transforms.ts`, `backend/src/common/exceptions.ts`, `backend/src/common/prisma-exception.filter.ts`, `backend/src/common/common.spec.ts`, `backend/src/common/prisma-exception.filter.spec.ts`
- Modify: `backend/src/app.setup.ts`

**Interfaces:**
- Produces:
  - `money(value: string | number | Prisma.Decimal): Prisma.Decimal` (rounded to 2dp). `ZERO: Prisma.Decimal`. Importing `money.ts` patches `Decimal#toJSON` to `toFixed(2)`.
  - `businessDate(d: Date): string` (`'YYYY-MM-DD'` in MYT). `startOfBusinessDay(d: Date): Date`.
  - `class PaginationQueryDto { page = 1; limit = 20 }`. `skipTake(q) → { skip, take }`. `paginate<T>(data: T[], total: number, q): Paginated<T>` where `Paginated<T> = { data: T[]; meta: { page; limit; total; totalPages } }`.
  - `ToBoolean(): PropertyDecorator` (query `'true'|'false'` → boolean).
  - `InsufficientStockException(sku: string, requested: number, available: number)`, `InvalidStatusTransitionException(from: string, to: string)`, `OverpaymentException(outstanding: Prisma.Decimal)`. All are 409.
  - `PrismaExceptionFilter` (registered in `configureApp`).

- [ ] **Step 1: Write the failing unit tests**

`backend/src/common/common.spec.ts`:

```ts
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { money } from './money.js';
import { paginate, PaginationQueryDto, skipTake } from './pagination.js';
import { businessDate, startOfBusinessDay } from './time.js';

describe('money', () => {
  it('serializes to two decimals in JSON', () => {
    expect(JSON.stringify({ total: money('10.1') })).toBe('{"total":"10.10"}');
  });

  it('does exact decimal arithmetic', () => {
    expect(money(0.1).add(money(0.2)).equals(money('0.30'))).toBe(true);
  });
});

describe('business time (Asia/Kuala_Lumpur)', () => {
  const lateUtc = new Date('2026-09-29T16:30:00Z'); // 00:30 on 30 Sep in MYT

  it('uses the Malaysian calendar day', () => {
    expect(businessDate(lateUtc)).toBe('2026-09-30');
  });

  it('finds MYT midnight as a UTC instant', () => {
    expect(startOfBusinessDay(lateUtc).toISOString()).toBe('2026-09-29T16:00:00.000Z');
  });
});

describe('pagination', () => {
  const parse = (raw: object) => plainToInstance(PaginationQueryDto, raw);

  it('defaults to page 1, limit 20', () => {
    expect(skipTake(parse({}))).toEqual({ skip: 0, take: 20 });
  });

  it('coerces query strings', () => {
    expect(skipTake(parse({ page: '3', limit: '10' }))).toEqual({ skip: 20, take: 10 });
  });

  it.each([{ limit: '0' }, { limit: '101' }, { page: '0' }, { page: 'abc' }])(
    'rejects %o',
    (raw) => {
      expect(validateSync(parse(raw))).not.toHaveLength(0);
    },
  );

  it('builds meta', () => {
    expect(paginate(['a'], 41, parse({ limit: '20' })).meta).toEqual({
      page: 1,
      limit: 20,
      total: 41,
      totalPages: 3,
    });
  });
});
```

`backend/src/common/prisma-exception.filter.spec.ts`:

```ts
import { ArgumentsHost } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaExceptionFilter } from './prisma-exception.filter.js';

function run(code: string, cause?: object) {
  const err = new Prisma.PrismaClientKnownRequestError('db error', {
    code,
    clientVersion: '7.10.0',
    meta: cause ? { driverAdapterError: { cause } } : undefined,
  });
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const host = { switchToHttp: () => ({ getResponse: () => ({ status }) }) } as unknown as ArgumentsHost;
  new PrismaExceptionFilter().catch(err, host);
  return json.mock.calls[0][0];
}

describe('PrismaExceptionFilter', () => {
  it('maps a duplicate SKU to 409 with a readable message', () => {
    expect(run('P2002', { originalCode: '23505', constraint: { index: 'products_sku_key' } })).toEqual({
      statusCode: 409,
      message: 'SKU already exists',
      error: 'Conflict',
    });
  });

  it('maps a missing record to 404', () => {
    expect(run('P2025').statusCode).toBe(404);
  });

  it('maps a CHECK violation from ORM or raw queries to 409', () => {
    expect(run('P2039', { originalCode: '23514' }).statusCode).toBe(409);
    expect(run('P2010', { originalCode: '23514' }).statusCode).toBe(409);
  });

  it('maps a foreign key violation to 400', () => {
    expect(run('P2003').statusCode).toBe(400);
  });

  it('hides unknown errors behind a 500', () => {
    expect(run('P9999')).toEqual({ statusCode: 500, message: 'Internal server error', error: 'Internal Server Error' });
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm test`
Expected: FAIL. Cannot resolve `./money.js`, `./pagination.js`, `./time.js`, `./prisma-exception.filter.js`.

- [ ] **Step 3: Implement the helpers**

`backend/src/common/money.ts`:

```ts
import { Prisma } from '../generated/prisma/client.js';

// ponytail: global prototype patch so every Decimal in any response serializes as "12.30";
// replace with a response interceptor if a library ever needs Decimal's default JSON.
(Prisma.Decimal.prototype as { toJSON?: () => string }).toJSON = function (this: Prisma.Decimal) {
  return this.toFixed(2);
};

export const money = (value: string | number | Prisma.Decimal) => new Prisma.Decimal(value).toDecimalPlaces(2);

export const ZERO = money(0);
```

`backend/src/common/time.ts`:

```ts
export const BUSINESS_TZ = 'Asia/Kuala_Lumpur';

const ymd = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Calendar date in the business timezone, e.g. "2026-09-29". */
export const businessDate = (d: Date) => ymd.format(d);

/** Midnight of the business day containing `d`. Malaysia has no DST, so +08:00 is exact. */
export const startOfBusinessDay = (d: Date) => new Date(`${businessDate(d)}T00:00:00+08:00`);
```

`backend/src/common/pagination.ts`:

```ts
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export const skipTake = (q: PaginationQueryDto) => ({ skip: (q.page - 1) * q.limit, take: q.limit });

export function paginate<T>(data: T[], total: number, q: PaginationQueryDto): Paginated<T> {
  return { data, meta: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) } };
}
```

`backend/src/common/transforms.ts`:

```ts
import { Transform } from 'class-transformer';

/** Query strings arrive as 'true' / 'false'; anything else is left for @IsBoolean to reject. */
export const ToBoolean = () =>
  Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value));
```

`backend/src/common/exceptions.ts`:

```ts
import { ConflictException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';

export class InsufficientStockException extends ConflictException {
  constructor(sku: string, requested: number, available: number) {
    super({
      statusCode: 409,
      error: 'Conflict',
      message: `Insufficient stock for ${sku}: requested ${requested}, available ${available}`,
      sku,
      requested,
      available,
    });
  }
}

export class InvalidStatusTransitionException extends ConflictException {
  constructor(from: string, to: string) {
    super(`Cannot change status from ${from} to ${to}`);
  }
}

export class OverpaymentException extends ConflictException {
  constructor(outstanding: Prisma.Decimal) {
    super(`Payment exceeds outstanding amount (RM ${outstanding.toFixed(2)})`);
  }
}
```

`backend/src/common/prisma-exception.filter.ts`:

```ts
import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../generated/prisma/client.js';

const UNIQUE_MESSAGES: Record<string, string> = {
  products_sku_key: 'SKU already exists',
  users_email_key: 'Email already registered',
  orders_order_number_key: 'Order number already exists',
};

const ERROR_NAMES: Record<number, string> = {
  400: 'Bad Request',
  404: 'Not Found',
  409: 'Conflict',
  500: 'Internal Server Error',
};

type DriverMeta = { driverAdapterError?: { cause?: { originalCode?: string; constraint?: { index?: string } } } };

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(err: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const { status, message } = this.map(err);
    if (status === 500) this.logger.error(err.message, err.stack);
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json({ statusCode: status, message, error: ERROR_NAMES[status] });
  }

  private map(err: Prisma.PrismaClientKnownRequestError): { status: number; message: string } {
    // With driver adapters the Postgres SQLSTATE is the reliable signal: CHECK violations
    // arrive as P2039 from ORM calls but P2010 from raw queries.
    const cause = (err.meta as DriverMeta | undefined)?.driverAdapterError?.cause;
    const pg = cause?.originalCode;
    if (err.code === 'P2002' || pg === '23505') {
      const index = cause?.constraint?.index;
      return { status: 409, message: (index && UNIQUE_MESSAGES[index]) || 'Duplicate value' };
    }
    if (err.code === 'P2025') return { status: 404, message: 'Record not found' };
    if (err.code === 'P2003' || pg === '23503') return { status: 400, message: 'Referenced record does not exist' };
    if (pg === '23514') return { status: 409, message: 'Operation violates a data integrity rule' };
    return { status: 500, message: 'Internal server error' };
  }
}
```

Replace `backend/src/app.setup.ts`:

```ts
import './common/money.js'; // installs Decimal JSON serialization
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaExceptionFilter } from './common/prisma-exception.filter.js';

/** Global app configuration shared by main.ts and the e2e tests. */
export function configureApp(app: INestApplication) {
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.enableCors({ origin: app.get(ConfigService).get<string>('CORS_ORIGIN') ?? 'http://localhost:3000' });
  app.enableShutdownHooks();
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npm test && npm run lint && npm run build`
Expected: all unit tests pass. Lint and build are clean.

- [ ] **Step 5: Commit**

```bash
git add src/common src/app.setup.ts
git commit -m "feat(common): money, business time, pagination, domain exceptions, Prisma error filter

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Auth and users

**Files:**
- Create: `backend/src/auth/{auth.module.ts,auth.controller.ts,auth.service.ts,password.ts,jwt-auth.guard.ts,roles.guard.ts,decorators.ts}`, `backend/src/auth/dto/{register.dto.ts,login.dto.ts}`, `backend/src/users/{users.module.ts,users.controller.ts,users.service.ts,user.select.ts}`, `backend/src/users/dto/{create-user.dto.ts,update-user.dto.ts}`, `backend/test/utils/auth.ts`, `backend/test/auth.e2e-spec.ts`, `backend/test/users.e2e-spec.ts`
- Modify: `backend/src/app.module.ts`, `backend/src/health/health.controller.ts`

**Interfaces:**
- Consumes: `PrismaService`, `paginate`, `skipTake`, `PaginationQueryDto`.
- Produces:
  - Decorators: `Public()`, `Roles(...roles: Role[])`, `CurrentUser()` (param → `PublicUser`).
  - `publicUserSelect` (Prisma select without `passwordHash`), `type PublicUser`.
  - `AuthService.register(dto: RegisterDto): Promise<{ accessToken: string; user: PublicUser }>`.
  - `UsersService.create(dto: CreateUserDto): Promise<PublicUser>`.
  - Test utils: `bearer(token) → { Authorization }`, `setupUsers(app) → { admin, staff, adminId, staffId }` (tokens and ids).

- [ ] **Step 1: Write the failing e2e tests**

`backend/test/utils/auth.ts`:

```ts
import { api, TestApp } from './app.js';

export const PASSWORD = 'Password123!';
export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Registers the first ADMIN, creates one STAFF, and returns both tokens. */
export async function setupUsers(app: TestApp) {
  const admin = await api(app)
    .post('/auth/register')
    .send({ name: 'Admin', email: 'admin@test.my', password: PASSWORD })
    .expect(201);
  const staff = await api(app)
    .post('/users')
    .set(bearer(admin.body.accessToken))
    .send({ name: 'Staff', email: 'staff@test.my', password: PASSWORD, role: 'STAFF' })
    .expect(201);
  const staffLogin = await api(app)
    .post('/auth/login')
    .send({ email: 'staff@test.my', password: PASSWORD })
    .expect(200);
  return {
    admin: admin.body.accessToken as string,
    adminId: admin.body.user.id as string,
    staff: staffLogin.body.accessToken as string,
    staffId: staff.body.id as string,
  };
}
```

`backend/test/auth.e2e-spec.ts`:

```ts
import { api, createTestApp, prismaOf, TestApp } from './utils/app.js';
import { bearer, PASSWORD } from './utils/auth.js';
import { resetDb } from './utils/db.js';

describe('auth', () => {
  let app: TestApp;
  const owner = { name: 'Aisyah', email: 'Aisyah@Shop.my', password: PASSWORD };

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb(prismaOf(app));
  });
  afterAll(async () => {
    await app.close();
  });

  it('makes the first registered user an ADMIN and never returns the hash', async () => {
    const res = await api(app).post('/auth/register').send(owner).expect(201);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ email: 'aisyah@shop.my', role: 'ADMIN', isActive: true });
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('closes registration once any user exists', async () => {
    await api(app).post('/auth/register').send(owner).expect(201);
    await api(app)
      .post('/auth/register')
      .send({ ...owner, email: 'other@shop.my' })
      .expect(403);
  });

  it('logs in regardless of email case and returns the current user', async () => {
    await api(app).post('/auth/register').send(owner).expect(201);
    const login = await api(app)
      .post('/auth/login')
      .send({ email: 'AISYAH@shop.my', password: PASSWORD })
      .expect(200);
    const me = await api(app).get('/auth/me').set(bearer(login.body.accessToken)).expect(200);
    expect(me.body).toMatchObject({ email: 'aisyah@shop.my', role: 'ADMIN' });
  });

  it('rejects a wrong password', async () => {
    await api(app).post('/auth/register').send(owner).expect(201);
    const res = await api(app)
      .post('/auth/login')
      .send({ email: owner.email, password: 'wrong-password' })
      .expect(401);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('rejects missing and forged tokens', async () => {
    await api(app).get('/auth/me').expect(401);
    await api(app).get('/auth/me').set(bearer('not.a.jwt')).expect(401);
  });

  it('validates the register body', async () => {
    await api(app).post('/auth/register').send({ name: 'X', email: 'nope', password: 'short' }).expect(400);
    await api(app)
      .post('/auth/register')
      .send({ ...owner, role: 'ADMIN' })
      .expect(400); // unknown property rejected
  });

  it('leaves /health public', async () => {
    await api(app).get('/health').expect(200);
  });
});
```

`backend/test/users.e2e-spec.ts`:

```ts
import { api, createTestApp, prismaOf, TestApp } from './utils/app.js';
import { bearer, PASSWORD, setupUsers } from './utils/auth.js';
import { resetDb } from './utils/db.js';

describe('users', () => {
  let app: TestApp;
  let t: Awaited<ReturnType<typeof setupUsers>>;

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb(prismaOf(app));
    t = await setupUsers(app);
  });
  afterAll(async () => {
    await app.close();
  });

  it('lets an ADMIN list users without password hashes', async () => {
    const res = await api(app).get('/users').set(bearer(t.admin)).expect(200);
    expect(res.body.meta.total).toBe(2);
    expect(res.body.data.every((u: Record<string, unknown>) => !('passwordHash' in u))).toBe(true);
  });

  it('forbids STAFF from user management', async () => {
    await api(app).get('/users').set(bearer(t.staff)).expect(403);
    await api(app)
      .post('/users')
      .set(bearer(t.staff))
      .send({ name: 'X', email: 'x@test.my', password: PASSWORD, role: 'STAFF' })
      .expect(403);
  });

  it('rejects a duplicate email regardless of case', async () => {
    const res = await api(app)
      .post('/users')
      .set(bearer(t.admin))
      .send({ name: 'Dup', email: 'STAFF@test.my', password: PASSWORD, role: 'STAFF' })
      .expect(409);
    expect(res.body.message).toBe('Email already registered');
  });

  it('locks out a deactivated user immediately', async () => {
    await api(app).patch(`/users/${t.staffId}`).set(bearer(t.admin)).send({ isActive: false }).expect(200);
    await api(app).get('/auth/me').set(bearer(t.staff)).expect(401);
    await api(app).post('/auth/login').send({ email: 'staff@test.my', password: PASSWORD }).expect(401);
  });

  it('stops an admin from demoting or deactivating themselves', async () => {
    await api(app).patch(`/users/${t.adminId}`).set(bearer(t.admin)).send({ role: 'STAFF' }).expect(400);
    await api(app).patch(`/users/${t.adminId}`).set(bearer(t.admin)).send({ isActive: false }).expect(400);
  });

  it('lets an admin reset a password', async () => {
    await api(app)
      .patch(`/users/${t.staffId}`)
      .set(bearer(t.admin))
      .send({ password: 'NewPassword456!' })
      .expect(200);
    await api(app).post('/auth/login').send({ email: 'staff@test.my', password: 'NewPassword456!' }).expect(200);
  });

  it('returns 400 for a malformed id and 404 for an unknown one', async () => {
    await api(app).get('/users/not-a-uuid').set(bearer(t.admin)).expect(400);
    await api(app).get('/users/00000000-0000-4000-8000-000000000000').set(bearer(t.admin)).expect(404);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm run test:e2e -- auth users`
Expected: FAIL. `/auth/register` returns 404.

- [ ] **Step 3: Implement users**

`backend/src/users/user.select.ts`:

```ts
import type { Prisma } from '../generated/prisma/client.js';

export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;
```

`backend/src/auth/password.ts`:

```ts
import { compare, hash } from 'bcryptjs';

export const hashPassword = (plain: string) => hash(plain, 10);
export const verifyPassword = (plain: string, hashed: string) => compare(plain, hashed);
```

`backend/src/auth/dto/register.dto.ts`:

```ts
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsEmail()
  @MaxLength(200)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt ignores bytes beyond 72
  password: string;
}
```

`backend/src/auth/dto/login.dto.ts`:

```ts
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
```

`backend/src/users/dto/create-user.dto.ts`:

```ts
import { IsEnum } from 'class-validator';
import { RegisterDto } from '../../auth/dto/register.dto.js';
import { Role } from '../../generated/prisma/client.js';

export class CreateUserDto extends RegisterDto {
  @IsEnum(Role)
  role: Role;
}
```

`backend/src/users/dto/update-user.dto.ts`:

```ts
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Role } from '../../generated/prisma/client.js';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password?: string;
}
```

`backend/src/users/users.service.ts`:

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { hashPassword } from '../auth/password.js';
import { paginate, PaginationQueryDto, skipTake } from '../common/pagination.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { publicUserSelect } from './user.select.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(q: PaginationQueryDto) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ select: publicUserSelect, orderBy: { name: 'asc' }, ...skipTake(q) }),
      this.prisma.user.count(),
    ]);
    return paginate(data, total, q);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: publicUserSelect });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(dto: CreateUserDto) {
    return this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase(),
        passwordHash: await hashPassword(dto.password),
        role: dto.role,
      },
      select: publicUserSelect,
    });
  }

  async update(id: string, dto: UpdateUserDto, actingUserId: string) {
    if (id === actingUserId && (dto.isActive === false || (dto.role && dto.role !== 'ADMIN'))) {
      throw new BadRequestException('You cannot deactivate or demote yourself');
    }
    await this.findOne(id);
    const { password, ...rest } = dto;
    return this.prisma.user.update({
      where: { id },
      data: { ...rest, ...(password && { passwordHash: await hashPassword(password) }) },
      select: publicUserSelect,
    });
  }
}
```

`backend/src/users/users.controller.ts`:

```ts
import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { PaginationQueryDto } from '../common/pagination.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import type { PublicUser } from './user.select.js';
import { UsersService } from './users.service.js';

@Controller('users')
@Roles('ADMIN')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  findAll(@Query() q: PaginationQueryDto) {
    return this.users.findAll(q);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto, @CurrentUser() user: PublicUser) {
    return this.users.update(id, dto, user.id);
  }
}
```

`backend/src/users/users.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({ controllers: [UsersController], providers: [UsersService], exports: [UsersService] })
export class UsersModule {}
```

- [ ] **Step 4: Implement auth**

`backend/src/auth/decorators.ts`:

```ts
import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Role } from '../generated/prisma/client.js';
import type { PublicUser } from '../users/user.select.js';

export const IS_PUBLIC = 'isPublic';
export const ROLES = 'roles';

export const Public = () => SetMetadata(IS_PUBLIC, true);
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): PublicUser => ctx.switchToHttp().getRequest().user,
);
```

`backend/src/auth/jwt-auth.guard.ts`:

```ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';
import { publicUserSelect, type PublicUser } from '../users/user.select.js';
import { IS_PUBLIC } from './decorators.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext) {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()])) return true;

    const req = ctx.switchToHttp().getRequest<Request & { user?: PublicUser }>();
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) throw new UnauthorizedException();

    let sub: string;
    try {
      ({ sub } = await this.jwt.verifyAsync<{ sub: string }>(token));
    } catch {
      throw new UnauthorizedException();
    }

    // Loading the user per request makes deactivation take effect immediately.
    const user = await this.prisma.user.findUnique({ where: { id: sub }, select: publicUserSelect });
    if (!user?.isActive) throw new UnauthorizedException();
    req.user = user;
    return true;
  }
}
```

`backend/src/auth/roles.guard.ts`:

```ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '../generated/prisma/client.js';
import type { PublicUser } from '../users/user.select.js';
import { ROLES } from './decorators.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES, [ctx.getHandler(), ctx.getClass()]);
    if (!roles) return true;
    const user = ctx.switchToHttp().getRequest<{ user?: PublicUser }>().user;
    return !!user && roles.includes(user.role);
  }
}
```

`backend/src/auth/auth.service.ts`:

```ts
import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { publicUserSelect, type PublicUser } from '../users/user.select.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { hashPassword, verifyPassword } from './password.js';

const REGISTER_LOCK = 7_001; // arbitrary advisory-lock key serializing first-user registration

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /** Only works while there are no users: the first user becomes ADMIN. */
  async register(dto: RegisterDto) {
    const user = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${REGISTER_LOCK})`;
      if ((await tx.user.count()) > 0) {
        throw new ForbiddenException('Registration is closed. Ask an admin to create your account.');
      }
      return tx.user.create({
        data: {
          name: dto.name,
          email: dto.email.toLowerCase(),
          passwordHash: await hashPassword(dto.password),
          role: 'ADMIN',
        },
        select: publicUserSelect,
      });
    });
    return this.issue(user);
  }

  async login(dto: LoginDto) {
    const found = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!found || !found.isActive || !(await verifyPassword(dto.password, found.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const { passwordHash: _, ...user } = found;
    return this.issue(user);
  }

  private async issue(user: PublicUser) {
    return { accessToken: await this.jwt.signAsync({ sub: user.id, role: user.role }), user };
  }
}
```

`backend/src/auth/auth.controller.ts`:

```ts
import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import type { PublicUser } from '../users/user.select.js';
import { AuthService } from './auth.service.js';
import { CurrentUser, Public } from './decorators.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('me')
  me(@CurrentUser() user: PublicUser) {
    return user;
  }
}
```

`backend/src/auth/auth.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { RolesGuard } from './roles.guard.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow('JWT_SECRET'),
        signOptions: { expiresIn: config.getOrThrow('JWT_EXPIRES_IN') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    // Order matters: authenticate first, then check roles.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
```

In `backend/src/health/health.controller.ts`, add `import { Public } from '../auth/decorators.js';` and put `@Public()` above `@Controller('health')`.

In `backend/src/app.module.ts`, add `AuthModule` and `UsersModule` to `imports` (with `.js` imports).

- [ ] **Step 5: Run the tests to see them pass**

Run: `npm run test:e2e && npm test && npm run lint && npm run build`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src test
git commit -m "feat(auth): first-user ADMIN registration, JWT login, role guards, user management

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Customers

**Files:**
- Create: `backend/src/customers/{customers.module.ts,customers.controller.ts,customers.service.ts}`, `backend/src/customers/dto/customer.dto.ts`, `backend/test/utils/fixtures.ts`, `backend/test/customers.e2e-spec.ts`
- Modify: `backend/src/app.module.ts`

**Interfaces:**
- Consumes: `PrismaService`, pagination helpers, `Roles`.
- Produces: `CustomersService.create(dto: CreateCustomerDto)`, `CustomersService.ensureExists(id: string, tx?: Prisma.TransactionClient): Promise<void>` (404 if missing or soft-deleted). Test util `createCustomer(app, token, body?)`.

- [ ] **Step 1: Write the failing e2e test**

`backend/test/utils/fixtures.ts`:

```ts
import { api, TestApp } from './app.js';
import { bearer } from './auth.js';

export async function createCustomer(app: TestApp, token: string, body: Record<string, unknown> = {}) {
  const res = await api(app)
    .post('/customers')
    .set(bearer(token))
    .send({ name: 'Kedai Runcit Ali', phone: '+60123456789', ...body })
    .expect(201);
  return res.body;
}
```

`backend/test/customers.e2e-spec.ts`:

```ts
import { api, createTestApp, prismaOf, TestApp } from './utils/app.js';
import { bearer, setupUsers } from './utils/auth.js';
import { resetDb } from './utils/db.js';
import { createCustomer } from './utils/fixtures.js';

describe('customers', () => {
  let app: TestApp;
  let t: Awaited<ReturnType<typeof setupUsers>>;

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb(prismaOf(app));
    t = await setupUsers(app);
  });
  afterAll(async () => {
    await app.close();
  });

  it('lets STAFF create, read and update customers', async () => {
    const c = await createCustomer(app, t.staff, { email: 'ali@kedai.my', address: 'Jalan 1, Ipoh' });
    const got = await api(app).get(`/customers/${c.id}`).set(bearer(t.staff)).expect(200);
    expect(got.body).toMatchObject({ name: 'Kedai Runcit Ali', orders: [] });
    const upd = await api(app)
      .patch(`/customers/${c.id}`)
      .set(bearer(t.staff))
      .send({ notes: 'Pays on Fridays' })
      .expect(200);
    expect(upd.body.notes).toBe('Pays on Fridays');
  });

  it('searches by name, phone or email', async () => {
    await createCustomer(app, t.staff, { name: 'Ali', phone: '0123456789' });
    await createCustomer(app, t.staff, { name: 'Mei Ling', phone: '0198887777', email: 'mei@ling.my' });
    const byPhone = await api(app).get('/customers?search=0198').set(bearer(t.staff)).expect(200);
    expect(byPhone.body.data.map((c: { name: string }) => c.name)).toEqual(['Mei Ling']);
    const byEmail = await api(app).get('/customers?search=MEI@').set(bearer(t.staff)).expect(200);
    expect(byEmail.body.meta.total).toBe(1);
  });

  it('soft-deletes (ADMIN only) and hides deleted customers', async () => {
    const c = await createCustomer(app, t.staff);
    await api(app).delete(`/customers/${c.id}`).set(bearer(t.staff)).expect(403);
    await api(app).delete(`/customers/${c.id}`).set(bearer(t.admin)).expect(204);
    await api(app).get(`/customers/${c.id}`).set(bearer(t.staff)).expect(404);
    const list = await api(app).get('/customers').set(bearer(t.staff)).expect(200);
    expect(list.body.meta.total).toBe(0);
    expect(await prismaOf(app).customer.count()).toBe(1); // row still exists
  });

  it('validates input', async () => {
    await api(app).post('/customers').set(bearer(t.staff)).send({ phone: '123456' }).expect(400);
    await api(app).post('/customers').set(bearer(t.staff)).send({ name: 'X', email: 'bad' }).expect(400);
    await api(app).post('/customers').set(bearer(t.staff)).send({ name: 'X', phone: 'call me' }).expect(400);
  });

  it('returns an empty paginated order history', async () => {
    const c = await createCustomer(app, t.staff);
    const res = await api(app).get(`/customers/${c.id}/orders`).set(bearer(t.staff)).expect(200);
    expect(res.body).toEqual({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm run test:e2e -- customers`
Expected: FAIL. `POST /customers` returns 404.

- [ ] **Step 3: Implement**

`backend/src/customers/dto/customer.dto.ts`:

```ts
import { PartialType } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination.js';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @Matches(/^[0-9+\-\s()]{6,20}$/, { message: 'phone must be 6-20 digits, spaces, +, - or ()' })
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}

export class ListCustomersQuery extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
```

`backend/src/customers/customers.service.ts`:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { paginate, PaginationQueryDto, skipTake } from '../common/pagination.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCustomerDto, ListCustomersQuery, UpdateCustomerDto } from './dto/customer.dto.js';

const orderSummarySelect = {
  id: true,
  orderNumber: true,
  status: true,
  paymentStatus: true,
  total: true,
  paidAmount: true,
  createdAt: true,
} satisfies Prisma.OrderSelect;

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(q: ListCustomersQuery) {
    const where: Prisma.CustomerWhereInput = {
      deletedAt: null,
      ...(q.search && {
        OR: [
          { name: { contains: q.search, mode: 'insensitive' } },
          { phone: { contains: q.search } },
          { email: { contains: q.search, mode: 'insensitive' } },
        ],
      }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({ where, orderBy: { name: 'asc' }, ...skipTake(q) }),
      this.prisma.customer.count({ where }),
    ]);
    return paginate(data, total, q);
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
      include: { orders: { select: orderSummarySelect, orderBy: { createdAt: 'desc' }, take: 20 } },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async orders(id: string, q: PaginationQueryDto) {
    await this.ensureExists(id);
    const where = { customerId: id };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({ where, select: orderSummarySelect, orderBy: { createdAt: 'desc' }, ...skipTake(q) }),
      this.prisma.order.count({ where }),
    ]);
    return paginate(data, total, q);
  }

  create(dto: CreateCustomerDto) {
    return this.prisma.customer.create({ data: dto });
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.ensureExists(id);
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  /** Throws 404 unless the customer exists and is not soft-deleted. */
  async ensureExists(id: string, tx: Prisma.TransactionClient = this.prisma) {
    if (!(await tx.customer.count({ where: { id, deletedAt: null } }))) {
      throw new NotFoundException('Customer not found');
    }
  }
}
```

`backend/src/customers/customers.controller.ts`:

```ts
import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { Roles } from '../auth/decorators.js';
import { PaginationQueryDto } from '../common/pagination.js';
import { CustomersService } from './customers.service.js';
import { CreateCustomerDto, ListCustomersQuery, UpdateCustomerDto } from './dto/customer.dto.js';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  findAll(@Query() q: ListCustomersQuery) {
    return this.customers.findAll(q);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.customers.findOne(id);
  }

  @Get(':id/orders')
  orders(@Param('id', ParseUUIDPipe) id: string, @Query() q: PaginationQueryDto) {
    return this.customers.orders(id, q);
  }

  @Post()
  create(@Body() dto: CreateCustomerDto) {
    return this.customers.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCustomerDto) {
    return this.customers.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.customers.remove(id);
  }
}
```

`backend/src/customers/customers.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller.js';
import { CustomersService } from './customers.service.js';

@Module({ controllers: [CustomersController], providers: [CustomersService], exports: [CustomersService] })
export class CustomersModule {}
```

Add `CustomersModule` to `AppModule.imports`.

- [ ] **Step 4: Run the tests to see them pass**

Run: `npm run test:e2e && npm run lint && npm run build`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src test
git commit -m "feat(customers): CRUD with search, soft delete and order history

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Products and inventory (list, low stock, ledger, adjustments)

**Files:**
- Create: `backend/src/products/{products.module.ts,products.controller.ts,products.service.ts}`, `backend/src/products/dto/product.dto.ts`, `backend/src/inventory/{inventory.module.ts,inventory.controller.ts,inventory.service.ts}`, `backend/src/inventory/dto/adjust-stock.dto.ts`, `backend/test/products.e2e-spec.ts`, `backend/test/inventory.e2e-spec.ts`
- Modify: `backend/src/app.module.ts`, `backend/test/utils/fixtures.ts`

**Interfaces:**
- Consumes: `money`, `InsufficientStockException`, pagination, `ToBoolean`, `CurrentUser`, `Roles`.
- Produces:
  - `InventoryService.adjust(dto: AdjustStockDto, userId: string): Promise<{ product; transaction }>`.
  - `InventoryService` private `take(tx, productId, quantity)` (atomic guarded decrement). Task 9 builds `deductForOrder` / `restoreForOrder` on it.
  - `InventoryModule` exports `InventoryService`.
  - Test util `createProduct(app, adminToken, body?)` (defaults: price 12.50, cost 9, stock 10, threshold 2, unique SKU).

- [ ] **Step 1: Write the failing e2e tests**

Append to `backend/test/utils/fixtures.ts`:

```ts
let skuCounter = 0;

export async function createProduct(app: TestApp, adminToken: string, body: Record<string, unknown> = {}) {
  const res = await api(app)
    .post('/products')
    .set(bearer(adminToken))
    .send({
      name: 'Coca-Cola 24 x 320ml',
      sku: `SKU-${++skuCounter}`,
      sellingPrice: 12.5,
      costPrice: 9,
      stockQuantity: 10,
      lowStockThreshold: 2,
      ...body,
    })
    .expect(201);
  return res.body;
}
```

`backend/test/products.e2e-spec.ts`:

```ts
import { api, createTestApp, prismaOf, TestApp } from './utils/app.js';
import { bearer, setupUsers } from './utils/auth.js';
import { resetDb } from './utils/db.js';
import { createProduct } from './utils/fixtures.js';

describe('products', () => {
  let app: TestApp;
  let t: Awaited<ReturnType<typeof setupUsers>>;

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb(prismaOf(app));
    t = await setupUsers(app);
  });
  afterAll(async () => {
    await app.close();
  });

  it('creates a product with money as 2-decimal strings and an opening-stock ledger row', async () => {
    const p = await createProduct(app, t.admin, { sellingPrice: 12.5, costPrice: 9 });
    expect(p).toMatchObject({ sellingPrice: '12.50', costPrice: '9.00', stockQuantity: 10, isActive: true });
    const ledger = await api(app).get(`/inventory/${p.id}`).set(bearer(t.staff)).expect(200);
    expect(ledger.body.transactions.data).toMatchObject([{ type: 'RESTOCK', quantity: 10, note: 'Opening stock' }]);
  });

  it('allows only ADMIN to create, update and deactivate', async () => {
    const p = await createProduct(app, t.admin);
    await api(app)
      .post('/products')
      .set(bearer(t.staff))
      .send({ name: 'X', sku: 'X', sellingPrice: 1, costPrice: 1 })
      .expect(403);
    await api(app).patch(`/products/${p.id}`).set(bearer(t.staff)).send({ name: 'Y' }).expect(403);
    await api(app).get(`/products/${p.id}`).set(bearer(t.staff)).expect(200);
  });

  it('rejects duplicate SKUs', async () => {
    await createProduct(app, t.admin, { sku: 'COKE-24' });
    const res = await api(app)
      .post('/products')
      .set(bearer(t.admin))
      .send({ name: 'Dup', sku: 'COKE-24', sellingPrice: 1, costPrice: 1 })
      .expect(409);
    expect(res.body.message).toBe('SKU already exists');
  });

  it('rejects negative prices and prices with more than 2 decimals', async () => {
    const base = { name: 'X', sku: 'X-1', costPrice: 1 };
    await api(app).post('/products').set(bearer(t.admin)).send({ ...base, sellingPrice: -1 }).expect(400);
    await api(app).post('/products').set(bearer(t.admin)).send({ ...base, sellingPrice: 12.345 }).expect(400);
  });

  it('never lets stock be PATCHed directly', async () => {
    const p = await createProduct(app, t.admin);
    await api(app).patch(`/products/${p.id}`).set(bearer(t.admin)).send({ stockQuantity: 999 }).expect(400);
  });

  it('updates price and deactivates instead of deleting', async () => {
    const p = await createProduct(app, t.admin);
    const upd = await api(app).patch(`/products/${p.id}`).set(bearer(t.admin)).send({ sellingPrice: 13.9 }).expect(200);
    expect(upd.body.sellingPrice).toBe('13.90');
    await api(app).delete(`/products/${p.id}`).set(bearer(t.admin)).expect(204);
    const got = await api(app).get(`/products/${p.id}`).set(bearer(t.staff)).expect(200);
    expect(got.body.isActive).toBe(false);
    const active = await api(app).get('/products?active=true').set(bearer(t.staff)).expect(200);
    expect(active.body.meta.total).toBe(0);
  });

  it('searches by name or SKU and filters low stock', async () => {
    await createProduct(app, t.admin, { name: '100Plus 24 x 325ml', sku: 'HP-24', stockQuantity: 50 });
    await createProduct(app, t.admin, { name: 'Milo 3in1', sku: 'MILO-18', stockQuantity: 2, lowStockThreshold: 5 });
    const byName = await api(app).get('/products?search=100plus').set(bearer(t.staff)).expect(200);
    expect(byName.body.data.map((p: { sku: string }) => p.sku)).toEqual(['HP-24']);
    const low = await api(app).get('/products?lowStock=true').set(bearer(t.staff)).expect(200);
    expect(low.body.data.map((p: { sku: string }) => p.sku)).toEqual(['MILO-18']);
  });
});
```

`backend/test/inventory.e2e-spec.ts`:

```ts
import { api, createTestApp, prismaOf, TestApp } from './utils/app.js';
import { bearer, setupUsers } from './utils/auth.js';
import { resetDb } from './utils/db.js';
import { createProduct } from './utils/fixtures.js';

describe('inventory', () => {
  let app: TestApp;
  let t: Awaited<ReturnType<typeof setupUsers>>;

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb(prismaOf(app));
    t = await setupUsers(app);
  });
  afterAll(async () => {
    await app.close();
  });

  const adjust = (token: string, body: object) =>
    api(app).post('/inventory/adjustments').set(bearer(token)).send(body);

  it('restocks and records the ledger', async () => {
    const p = await createProduct(app, t.admin, { stockQuantity: 10 });
    const res = await adjust(t.admin, { productId: p.id, type: 'RESTOCK', quantity: 5 }).expect(201);
    expect(res.body.product.stockQuantity).toBe(15);
    expect(res.body.transaction).toMatchObject({ type: 'RESTOCK', quantity: 5, referenceType: 'MANUAL' });
  });

  it('requires a note for ADJUSTMENT and a positive RESTOCK', async () => {
    const p = await createProduct(app, t.admin);
    await adjust(t.admin, { productId: p.id, type: 'ADJUSTMENT', quantity: -1 }).expect(400);
    await adjust(t.admin, { productId: p.id, type: 'RESTOCK', quantity: -1 }).expect(400);
    await adjust(t.admin, { productId: p.id, type: 'RESTOCK', quantity: 0 }).expect(400);
  });

  it('refuses a negative adjustment that would go below zero', async () => {
    const p = await createProduct(app, t.admin, { sku: 'MILO-18', stockQuantity: 3 });
    const res = await adjust(t.admin, {
      productId: p.id,
      type: 'ADJUSTMENT',
      quantity: -4,
      note: 'Damaged',
    }).expect(409);
    expect(res.body).toMatchObject({ sku: 'MILO-18', requested: 4, available: 3 });
    const ok = await adjust(t.admin, { productId: p.id, type: 'ADJUSTMENT', quantity: -3, note: 'Damaged' }).expect(201);
    expect(ok.body.product.stockQuantity).toBe(0);
  });

  it('forbids STAFF from adjusting stock and 404s unknown products', async () => {
    const p = await createProduct(app, t.admin);
    await adjust(t.staff, { productId: p.id, type: 'RESTOCK', quantity: 1 }).expect(403);
    await adjust(t.admin, { productId: '00000000-0000-4000-8000-000000000000', type: 'RESTOCK', quantity: 1 }).expect(404);
  });

  it('lists stock with a low-stock flag and a dedicated low-stock view', async () => {
    await createProduct(app, t.admin, { sku: 'OK', stockQuantity: 10, lowStockThreshold: 2 });
    await createProduct(app, t.admin, { sku: 'EDGE', stockQuantity: 2, lowStockThreshold: 2 });
    const all = await api(app).get('/inventory').set(bearer(t.staff)).expect(200);
    const flags = Object.fromEntries(all.body.data.map((p: { sku: string; isLow: boolean }) => [p.sku, p.isLow]));
    expect(flags).toEqual({ OK: false, EDGE: true });
    const low = await api(app).get('/inventory/low-stock').set(bearer(t.staff)).expect(200);
    expect(low.body.map((p: { sku: string }) => p.sku)).toEqual(['EDGE']);
  });

  it('keeps the ledger in sync with stock', async () => {
    const p = await createProduct(app, t.admin, { stockQuantity: 10 });
    await adjust(t.admin, { productId: p.id, type: 'RESTOCK', quantity: 20 }).expect(201);
    await adjust(t.admin, { productId: p.id, type: 'ADJUSTMENT', quantity: -2, note: 'Count' }).expect(201);
    const res = await api(app).get(`/inventory/${p.id}`).set(bearer(t.staff)).expect(200);
    const sum = res.body.transactions.data.reduce((s: number, tx: { quantity: number }) => s + tx.quantity, 0);
    expect(res.body.product.stockQuantity).toBe(28);
    expect(sum).toBe(28);
    expect(res.body.transactions.data[0].type).toBe('ADJUSTMENT'); // newest first
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm run test:e2e -- products inventory`
Expected: FAIL. `POST /products` returns 404.

- [ ] **Step 3: Implement products**

`backend/src/products/dto/product.dto.ts`:

```ts
import { OmitType, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination.js';
import { ToBoolean } from '../../common/transforms.js';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @Matches(/^[A-Za-z0-9._-]{1,50}$/, { message: 'sku may contain letters, digits, dot, dash, underscore (max 50)' })
  sku: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  sellingPrice: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costPrice: number;

  /** Opening stock only; later changes go through /inventory/adjustments. */
  @IsOptional()
  @IsInt()
  @Min(0)
  stockQuantity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;
}

export class UpdateProductDto extends PartialType(OmitType(CreateProductDto, ['stockQuantity'] as const)) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ListProductsQuery extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  lowStock?: boolean;
}
```

`backend/src/products/products.service.ts`:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { money } from '../common/money.js';
import { paginate, skipTake } from '../common/pagination.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProductDto, ListProductsQuery, UpdateProductDto } from './dto/product.dto.js';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(q: ListProductsQuery) {
    const where: Prisma.ProductWhereInput = {
      ...(q.search && {
        OR: [
          { name: { contains: q.search, mode: 'insensitive' } },
          { sku: { contains: q.search, mode: 'insensitive' } },
        ],
      }),
      ...(q.active !== undefined && { isActive: q.active }),
      ...(q.lowStock && { stockQuantity: { lte: this.prisma.product.fields.lowStockThreshold } }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({ where, orderBy: { name: 'asc' }, ...skipTake(q) }),
      this.prisma.product.count({ where }),
    ]);
    return paginate(data, total, q);
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  create(dto: CreateProductDto, userId: string) {
    const { stockQuantity = 0, sellingPrice, costPrice, ...rest } = dto;
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: { ...rest, sellingPrice: money(sellingPrice), costPrice: money(costPrice), stockQuantity },
      });
      if (stockQuantity > 0) {
        await tx.inventoryTransaction.create({
          data: {
            productId: product.id,
            type: 'RESTOCK',
            quantity: stockQuantity,
            referenceType: 'MANUAL',
            note: 'Opening stock',
            createdById: userId,
          },
        });
      }
      return product;
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    const { sellingPrice, costPrice, ...rest } = dto;
    return this.prisma.product.update({
      where: { id },
      data: {
        ...rest,
        ...(sellingPrice !== undefined && { sellingPrice: money(sellingPrice) }),
        ...(costPrice !== undefined && { costPrice: money(costPrice) }),
      },
    });
  }

  async deactivate(id: string) {
    await this.findOne(id);
    await this.prisma.product.update({ where: { id }, data: { isActive: false } });
  }
}
```

`backend/src/products/products.controller.ts`:

```ts
import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, Roles } from '../auth/decorators.js';
import type { PublicUser } from '../users/user.select.js';
import { CreateProductDto, ListProductsQuery, UpdateProductDto } from './dto/product.dto.js';
import { ProductsService } from './products.service.js';

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  findAll(@Query() q: ListProductsQuery) {
    return this.products.findAll(q);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.findOne(id);
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateProductDto, @CurrentUser() user: PublicUser) {
    return this.products.create(dto, user.id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(204)
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.deactivate(id);
  }
}
```

`backend/src/products/products.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';

@Module({ controllers: [ProductsController], providers: [ProductsService] })
export class ProductsModule {}
```

- [ ] **Step 4: Implement inventory**

`backend/src/inventory/dto/adjust-stock.dto.ts`:

```ts
import { IsIn, IsInt, IsOptional, IsString, IsUUID, MaxLength, NotEquals } from 'class-validator';

export class AdjustStockDto {
  @IsUUID()
  productId: string;

  @IsIn(['RESTOCK', 'ADJUSTMENT'])
  type: 'RESTOCK' | 'ADJUSTMENT';

  /** Signed: RESTOCK must be > 0; ADJUSTMENT may be negative. */
  @IsInt()
  @NotEquals(0)
  quantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
```

`backend/src/inventory/inventory.service.ts`:

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InsufficientStockException } from '../common/exceptions.js';
import { paginate, PaginationQueryDto, skipTake } from '../common/pagination.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AdjustStockDto } from './dto/adjust-stock.dto.js';

const stockSelect = {
  id: true,
  name: true,
  sku: true,
  stockQuantity: true,
  lowStockThreshold: true,
  isActive: true,
} satisfies Prisma.ProductSelect;

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: PaginationQueryDto) {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({ select: stockSelect, orderBy: { name: 'asc' }, ...skipTake(q) }),
      this.prisma.product.count(),
    ]);
    return paginate(
      rows.map((p) => ({ ...p, isLow: p.stockQuantity <= p.lowStockThreshold })),
      total,
      q,
    );
  }

  lowStock() {
    return this.prisma.product.findMany({
      where: { isActive: true, stockQuantity: { lte: this.prisma.product.fields.lowStockThreshold } },
      select: stockSelect,
      orderBy: { stockQuantity: 'asc' },
    });
  }

  async ledger(productId: string, q: PaginationQueryDto) {
    const product = await this.prisma.product.findUnique({ where: { id: productId }, select: stockSelect });
    if (!product) throw new NotFoundException('Product not found');
    const where = { productId };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.inventoryTransaction.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        ...skipTake(q),
      }),
      this.prisma.inventoryTransaction.count({ where }),
    ]);
    return { product, transactions: paginate(data, total, q) };
  }

  async adjust(dto: AdjustStockDto, userId: string) {
    if (dto.type === 'RESTOCK' && dto.quantity <= 0) throw new BadRequestException('RESTOCK quantity must be positive');
    if (dto.type === 'ADJUSTMENT' && !dto.note?.trim()) throw new BadRequestException('ADJUSTMENT requires a note');

    return this.prisma.$transaction(async (tx) => {
      if (dto.quantity > 0) {
        const r = await tx.product.updateMany({
          where: { id: dto.productId },
          data: { stockQuantity: { increment: dto.quantity } },
        });
        if (r.count === 0) throw new NotFoundException('Product not found');
      } else {
        await this.take(tx, dto.productId, -dto.quantity);
      }
      const transaction = await tx.inventoryTransaction.create({
        data: {
          productId: dto.productId,
          type: dto.type,
          quantity: dto.quantity,
          referenceType: 'MANUAL',
          note: dto.note,
          createdById: userId,
        },
      });
      const product = await tx.product.findUniqueOrThrow({ where: { id: dto.productId }, select: stockSelect });
      return { product, transaction };
    });
  }

  /**
   * Atomically removes `quantity` units. The WHERE guard is the lock: Postgres re-checks
   * `stock_quantity >= quantity` against the committed row, so concurrent takers cannot oversell.
   */
  private async take(tx: Prisma.TransactionClient, productId: string, quantity: number) {
    const r = await tx.product.updateMany({
      where: { id: productId, stockQuantity: { gte: quantity } },
      data: { stockQuantity: { decrement: quantity } },
    });
    if (r.count === 1) return;
    const p = await tx.product.findUnique({ where: { id: productId }, select: { sku: true, stockQuantity: true } });
    if (!p) throw new NotFoundException('Product not found');
    throw new InsufficientStockException(p.sku, quantity, p.stockQuantity);
  }
}
```

`backend/src/inventory/inventory.controller.ts`:

```ts
import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { PaginationQueryDto } from '../common/pagination.js';
import type { PublicUser } from '../users/user.select.js';
import { AdjustStockDto } from './dto/adjust-stock.dto.js';
import { InventoryService } from './inventory.service.js';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  list(@Query() q: PaginationQueryDto) {
    return this.inventory.list(q);
  }

  @Get('low-stock')
  lowStock() {
    return this.inventory.lowStock();
  }

  @Get(':productId')
  ledger(@Param('productId', ParseUUIDPipe) productId: string, @Query() q: PaginationQueryDto) {
    return this.inventory.ledger(productId, q);
  }

  @Post('adjustments')
  @Roles('ADMIN')
  adjust(@Body() dto: AdjustStockDto, @CurrentUser() user: PublicUser) {
    return this.inventory.adjust(dto, user.id);
  }
}
```

`backend/src/inventory/inventory.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller.js';
import { InventoryService } from './inventory.service.js';

@Module({ controllers: [InventoryController], providers: [InventoryService], exports: [InventoryService] })
export class InventoryModule {}
```

Add `ProductsModule` and `InventoryModule` to `AppModule.imports`.

- [ ] **Step 5: Run the tests to see them pass**

Run: `npm run test:e2e && npm run lint && npm run build`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src test
git commit -m "feat(inventory): products CRUD, stock ledger, adjustments and low-stock views

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Order rules (pure logic)

**Files:**
- Create: `backend/src/orders/order-rules.ts`, `backend/src/orders/order-rules.spec.ts`

**Interfaces:**
- Consumes: `money`, `ZERO`, `businessDate`, enums `OrderStatus`, `PaymentStatus`.
- Produces:
  - `canTransition(from: OrderStatus, to: OrderStatus): boolean`
  - `STOCK_HELD_STATUSES: readonly OrderStatus[]` = CONFIRMED, PACKING, READY
  - `derivePaymentStatus(total: Decimal, paid: Decimal): PaymentStatus`
  - `mergeLines(items: { productId: string; quantity: number }[]): { productId: string; quantity: number }[]`
  - `calculateTotals(lines: PricedLine[], discount: Decimal): { items: (PricedLine & { subtotal: Decimal })[]; subtotal: Decimal; total: Decimal }` where `PricedLine = { productId: string; quantity: number; unitPrice: Decimal }`. Throws `BadRequestException` if discount > subtotal.
  - `formatOrderNumber(seq: bigint, now?: Date): string`

- [ ] **Step 1: Write the failing unit tests**

`backend/src/orders/order-rules.spec.ts`:

```ts
import { BadRequestException } from '@nestjs/common';
import { money } from '../common/money.js';
import type { OrderStatus } from '../generated/prisma/client.js';
import {
  calculateTotals,
  canTransition,
  derivePaymentStatus,
  formatOrderNumber,
  mergeLines,
} from './order-rules.js';

const ALL: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PACKING', 'READY', 'DELIVERED', 'CANCELLED'];
const ALLOWED = new Set([
  'PENDING>CONFIRMED',
  'CONFIRMED>PACKING',
  'PACKING>READY',
  'READY>DELIVERED',
  'PENDING>CANCELLED',
  'CONFIRMED>CANCELLED',
  'PACKING>CANCELLED',
  'READY>CANCELLED',
]);

describe('canTransition', () => {
  for (const from of ALL) {
    for (const to of ALL) {
      const expected = ALLOWED.has(`${from}>${to}`);
      it(`${from} -> ${to} is ${expected ? 'allowed' : 'rejected'}`, () => {
        expect(canTransition(from, to)).toBe(expected);
      });
    }
  }
});

describe('derivePaymentStatus', () => {
  it.each([
    ['100.00', '0.00', 'UNPAID'],
    ['100.00', '0.01', 'PARTIAL'],
    ['100.00', '99.99', 'PARTIAL'],
    ['100.00', '100.00', 'PAID'],
    ['0.00', '0.00', 'PAID'], // fully discounted order owes nothing
  ])('total %s, paid %s -> %s', (total, paid, expected) => {
    expect(derivePaymentStatus(money(total), money(paid))).toBe(expected);
  });
});

describe('mergeLines', () => {
  it('sums quantities of repeated products, keeping first-seen order', () => {
    expect(
      mergeLines([
        { productId: 'b', quantity: 1 },
        { productId: 'a', quantity: 2 },
        { productId: 'b', quantity: 3 },
      ]),
    ).toEqual([
      { productId: 'b', quantity: 4 },
      { productId: 'a', quantity: 2 },
    ]);
  });
});

describe('calculateTotals', () => {
  const lines = [
    { productId: 'a', quantity: 3, unitPrice: money('0.10') },
    { productId: 'b', quantity: 2, unitPrice: money('12.50') },
  ];

  it('computes exact line subtotals, subtotal and total', () => {
    const r = calculateTotals(lines, money('5.00'));
    expect(r.items.map((i) => i.subtotal.toFixed(2))).toEqual(['0.30', '25.00']);
    expect(r.subtotal.toFixed(2)).toBe('25.30');
    expect(r.total.toFixed(2)).toBe('20.30');
  });

  it('allows a discount equal to the subtotal', () => {
    expect(calculateTotals(lines, money('25.30')).total.toFixed(2)).toBe('0.00');
  });

  it('rejects a discount above the subtotal', () => {
    expect(() => calculateTotals(lines, money('25.31'))).toThrow(BadRequestException);
  });
});

describe('formatOrderNumber', () => {
  it('uses the Malaysian date and pads to 4 digits', () => {
    expect(formatOrderNumber(7n, new Date('2026-09-29T16:30:00Z'))).toBe('ORD-20260930-0007');
  });

  it('grows past 4 digits instead of wrapping', () => {
    expect(formatOrderNumber(12345n, new Date('2026-09-29T00:00:00Z'))).toBe('ORD-20260929-12345');
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm test -- order-rules`
Expected: FAIL. Cannot resolve `./order-rules.js`.

- [ ] **Step 3: Implement**

`backend/src/orders/order-rules.ts`:

```ts
import { BadRequestException } from '@nestjs/common';
import { ZERO } from '../common/money.js';
import { businessDate } from '../common/time.js';
import type { OrderStatus, PaymentStatus, Prisma } from '../generated/prisma/client.js';

type Decimal = Prisma.Decimal;

const NEXT: Record<OrderStatus, OrderStatus | null> = {
  PENDING: 'CONFIRMED',
  CONFIRMED: 'PACKING',
  PACKING: 'READY',
  READY: 'DELIVERED',
  DELIVERED: null,
  CANCELLED: null,
};

/** Forward one step, or cancel from any non-terminal status. */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (to === 'CANCELLED') return NEXT[from] !== null;
  return NEXT[from] === to;
}

/** Statuses in which the order's stock has been deducted (and must be restored on cancel). */
export const STOCK_HELD_STATUSES: readonly OrderStatus[] = ['CONFIRMED', 'PACKING', 'READY'];

export function derivePaymentStatus(total: Decimal, paid: Decimal): PaymentStatus {
  if (paid.gte(total)) return 'PAID';
  return paid.isZero() ? 'UNPAID' : 'PARTIAL';
}

export function mergeLines(items: { productId: string; quantity: number }[]) {
  const merged = new Map<string, number>();
  for (const { productId, quantity } of items) merged.set(productId, (merged.get(productId) ?? 0) + quantity);
  return [...merged].map(([productId, quantity]) => ({ productId, quantity }));
}

export type PricedLine = { productId: string; quantity: number; unitPrice: Decimal };

export function calculateTotals(lines: PricedLine[], discount: Decimal) {
  const items = lines.map((l) => ({ ...l, subtotal: l.unitPrice.mul(l.quantity) }));
  const subtotal = items.reduce((sum, i) => sum.add(i.subtotal), ZERO);
  if (discount.gt(subtotal)) throw new BadRequestException('Discount cannot exceed subtotal');
  return { items, subtotal, total: subtotal.sub(discount) };
}

export function formatOrderNumber(seq: bigint, now = new Date()) {
  return `ORD-${businessDate(now).replaceAll('-', '')}-${seq.toString().padStart(4, '0')}`;
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npm test && npm run lint`
Expected: all pass (36 transition cases among them).

- [ ] **Step 5: Commit**

```bash
git add src/orders
git commit -m "feat(orders): pure lifecycle, totals, payment-status and numbering rules

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Orders: create, read, edit, delete

**Files:**
- Create: `backend/src/orders/{orders.module.ts,orders.controller.ts,orders.service.ts}`, `backend/src/orders/dto/order.dto.ts`, `backend/test/orders.e2e-spec.ts`
- Modify: `backend/src/app.module.ts`, `backend/src/customers/customers.module.ts` (already exports `CustomersService`), `backend/test/utils/fixtures.ts`

**Interfaces:**
- Consumes: `CustomersService.ensureExists(id, tx)`, order rules from Task 7, `money`, `ZERO`, pagination.
- Produces:
  - `OrdersService.create(dto: CreateOrderDto, userId: string)` → order detail + `stockWarnings: { productId; sku; requested; available }[]`.
  - `OrdersService.findOne(id: string)` → order detail with `customer`, `items[].product`, `payments`, `outstandingAmount`.
  - `orderDetailInclude` and `withOutstanding(order)` (module-local, reused by Task 9).
  - Test util `createOrder(app, token, body)`.

- [ ] **Step 1: Write the failing e2e test**

Append to `backend/test/utils/fixtures.ts`:

```ts
export async function createOrder(
  app: TestApp,
  token: string,
  body: { customerId: string; items: { productId: string; quantity: number }[]; discount?: number; notes?: string },
) {
  const res = await api(app).post('/orders').set(bearer(token)).send(body).expect(201);
  return res.body;
}
```

`backend/test/orders.e2e-spec.ts`:

```ts
import { api, createTestApp, prismaOf, TestApp } from './utils/app.js';
import { bearer, setupUsers } from './utils/auth.js';
import { resetDb } from './utils/db.js';
import { createCustomer, createOrder, createProduct } from './utils/fixtures.js';

describe('orders', () => {
  let app: TestApp;
  let t: Awaited<ReturnType<typeof setupUsers>>;
  let customer: { id: string };
  let coke: { id: string; sku: string };
  let milo: { id: string; sku: string };

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb(prismaOf(app));
    t = await setupUsers(app);
    customer = await createCustomer(app, t.staff);
    coke = await createProduct(app, t.admin, { sellingPrice: 12.5, stockQuantity: 10 });
    milo = await createProduct(app, t.admin, { sellingPrice: 3.1, stockQuantity: 1 });
  });
  afterAll(async () => {
    await app.close();
  });

  it('creates a PENDING order with exact totals and a sequential number', async () => {
    const order = await createOrder(app, t.staff, {
      customerId: customer.id,
      items: [
        { productId: coke.id, quantity: 2 },
        { productId: milo.id, quantity: 1 },
      ],
      discount: 3.1,
    });
    expect(order).toMatchObject({
      status: 'PENDING',
      paymentStatus: 'UNPAID',
      subtotal: '28.10',
      discount: '3.10',
      total: '25.00',
      paidAmount: '0.00',
      outstandingAmount: '25.00',
      stockWarnings: [],
    });
    expect(order.orderNumber).toMatch(/^ORD-\d{8}-0001$/);
    expect(order.items).toHaveLength(2);
  });

  it('merges duplicate product lines into one item', async () => {
    const order = await createOrder(app, t.staff, {
      customerId: customer.id,
      items: [
        { productId: coke.id, quantity: 1 },
        { productId: coke.id, quantity: 2 },
      ],
    });
    expect(order.items).toHaveLength(1);
    expect(order.items[0]).toMatchObject({ quantity: 3, subtotal: '37.50' });
  });

  it('warns about low stock but still takes the order', async () => {
    const order = await createOrder(app, t.staff, {
      customerId: customer.id,
      items: [{ productId: milo.id, quantity: 5 }],
    });
    expect(order.stockWarnings).toEqual([{ productId: milo.id, sku: milo.sku, requested: 5, available: 1 }]);
  });

  it('rejects bad input', async () => {
    const post = (body: object) => api(app).post('/orders').set(bearer(t.staff)).send(body);
    await post({ customerId: customer.id, items: [] }).expect(400);
    await post({ customerId: customer.id, items: [{ productId: coke.id, quantity: 0 }] }).expect(400);
    await post({ customerId: customer.id, items: [{ productId: coke.id, quantity: 1 }], discount: 12.51 }).expect(400);
    await post({ customerId: customer.id, items: [{ productId: coke.id, quantity: 1 }], discount: 1.005 }).expect(400);
    await post({ customerId: '00000000-0000-4000-8000-000000000000', items: [{ productId: coke.id, quantity: 1 }] }).expect(404);
    await api(app).delete(`/products/${coke.id}`).set(bearer(t.admin)).expect(204);
    await post({ customerId: customer.id, items: [{ productId: coke.id, quantity: 1 }] }).expect(400);
  });

  it('snapshots the unit price at order time', async () => {
    const order = await createOrder(app, t.staff, { customerId: customer.id, items: [{ productId: coke.id, quantity: 1 }] });
    await api(app).patch(`/products/${coke.id}`).set(bearer(t.admin)).send({ sellingPrice: 99 }).expect(200);
    const got = await api(app).get(`/orders/${order.id}`).set(bearer(t.staff)).expect(200);
    expect(got.body.items[0].unitPrice).toBe('12.50');
  });

  it('edits a PENDING order and recomputes totals', async () => {
    const order = await createOrder(app, t.staff, { customerId: customer.id, items: [{ productId: coke.id, quantity: 1 }] });
    const res = await api(app)
      .patch(`/orders/${order.id}`)
      .set(bearer(t.staff))
      .send({ items: [{ productId: coke.id, quantity: 4 }], discount: 10, notes: 'Deliver Friday' })
      .expect(200);
    expect(res.body).toMatchObject({ subtotal: '50.00', total: '40.00', notes: 'Deliver Friday' });
    expect(res.body.items).toHaveLength(1);
    const discountOnly = await api(app).patch(`/orders/${order.id}`).set(bearer(t.staff)).send({ discount: 0 }).expect(200);
    expect(discountOnly.body.total).toBe('50.00');
  });

  it('lists with filters, search and pagination', async () => {
    const other = await createCustomer(app, t.staff, { name: 'Syarikat Tan Bros' });
    await createOrder(app, t.staff, { customerId: customer.id, items: [{ productId: coke.id, quantity: 1 }] });
    await createOrder(app, t.staff, { customerId: other.id, items: [{ productId: coke.id, quantity: 1 }] });
    const list = (qs: string) => api(app).get(`/orders${qs}`).set(bearer(t.staff)).expect(200);
    expect((await list('?status=PENDING')).body.meta.total).toBe(2);
    expect((await list('?search=tan bros')).body.data[0].customer.name).toBe('Syarikat Tan Bros');
    expect((await list('?search=-0002')).body.meta.total).toBe(1);
    expect((await list(`?customerId=${customer.id}`)).body.meta.total).toBe(1);
    expect((await list('?paymentStatus=PAID')).body.meta.total).toBe(0);
    expect((await list('?limit=1&page=2')).body.meta).toEqual({ page: 2, limit: 1, total: 2, totalPages: 2 });
  });

  it('rejects out-of-range pagination and malformed ids', async () => {
    for (const qs of ['?limit=0', '?limit=101', '?page=0', '?status=SHIPPED']) {
      await api(app).get(`/orders${qs}`).set(bearer(t.staff)).expect(400);
    }
    await api(app).get('/orders/123').set(bearer(t.staff)).expect(400);
    await api(app).get('/orders/00000000-0000-4000-8000-000000000000').set(bearer(t.staff)).expect(404);
  });

  it('lets only ADMIN delete a PENDING order', async () => {
    const order = await createOrder(app, t.staff, { customerId: customer.id, items: [{ productId: coke.id, quantity: 1 }] });
    await api(app).delete(`/orders/${order.id}`).set(bearer(t.staff)).expect(403);
    await api(app).delete(`/orders/${order.id}`).set(bearer(t.admin)).expect(204);
    await api(app).get(`/orders/${order.id}`).set(bearer(t.staff)).expect(404);
  });

  it('shows the order in the customer history', async () => {
    await createOrder(app, t.staff, { customerId: customer.id, items: [{ productId: coke.id, quantity: 1 }] });
    const res = await api(app).get(`/customers/${customer.id}`).set(bearer(t.staff)).expect(200);
    expect(res.body.orders).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm run test:e2e -- orders`
Expected: FAIL. `POST /orders` returns 404.

- [ ] **Step 3: Implement**

`backend/src/orders/dto/order.dto.ts`:

```ts
import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination.js';
import { OrderStatus, PaymentStatus } from '../../generated/prisma/client.js';

export class OrderItemInput {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  @Max(100_000)
  quantity: number;
}

export class CreateOrderDto {
  @IsUUID()
  customerId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInput)
  items: OrderItemInput[];

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateOrderDto extends PartialType(CreateOrderDto) {}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;
}

export class ListOrdersQuery extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
```

`backend/src/orders/orders.service.ts`:

```ts
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { money, ZERO } from '../common/money.js';
import { paginate, skipTake } from '../common/pagination.js';
import { CustomersService } from '../customers/customers.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateOrderDto, ListOrdersQuery, OrderItemInput, UpdateOrderDto } from './dto/order.dto.js';
import { calculateTotals, derivePaymentStatus, formatOrderNumber, mergeLines, type PricedLine } from './order-rules.js';

export const orderDetailInclude = {
  customer: { select: { id: true, name: true, phone: true } },
  items: { include: { product: { select: { id: true, name: true, sku: true } } }, orderBy: { id: 'asc' } },
  payments: { orderBy: { paidAt: 'asc' } },
} satisfies Prisma.OrderInclude;

export const withOutstanding = <T extends { total: Prisma.Decimal; paidAmount: Prisma.Decimal }>(order: T) => ({
  ...order,
  outstandingAmount: order.total.sub(order.paidAmount),
});

type StockWarning = { productId: string; sku: string; requested: number; available: number };

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomersService,
  ) {}

  async findAll(q: ListOrdersQuery) {
    const where: Prisma.OrderWhereInput = {
      status: q.status,
      paymentStatus: q.paymentStatus,
      customerId: q.customerId,
      ...(q.search && {
        OR: [
          { orderNumber: { contains: q.search, mode: 'insensitive' } },
          { customer: { name: { contains: q.search, mode: 'insensitive' } } },
        ],
      }),
      ...((q.from || q.to) && {
        createdAt: { gte: q.from ? new Date(q.from) : undefined, lte: q.to ? new Date(q.to) : undefined },
      }),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: { customer: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        ...skipTake(q),
      }),
      this.prisma.order.count({ where }),
    ]);
    return paginate(rows.map(withOutstanding), total, q);
  }

  async findOne(id: string, tx: Prisma.TransactionClient = this.prisma) {
    const order = await tx.order.findUnique({ where: { id }, include: orderDetailInclude });
    if (!order) throw new NotFoundException('Order not found');
    return withOutstanding(order);
  }

  create(dto: CreateOrderDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.customers.ensureExists(dto.customerId, tx);
      const { lines, stockWarnings } = await this.priceLines(tx, dto.items);
      const discount = money(dto.discount ?? 0);
      const { items, subtotal, total } = calculateTotals(lines, discount);
      const [{ n }] = await tx.$queryRaw<{ n: bigint }[]>`SELECT nextval('order_number_seq') AS n`;
      const order = await tx.order.create({
        data: {
          orderNumber: formatOrderNumber(n),
          customerId: dto.customerId,
          notes: dto.notes,
          subtotal,
          discount,
          total,
          paymentStatus: derivePaymentStatus(total, ZERO),
          createdById: userId,
          items: { create: items },
        },
        include: orderDetailInclude,
      });
      return { ...withOutstanding(order), stockWarnings };
    });
  }

  update(id: string, dto: UpdateOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id }, include: { items: true } });
      if (!order) throw new NotFoundException('Order not found');
      if (order.status !== 'PENDING') throw new ConflictException('Only PENDING orders can be edited');
      if (dto.customerId) await this.customers.ensureExists(dto.customerId, tx);

      const lines: PricedLine[] = dto.items
        ? (await this.priceLines(tx, dto.items)).lines
        : order.items.map(({ productId, quantity, unitPrice }) => ({ productId, quantity, unitPrice }));
      const discount = dto.discount !== undefined ? money(dto.discount) : order.discount;
      const { items, subtotal, total } = calculateTotals(lines, discount);
      if (total.lt(order.paidAmount)) {
        throw new ConflictException(`New total is below the RM ${order.paidAmount.toFixed(2)} already paid`);
      }

      // Guard on status and paidAmount: a concurrent confirm or payment makes this match 0 rows.
      const claimed = await tx.order.updateMany({
        where: { id, status: 'PENDING', paidAmount: order.paidAmount },
        data: {
          customerId: dto.customerId,
          notes: dto.notes,
          subtotal,
          discount,
          total,
          paymentStatus: derivePaymentStatus(total, order.paidAmount),
        },
      });
      if (claimed.count === 0) throw new ConflictException('Order was changed by another request; please retry');

      if (dto.items) {
        await tx.orderItem.deleteMany({ where: { orderId: id } });
        await tx.orderItem.createMany({ data: items.map((i) => ({ ...i, orderId: id })) });
      }
      return this.findOne(id, tx);
    });
  }

  async remove(id: string) {
    const r = await this.prisma.order.deleteMany({ where: { id, status: 'PENDING', payments: { none: {} } } });
    if (r.count === 1) return;
    if (!(await this.prisma.order.count({ where: { id } }))) throw new NotFoundException('Order not found');
    throw new ConflictException('Only PENDING orders without payments can be deleted; cancel it instead');
  }

  /** Merges duplicate lines, snapshots prices, rejects missing/inactive products, and reports stock shortfalls. */
  private async priceLines(tx: Prisma.TransactionClient, input: OrderItemInput[]) {
    const merged = mergeLines(input);
    const products = await tx.product.findMany({ where: { id: { in: merged.map((l) => l.productId) } } });
    const byId = new Map(products.map((p) => [p.id, p]));
    const stockWarnings: StockWarning[] = [];
    const lines: PricedLine[] = merged.map(({ productId, quantity }) => {
      const p = byId.get(productId);
      if (!p) throw new NotFoundException(`Product ${productId} not found`);
      if (!p.isActive) throw new BadRequestException(`Product ${p.sku} is inactive`);
      if (quantity > p.stockQuantity) {
        stockWarnings.push({ productId, sku: p.sku, requested: quantity, available: p.stockQuantity });
      }
      return { productId, quantity, unitPrice: p.sellingPrice };
    });
    return { lines, stockWarnings };
  }
}
```

`backend/src/orders/orders.controller.ts`:

```ts
import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, Roles } from '../auth/decorators.js';
import type { PublicUser } from '../users/user.select.js';
import { CreateOrderDto, ListOrdersQuery, UpdateOrderDto } from './dto/order.dto.js';
import { OrdersService } from './orders.service.js';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  findAll(@Query() q: ListOrdersQuery) {
    return this.orders.findAll(q);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.orders.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: PublicUser) {
    return this.orders.create(dto, user.id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateOrderDto) {
    return this.orders.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.orders.remove(id);
  }
}
```

`backend/src/orders/orders.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

@Module({
  imports: [CustomersModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
```

Add `OrdersModule` to `AppModule.imports`.

- [ ] **Step 4: Run the tests to see them pass**

Run: `npm run test:e2e && npm test && npm run lint && npm run build`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src test
git commit -m "feat(orders): create, list, view, edit and delete PENDING orders

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Order status transitions with stock (confirm, fulfil, cancel)

**Files:**
- Create: `backend/test/order-status.e2e-spec.ts`
- Modify: `backend/src/inventory/inventory.service.ts`, `backend/src/orders/orders.service.ts`, `backend/src/orders/orders.controller.ts`, `backend/src/orders/orders.module.ts`

**Interfaces:**
- Consumes: `canTransition`, `STOCK_HELD_STATUSES`, `InvalidStatusTransitionException`, `InventoryService.take`.
- Produces:
  - `InventoryService.deductForOrder(tx, lines: StockLine[], ref: { orderId: string; userId: string }): Promise<void>`
  - `InventoryService.restoreForOrder(tx, lines: StockLine[], ref): Promise<void>`
  - `type StockLine = { productId: string; quantity: number }` (exported from `inventory.service.ts`)
  - `OrdersService.changeStatus(id: string, to: OrderStatus, userId: string)` → order detail
  - `PATCH /orders/:id/status`

- [ ] **Step 1: Write the failing e2e test**

`backend/test/order-status.e2e-spec.ts`:

```ts
import { api, createTestApp, prismaOf, TestApp } from './utils/app.js';
import { bearer, setupUsers } from './utils/auth.js';
import { resetDb } from './utils/db.js';
import { createCustomer, createOrder, createProduct } from './utils/fixtures.js';

describe('order status transitions', () => {
  let app: TestApp;
  let t: Awaited<ReturnType<typeof setupUsers>>;
  let customerId: string;
  let product: { id: string; sku: string };

  const setStatus = (id: string, status: string) =>
    api(app).patch(`/orders/${id}/status`).set(bearer(t.staff)).send({ status });
  const stockOf = async (id: string) => (await prismaOf(app).product.findUniqueOrThrow({ where: { id } })).stockQuantity;
  const ledgerSum = async (productId: string) =>
    (await prismaOf(app).inventoryTransaction.aggregate({ where: { productId }, _sum: { quantity: true } }))._sum
      .quantity;
  const order = (quantity: number) =>
    createOrder(app, t.staff, { customerId, items: [{ productId: product.id, quantity }] });

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb(prismaOf(app));
    t = await setupUsers(app);
    customerId = (await createCustomer(app, t.staff)).id;
    product = await createProduct(app, t.admin, { sku: 'COKE-24', stockQuantity: 10 });
  });
  afterAll(async () => {
    await app.close();
  });

  it('deducts stock and writes SALE rows on confirm', async () => {
    const o = await order(3);
    const res = await setStatus(o.id, 'CONFIRMED').expect(200);
    expect(res.body.status).toBe('CONFIRMED');
    expect(res.body.confirmedAt).toEqual(expect.any(String));
    expect(await stockOf(product.id)).toBe(7);
    const sale = await prismaOf(app).inventoryTransaction.findFirstOrThrow({ where: { type: 'SALE' } });
    expect(sale).toMatchObject({ quantity: -3, referenceType: 'ORDER', referenceId: o.id });
  });

  it('refuses to confirm without enough stock and changes nothing', async () => {
    const o = await order(11);
    const res = await setStatus(o.id, 'CONFIRMED').expect(409);
    expect(res.body).toMatchObject({ sku: 'COKE-24', requested: 11, available: 10 });
    expect((await api(app).get(`/orders/${o.id}`).set(bearer(t.staff))).body.status).toBe('PENDING');
    expect(await stockOf(product.id)).toBe(10);
  });

  it('refuses to confirm twice', async () => {
    const o = await order(1);
    await setStatus(o.id, 'CONFIRMED').expect(200);
    await setStatus(o.id, 'CONFIRMED').expect(409);
    expect(await stockOf(product.id)).toBe(9);
  });

  it('walks the fulfilment path and makes DELIVERED final', async () => {
    const o = await order(1);
    for (const s of ['CONFIRMED', 'PACKING', 'READY', 'DELIVERED']) await setStatus(o.id, s).expect(200);
    const delivered = await api(app).get(`/orders/${o.id}`).set(bearer(t.staff)).expect(200);
    expect(delivered.body.deliveredAt).toEqual(expect.any(String));
    const res = await setStatus(o.id, 'CANCELLED').expect(409);
    expect(res.body.message).toBe('Cannot change status from DELIVERED to CANCELLED');
  });

  it('rejects skipping steps', async () => {
    const o = await order(1);
    const res = await setStatus(o.id, 'READY').expect(409);
    expect(res.body.message).toBe('Cannot change status from PENDING to READY');
  });

  it('restores stock with RETURN rows when a confirmed order is cancelled', async () => {
    const o = await order(4);
    await setStatus(o.id, 'CONFIRMED').expect(200);
    await setStatus(o.id, 'PACKING').expect(200);
    const res = await setStatus(o.id, 'CANCELLED').expect(200);
    expect(res.body.cancelledAt).toEqual(expect.any(String));
    expect(await stockOf(product.id)).toBe(10);
    expect(await prismaOf(app).inventoryTransaction.count({ where: { type: 'RETURN', quantity: 4 } })).toBe(1);
    await setStatus(o.id, 'CANCELLED').expect(409); // cannot restore twice
    expect(await stockOf(product.id)).toBe(10);
  });

  it('cancels a PENDING order without touching stock', async () => {
    const o = await order(4);
    await setStatus(o.id, 'CANCELLED').expect(200);
    expect(await stockOf(product.id)).toBe(10);
    expect(await prismaOf(app).inventoryTransaction.count({ where: { type: { in: ['SALE', 'RETURN'] } } })).toBe(0);
  });

  it('locks a confirmed order against edits and deletion', async () => {
    const o = await order(1);
    await setStatus(o.id, 'CONFIRMED').expect(200);
    await api(app).patch(`/orders/${o.id}`).set(bearer(t.staff)).send({ notes: 'x' }).expect(409);
    await api(app).delete(`/orders/${o.id}`).set(bearer(t.admin)).expect(409);
  });

  it('never oversells when two orders race for the last units', async () => {
    await api(app)
      .post('/inventory/adjustments')
      .set(bearer(t.admin))
      .send({ productId: product.id, type: 'ADJUSTMENT', quantity: -5, note: 'Set to 5' })
      .expect(201);
    const [a, b] = [await order(5), await order(5)];
    const results = await Promise.all([setStatus(a.id, 'CONFIRMED'), setStatus(b.id, 'CONFIRMED')]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await stockOf(product.id)).toBe(0);
    expect(await prismaOf(app).inventoryTransaction.count({ where: { type: 'SALE' } })).toBe(1);
    expect(await ledgerSum(product.id)).toBe(0);
  });

  it('keeps stock consistent when confirm and cancel race on one order', async () => {
    const o = await order(3);
    await Promise.all([setStatus(o.id, 'CONFIRMED'), setStatus(o.id, 'CANCELLED')]);
    const final = (await api(app).get(`/orders/${o.id}`).set(bearer(t.staff))).body.status;
    expect(await stockOf(product.id)).toBe(final === 'CONFIRMED' ? 7 : 10);
    expect(await ledgerSum(product.id)).toBe(await stockOf(product.id));
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm run test:e2e -- order-status`
Expected: FAIL. `PATCH /orders/:id/status` returns 404.

- [ ] **Step 3: Add stock movements for orders to `InventoryService`**

Add above the class in `backend/src/inventory/inventory.service.ts`:

```ts
export type StockLine = { productId: string; quantity: number };
type OrderRef = { orderId: string; userId: string };

// Taking row locks in a consistent order prevents deadlocks between concurrent multi-item confirms.
const byProductId = (lines: StockLine[]) => [...lines].sort((a, b) => a.productId.localeCompare(b.productId));
```

Add these methods inside the class (after `adjust`):

```ts
  /** Deducts every line or none: the first shortfall throws and rolls back the caller's transaction. */
  async deductForOrder(tx: Prisma.TransactionClient, lines: StockLine[], ref: OrderRef) {
    const sorted = byProductId(lines);
    for (const l of sorted) await this.take(tx, l.productId, l.quantity);
    await tx.inventoryTransaction.createMany({
      data: sorted.map((l) => ({
        productId: l.productId,
        type: 'SALE' as const,
        quantity: -l.quantity,
        referenceType: 'ORDER' as const,
        referenceId: ref.orderId,
        createdById: ref.userId,
      })),
    });
  }

  async restoreForOrder(tx: Prisma.TransactionClient, lines: StockLine[], ref: OrderRef) {
    const sorted = byProductId(lines);
    for (const l of sorted) {
      await tx.product.update({ where: { id: l.productId }, data: { stockQuantity: { increment: l.quantity } } });
    }
    await tx.inventoryTransaction.createMany({
      data: sorted.map((l) => ({
        productId: l.productId,
        type: 'RETURN' as const,
        quantity: l.quantity,
        referenceType: 'ORDER' as const,
        referenceId: ref.orderId,
        createdById: ref.userId,
      })),
    });
  }
```

- [ ] **Step 4: Add `changeStatus` to `OrdersService`**

In `backend/src/orders/orders.service.ts`, extend the imports:

```ts
import { InvalidStatusTransitionException } from '../common/exceptions.js';
import type { OrderStatus, Prisma } from '../generated/prisma/client.js';
import { InventoryService } from '../inventory/inventory.service.js';
import {
  calculateTotals,
  canTransition,
  derivePaymentStatus,
  formatOrderNumber,
  mergeLines,
  STOCK_HELD_STATUSES,
  type PricedLine,
} from './order-rules.js';
```

(These replace the existing `import type { Prisma }` and `order-rules.js` imports.)

Change the constructor:

```ts
  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomersService,
    private readonly inventory: InventoryService,
  ) {}
```

Add the method:

```ts
  changeStatus(id: string, to: OrderStatus, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id }, include: { items: true } });
      if (!order) throw new NotFoundException('Order not found');
      if (!canTransition(order.status, to)) throw new InvalidStatusTransitionException(order.status, to);

      // Claim the transition: if another request changed the status first, this matches 0 rows.
      const now = new Date();
      const claimed = await tx.order.updateMany({
        where: { id, status: order.status },
        data: {
          status: to,
          ...(to === 'CONFIRMED' && { confirmedAt: now }),
          ...(to === 'CANCELLED' && { cancelledAt: now }),
          ...(to === 'DELIVERED' && { deliveredAt: now }),
        },
      });
      if (claimed.count === 0) throw new ConflictException('Order was changed by another request; please retry');

      const lines = order.items.map(({ productId, quantity }) => ({ productId, quantity }));
      const ref = { orderId: id, userId };
      if (to === 'CONFIRMED') await this.inventory.deductForOrder(tx, lines, ref);
      if (to === 'CANCELLED' && STOCK_HELD_STATUSES.includes(order.status)) {
        await this.inventory.restoreForOrder(tx, lines, ref);
      }
      return this.findOne(id, tx);
    });
  }
```

In `backend/src/orders/orders.controller.ts`, add `UpdateOrderStatusDto` to the DTO import and add:

```ts
  @Patch(':id/status')
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: PublicUser,
  ) {
    return this.orders.changeStatus(id, dto.status, user.id);
  }
```

In `backend/src/orders/orders.module.ts`, add `InventoryModule` to `imports` (`import { InventoryModule } from '../inventory/inventory.module.js';`).

- [ ] **Step 5: Run the tests to see them pass**

Run: `npm run test:e2e && npm test && npm run lint && npm run build`
Expected: all pass, including both race tests. Run `npm run test:e2e -- order-status` 5 times to check the race tests are stable.

- [ ] **Step 6: Commit**

```bash
git add src test
git commit -m "feat(orders): status transitions with atomic stock deduction and restore on cancel

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Payments

**Files:**
- Create: `backend/src/payments/{payments.module.ts,payments.controller.ts,payments.service.ts}`, `backend/src/payments/dto/payment.dto.ts`, `backend/test/payments.e2e-spec.ts`
- Modify: `backend/src/app.module.ts`

**Interfaces:**
- Consumes: `money`, `OverpaymentException`, pagination, `CurrentUser`.
- Produces: `PaymentsService.record(dto: CreatePaymentDto, userId: string)` → the created payment. `POST /payments`, `GET /payments`, `GET /payments/:id`.

- [ ] **Step 1: Write the failing e2e test**

`backend/test/payments.e2e-spec.ts`:

```ts
import { api, createTestApp, prismaOf, TestApp } from './utils/app.js';
import { bearer, setupUsers } from './utils/auth.js';
import { resetDb } from './utils/db.js';
import { createCustomer, createOrder, createProduct } from './utils/fixtures.js';

describe('payments', () => {
  let app: TestApp;
  let t: Awaited<ReturnType<typeof setupUsers>>;
  let orderId: string; // total RM 100.00

  const pay = (body: Record<string, unknown>) =>
    api(app).post('/payments').set(bearer(t.staff)).send({ orderId, method: 'BANK_TRANSFER', ...body });
  const getOrder = async () => (await api(app).get(`/orders/${orderId}`).set(bearer(t.staff)).expect(200)).body;

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb(prismaOf(app));
    t = await setupUsers(app);
    const customer = await createCustomer(app, t.staff);
    const product = await createProduct(app, t.admin, { sellingPrice: 50 });
    orderId = (await createOrder(app, t.staff, { customerId: customer.id, items: [{ productId: product.id, quantity: 2 }] })).id;
  });
  afterAll(async () => {
    await app.close();
  });

  it('records a deposit on a PENDING order as PARTIAL, then PAID', async () => {
    const res = await pay({ amount: 30, reference: 'MBB-123' }).expect(201);
    expect(res.body).toMatchObject({ amount: '30.00', method: 'BANK_TRANSFER', reference: 'MBB-123' });
    expect(await getOrder()).toMatchObject({ paymentStatus: 'PARTIAL', paidAmount: '30.00', outstandingAmount: '70.00' });
    await pay({ amount: 70 }).expect(201);
    const o = await getOrder();
    expect(o).toMatchObject({ paymentStatus: 'PAID', outstandingAmount: '0.00' });
    expect(o.payments).toHaveLength(2);
  });

  it('rejects overpayment with the outstanding amount', async () => {
    await pay({ amount: 60 }).expect(201);
    const res = await pay({ amount: 40.01 }).expect(409);
    expect(res.body.message).toBe('Payment exceeds outstanding amount (RM 40.00)');
    expect((await getOrder()).paidAmount).toBe('60.00');
  });

  it('rejects payments on cancelled orders', async () => {
    await api(app).patch(`/orders/${orderId}/status`).set(bearer(t.staff)).send({ status: 'CANCELLED' }).expect(200);
    const res = await pay({ amount: 10 }).expect(409);
    expect(res.body.message).toBe('Cannot record a payment for a cancelled order');
  });

  it('validates amount, method and paidAt', async () => {
    await pay({ amount: 0 }).expect(400);
    await pay({ amount: -5 }).expect(400);
    await pay({ amount: 10.005 }).expect(400);
    await pay({ amount: 10, method: 'CRYPTO' }).expect(400);
    await pay({ amount: 10, paidAt: new Date(Date.now() + 86_400_000).toISOString() }).expect(400);
    await pay({ amount: 10, paidAt: '2026-01-15T10:00:00+08:00' }).expect(201); // backdating is fine
    await pay({ amount: 10, orderId: '00000000-0000-4000-8000-000000000000' }).expect(404);
  });

  it('lists and fetches payments', async () => {
    const p = await pay({ amount: 10, method: 'CASH' }).expect(201);
    const list = await api(app).get(`/payments?orderId=${orderId}`).set(bearer(t.staff)).expect(200);
    expect(list.body.meta.total).toBe(1);
    expect(list.body.data[0].order.orderNumber).toMatch(/^ORD-/);
    await api(app).get(`/payments/${p.body.id}`).set(bearer(t.staff)).expect(200);
    expect((await api(app).get('/payments?method=CARD').set(bearer(t.staff))).body.meta.total).toBe(0);
  });

  it('never lets concurrent payments exceed the total', async () => {
    const results = await Promise.all([pay({ amount: 60 }), pay({ amount: 60 })]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await getOrder()).toMatchObject({ paidAmount: '60.00', paymentStatus: 'PARTIAL' });
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm run test:e2e -- payments`
Expected: FAIL. `POST /payments` returns 404.

- [ ] **Step 3: Implement**

`backend/src/payments/dto/payment.dto.ts`:

```ts
import { IsDateString, IsEnum, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination.js';
import { PaymentMethod } from '../../generated/prisma/client.js';

export class CreatePaymentDto {
  @IsUUID()
  orderId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  /** Defaults to now; may be backdated, never in the future. */
  @IsOptional()
  @IsDateString()
  paidAt?: string;
}

export class ListPaymentsQuery extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
```

`backend/src/payments/payments.service.ts`:

```ts
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { OverpaymentException } from '../common/exceptions.js';
import { money } from '../common/money.js';
import { paginate, skipTake } from '../common/pagination.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePaymentDto, ListPaymentsQuery } from './dto/payment.dto.js';

const CLOCK_SKEW_MS = 60_000;
const orderRef = { select: { id: true, orderNumber: true } } as const;

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(q: ListPaymentsQuery) {
    const where: Prisma.PaymentWhereInput = {
      orderId: q.orderId,
      method: q.method,
      ...((q.from || q.to) && {
        paidAt: { gte: q.from ? new Date(q.from) : undefined, lte: q.to ? new Date(q.to) : undefined },
      }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({ where, include: { order: orderRef }, orderBy: { paidAt: 'desc' }, ...skipTake(q) }),
      this.prisma.payment.count({ where }),
    ]);
    return paginate(data, total, q);
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id }, include: { order: orderRef } });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  record(dto: CreatePaymentDto, userId: string) {
    const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();
    if (paidAt.getTime() > Date.now() + CLOCK_SKEW_MS) throw new BadRequestException('paidAt cannot be in the future');
    const amount = money(dto.amount).toFixed(2);

    return this.prisma.$transaction(async (tx) => {
      // One guarded statement: adds the payment only if the order is live and it fits the outstanding amount.
      const updated = await tx.$executeRaw`
        UPDATE orders
        SET paid_amount = paid_amount + ${amount}::numeric,
            payment_status = (CASE WHEN paid_amount + ${amount}::numeric >= total THEN 'PAID' ELSE 'PARTIAL' END)::"PaymentStatus",
            updated_at = now()
        WHERE id = ${dto.orderId}::uuid
          AND status <> 'CANCELLED'
          AND paid_amount + ${amount}::numeric <= total`;

      if (updated === 0) {
        const order = await tx.order.findUnique({ where: { id: dto.orderId } });
        if (!order) throw new NotFoundException('Order not found');
        if (order.status === 'CANCELLED') throw new ConflictException('Cannot record a payment for a cancelled order');
        throw new OverpaymentException(order.total.sub(order.paidAmount));
      }

      return tx.payment.create({
        data: {
          orderId: dto.orderId,
          amount,
          method: dto.method,
          reference: dto.reference,
          paidAt,
          recordedById: userId,
        },
        include: { order: orderRef },
      });
    });
  }
}
```

`backend/src/payments/payments.controller.ts`:

```ts
import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators.js';
import type { PublicUser } from '../users/user.select.js';
import { CreatePaymentDto, ListPaymentsQuery } from './dto/payment.dto.js';
import { PaymentsService } from './payments.service.js';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  findAll(@Query() q: ListPaymentsQuery) {
    return this.payments.findAll(q);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.payments.findOne(id);
  }

  @Post()
  record(@Body() dto: CreatePaymentDto, @CurrentUser() user: PublicUser) {
    return this.payments.record(dto, user.id);
  }
}
```

`backend/src/payments/payments.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';

@Module({ controllers: [PaymentsController], providers: [PaymentsService], exports: [PaymentsService] })
export class PaymentsModule {}
```

Add `PaymentsModule` to `AppModule.imports`.

- [ ] **Step 4: Run the tests to see them pass**

Run: `npm run test:e2e && npm run lint && npm run build`
Expected: all pass. Rerun `npm run test:e2e -- payments` 5 times to check the race test is stable.

- [ ] **Step 5: Commit**

```bash
git add src test
git commit -m "feat(payments): partial/full payments with race-safe overpayment guard

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Dashboard summary

**Files:**
- Create: `backend/src/dashboard/{dashboard.module.ts,dashboard.controller.ts,dashboard.service.ts}`, `backend/test/dashboard.e2e-spec.ts`
- Modify: `backend/src/app.module.ts`

**Interfaces:**
- Consumes: `startOfBusinessDay`, `money`.
- Produces: `GET /dashboard/summary` → `{ todayOrders, todaySales, unpaidOrders, outstandingAmount, pendingOrders, awaitingFulfilment, lowStockProducts, completedOrders }` (money as strings).

- [ ] **Step 1: Write the failing e2e test**

`backend/test/dashboard.e2e-spec.ts`:

```ts
import { api, createTestApp, prismaOf, TestApp } from './utils/app.js';
import { bearer, setupUsers } from './utils/auth.js';
import { resetDb } from './utils/db.js';
import { createCustomer, createOrder, createProduct } from './utils/fixtures.js';

describe('GET /dashboard/summary', () => {
  let app: TestApp;
  let t: Awaited<ReturnType<typeof setupUsers>>;

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb(prismaOf(app));
    t = await setupUsers(app);
  });
  afterAll(async () => {
    await app.close();
  });

  it('summarises what needs attention', async () => {
    const customerId = (await createCustomer(app, t.staff)).id;
    const a = await createProduct(app, t.admin, { sellingPrice: 12.5, stockQuantity: 20, lowStockThreshold: 2 });
    await createProduct(app, t.admin, { stockQuantity: 1, lowStockThreshold: 5 }); // low
    await createProduct(app, t.admin, { stockQuantity: 0, lowStockThreshold: 5 }).then((p) =>
      api(app).delete(`/products/${p.id}`).set(bearer(t.admin)).expect(204),
    ); // low but inactive, so not counted

    const newOrder = () => createOrder(app, t.staff, { customerId, items: [{ productId: a.id, quantity: 2 }] }); // RM 25.00
    const move = (id: string, ...statuses: string[]) =>
      statuses.reduce(
        (p, status) => p.then(() => api(app).patch(`/orders/${id}/status`).set(bearer(t.staff)).send({ status }).expect(200)),
        Promise.resolve() as Promise<unknown>,
      );
    const pay = (orderId: string, amount: number) =>
      api(app).post('/payments').set(bearer(t.staff)).send({ orderId, amount, method: 'CASH' }).expect(201);

    await newOrder(); // o1: PENDING, unpaid
    const o2 = await newOrder(); // o2: delivered, paid
    await move(o2.id, 'CONFIRMED', 'PACKING', 'READY', 'DELIVERED');
    await pay(o2.id, 25);
    const o3 = await newOrder(); // o3: confirmed, partially paid
    await move(o3.id, 'CONFIRMED');
    await pay(o3.id, 10);
    const o4 = await newOrder(); // o4: cancelled, ignored everywhere
    await move(o4.id, 'CANCELLED');
    const o5 = await newOrder(); // o5: yesterday, PENDING, unpaid
    await prismaOf(app).order.update({
      where: { id: o5.id },
      data: { createdAt: new Date(Date.now() - 2 * 86_400_000) },
    });

    const res = await api(app).get('/dashboard/summary').set(bearer(t.staff)).expect(200);
    expect(res.body).toEqual({
      todayOrders: 3,
      todaySales: '75.00',
      unpaidOrders: 3,
      outstandingAmount: '65.00',
      pendingOrders: 2,
      awaitingFulfilment: 1,
      lowStockProducts: 1,
      completedOrders: 1,
    });
  });

  it('returns zeros on an empty database', async () => {
    const res = await api(app).get('/dashboard/summary').set(bearer(t.staff)).expect(200);
    expect(res.body).toMatchObject({ todayOrders: 0, todaySales: '0.00', outstandingAmount: '0.00' });
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm run test:e2e -- dashboard`
Expected: FAIL. 404.

- [ ] **Step 3: Implement**

`backend/src/dashboard/dashboard.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { money } from '../common/money.js';
import { startOfBusinessDay } from '../common/time.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

const live = { status: { not: 'CANCELLED' } } satisfies Prisma.OrderWhereInput;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(now = new Date()) {
    const [today, unpaid, pendingOrders, awaitingFulfilment, completedOrders, lowStockProducts] = await Promise.all([
      this.prisma.order.aggregate({
        where: { ...live, createdAt: { gte: startOfBusinessDay(now) } },
        _count: true,
        _sum: { total: true },
      }),
      this.prisma.order.aggregate({
        where: { ...live, paymentStatus: { not: 'PAID' } },
        _count: true,
        _sum: { total: true, paidAmount: true },
      }),
      this.prisma.order.count({ where: { status: 'PENDING' } }),
      this.prisma.order.count({ where: { status: { in: ['CONFIRMED', 'PACKING', 'READY'] } } }),
      this.prisma.order.count({ where: { status: 'DELIVERED' } }),
      this.prisma.product.count({
        where: { isActive: true, stockQuantity: { lte: this.prisma.product.fields.lowStockThreshold } },
      }),
    ]);
    return {
      todayOrders: today._count,
      todaySales: money(today._sum.total ?? 0),
      unpaidOrders: unpaid._count,
      outstandingAmount: money(unpaid._sum.total ?? 0).sub(unpaid._sum.paidAmount ?? 0),
      pendingOrders,
      awaitingFulfilment,
      lowStockProducts,
      completedOrders,
    };
  }
}
```

`backend/src/dashboard/dashboard.controller.ts`:

```ts
import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  summary() {
    return this.dashboard.summary();
  }
}
```

`backend/src/dashboard/dashboard.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

@Module({ controllers: [DashboardController], providers: [DashboardService] })
export class DashboardModule {}
```

Add `DashboardModule` to `AppModule.imports`.

- [ ] **Step 4: Run the tests to see them pass**

Run: `npm run test:e2e && npm run lint && npm run build`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src test
git commit -m "feat(dashboard): operational attention summary

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Seed data, Swagger, README, clean-machine verification

**Files:**
- Create: `backend/src/seed.ts`
- Modify: `backend/src/main.ts`, `backend/nest-cli.json`, `README.md`, `CLAUDE.md` (implemented-features table)

**Interfaces:**
- Consumes: `AuthService.register`, `UsersService.create`, `CustomersService.create`, `ProductsService.create`, `OrdersService.create` / `changeStatus`, `PaymentsService.record`, `InventoryService`, `PrismaService`.
- Produces: `npm run seed`, Swagger UI at `/docs` (JSON at `/docs-json`).

- [ ] **Step 1: Write the seed script**

`backend/src/seed.ts`:

```ts
import './common/money.js';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { AuthService } from './auth/auth.service.js';
import { CustomersService } from './customers/customers.service.js';
import { OrdersService } from './orders/orders.service.js';
import { PaymentsService } from './payments/payments.service.js';
import { PrismaService } from './prisma/prisma.service.js';
import { ProductsService } from './products/products.service.js';
import { UsersService } from './users/users.service.js';

// Dev-only demo data, created through the services so every business rule and ledger row applies.
const PRODUCTS = [
  { name: '100Plus Original 24 x 325ml', sku: '100PLUS-24', sellingPrice: 38.9, costPrice: 31.5, stockQuantity: 40, lowStockThreshold: 10 },
  { name: 'Coca-Cola 24 x 320ml', sku: 'COKE-24', sellingPrice: 36.5, costPrice: 29.8, stockQuantity: 35, lowStockThreshold: 10 },
  { name: 'Milo 3in1 Activ-Go 18 x 33g', sku: 'MILO-18', sellingPrice: 17.9, costPrice: 14.2, stockQuantity: 6, lowStockThreshold: 8 },
  { name: 'Maggi Kari 5 x 79g', sku: 'MAGGI-KARI-5', sellingPrice: 6.8, costPrice: 5.1, stockQuantity: 120, lowStockThreshold: 30 },
  { name: 'Gardenia Original Classic 600g', sku: 'GARDENIA-600', sellingPrice: 4.3, costPrice: 3.4, stockQuantity: 25, lowStockThreshold: 10 },
  { name: 'Beras Wangi Jasmine 10kg', sku: 'BERAS-JAS-10', sellingPrice: 34.9, costPrice: 29.0, stockQuantity: 18, lowStockThreshold: 5 },
  { name: 'Minyak Masak Buruh 5kg', sku: 'BURUH-5KG', sellingPrice: 32.5, costPrice: 27.9, stockQuantity: 4, lowStockThreshold: 6 },
  { name: 'Gula Prai 1kg', sku: 'GULA-PRAI-1', sellingPrice: 3.1, costPrice: 2.7, stockQuantity: 80, lowStockThreshold: 20 },
  { name: 'Teh Boh 100 uncang', sku: 'BOH-100', sellingPrice: 12.9, costPrice: 10.2, stockQuantity: 30, lowStockThreshold: 10 },
  { name: 'Nescafe Classic 200g', sku: 'NESCAFE-200', sellingPrice: 24.9, costPrice: 20.5, stockQuantity: 12, lowStockThreshold: 5 },
  { name: 'Dutch Lady UHT Full Cream 12 x 1L', sku: 'DL-UHT-12', sellingPrice: 79.0, costPrice: 68.0, stockQuantity: 9, lowStockThreshold: 4 },
  { name: 'Spritzer Mineral Water 12 x 1.5L', sku: 'SPRITZER-12', sellingPrice: 16.5, costPrice: 12.9, stockQuantity: 50, lowStockThreshold: 15 },
  { name: 'Tepung Gandum Cap Sauh 1kg', sku: 'TEPUNG-SAUH-1', sellingPrice: 2.9, costPrice: 2.3, stockQuantity: 2, lowStockThreshold: 10 },
  { name: 'Kicap Manis Kipas Udang 345ml', sku: 'KICAP-KIPAS', sellingPrice: 4.6, costPrice: 3.6, stockQuantity: 40, lowStockThreshold: 10 },
  { name: 'Sardin Ayam Brand 425g', sku: 'SARDIN-AB-425', sellingPrice: 9.9, costPrice: 7.9, stockQuantity: 60, lowStockThreshold: 15 },
];

const CUSTOMERS = [
  { name: 'Kedai Runcit Ali', phone: '+60123456789', address: 'Jalan Pasar, Ipoh' },
  { name: 'Mini Market Mei Ling', phone: '+60198887777', email: 'meiling@minimart.my' },
  { name: 'Restoran Nasi Kandar Salim', phone: '+60134445555', address: 'Lebuh Chulia, George Town' },
  { name: 'Syarikat Tan Bros Trading', phone: '+60167778888', email: 'order@tanbros.my' },
  { name: 'Kafe Kopi Kampung', phone: '+60112223333' },
  { name: 'Pasar Mini Siti', phone: '+60145556666', notes: 'Pays on Fridays' },
  { name: 'Kedai Makan Raju', phone: '+60179990000' },
  { name: 'Koperasi Sekolah SMK Taman Jaya', phone: '+60351234567', email: 'koperasi@smktj.edu.my' },
];

const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
try {
  const prisma = app.get(PrismaService);
  if ((await prisma.user.count()) > 0) {
    console.log('Users already exist; skipping seed.');
  } else {
    const { user: admin } = await app
      .get(AuthService)
      .register({ name: 'Demo Admin', email: 'admin@orderflow.local', password: 'Admin123!' });
    const staff = await app
      .get(UsersService)
      .create({ name: 'Demo Staff', email: 'staff@orderflow.local', password: 'Staff123!', role: 'STAFF' });

    const products: { id: string }[] = [];
    for (const p of PRODUCTS) products.push(await app.get(ProductsService).create(p, admin.id));
    const customers: { id: string }[] = [];
    for (const c of CUSTOMERS) customers.push(await app.get(CustomersService).create(c));

    const orders = app.get(OrdersService);
    const payments = app.get(PaymentsService);
    const item = (i: number, quantity: number) => ({ productId: products[i].id, quantity });
    const place = (c: number, items: { productId: string; quantity: number }[], discount = 0) =>
      orders.create({ customerId: customers[c].id, items, discount }, staff.id);
    const advance = async (id: string, ...statuses: ('CONFIRMED' | 'PACKING' | 'READY' | 'DELIVERED' | 'CANCELLED')[]) => {
      for (const s of statuses) await orders.changeStatus(id, s, staff.id);
    };

    const o1 = await place(0, [item(0, 3), item(1, 2)]);
    await advance(o1.id, 'CONFIRMED', 'PACKING', 'READY', 'DELIVERED');
    await payments.record({ orderId: o1.id, amount: Number(o1.total), method: 'BANK_TRANSFER', reference: 'MBB-88121' }, staff.id);

    const o2 = await place(1, [item(3, 20), item(7, 10)], 5);
    await advance(o2.id, 'CONFIRMED', 'PACKING');
    await payments.record({ orderId: o2.id, amount: 50, method: 'CASH' }, staff.id);

    const o3 = await place(2, [item(5, 4), item(6, 2), item(13, 6)]);
    await advance(o3.id, 'CONFIRMED', 'PACKING', 'READY', 'DELIVERED'); // delivered, unpaid

    await place(3, [item(0, 5), item(11, 5)]); // pending
    const o5 = await place(4, [item(8, 2), item(9, 1)]);
    await advance(o5.id, 'CANCELLED');
    await place(5, [item(2, 4), item(4, 6)]); // pending
    const o7 = await place(7, [item(10, 2), item(14, 12)], 10);
    await advance(o7.id, 'CONFIRMED');
    await payments.record({ orderId: o7.id, amount: 100, method: 'BANK_TRANSFER', reference: 'CIMB-5512' }, staff.id);

    console.log('Seeded demo data. Log in with admin@orderflow.local / Admin123! or staff@orderflow.local / Staff123!');
  }
} finally {
  await app.close();
}
```

- [ ] **Step 2: Run the seed against the dev database**

```bash
docker compose up -d postgres
npx prisma migrate deploy
npm run seed
npm run seed
```

Expected: the first run prints "Seeded demo data…". The second prints "Users already exist; skipping seed."

- [ ] **Step 3: Add Swagger**

`backend/nest-cli.json` (add the plugin so DTOs are documented automatically):

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "plugins": ["@nestjs/swagger"]
  }
}
```

Replace `backend/src/main.ts`:

```ts
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';

const app = await NestFactory.create(AppModule);
configureApp(app);

const openApi = new DocumentBuilder()
  .setTitle('OrderFlow API')
  .setDescription('Order-to-payment tracking for Malaysian SMEs')
  .setVersion('0.1.0')
  .addBearerAuth()
  .addSecurityRequirements('bearer')
  .build();
SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, openApi));

await app.listen(app.get(ConfigService).get<number>('PORT') ?? 4000);
```

- [ ] **Step 4: Verify Swagger**

```bash
npm run build && (npm run start:prod &) && sleep 5
curl -s localhost:4000/docs-json | node -e "const d=JSON.parse(require('fs').readFileSync(0));console.log(Object.keys(d.paths).length, Object.keys(d.components.schemas).includes('CreateOrderDto'))"
```

Expected: 20 or more paths, and `true`. Then stop the server.

- [ ] **Step 5: Replace `README.md`** (read the current one first; it holds only the repo title)

````markdown
# OrderFlow

Order-to-payment tracking for Malaysian SMEs that take orders over WhatsApp and the phone. It keeps orders, stock, payments and fulfilment in one place. It is not a POS and not accounting.

See the [product brief](OrderFlow_Malaysian_SME_MVP.md) and the [backend design spec](docs/superpowers/specs/2026-09-29-orderflow-backend-foundation-design.md).

## Quick start

```bash
docker compose up --build
```

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
| `npm run test:e2e` | API tests against the `orderflow_test` database (wiped on each run) |
| `npm run lint` / `npm run build` | oxlint / compile |
| `npm run db:migrate` | Create and apply a migration in development |

## How the tricky parts work

- **No overselling:** confirming an order runs `UPDATE products SET stock = stock - q WHERE stock >= q` per item inside one transaction. Zero rows updated means insufficient stock, and everything rolls back. A `CHECK (stock_quantity >= 0)` constraint backs it up.
- **No double confirmation or restore:** status changes claim the row with `WHERE status = <expected>`. The loser of a race gets a 409.
- **No overpayment:** one guarded `UPDATE orders … WHERE paid_amount + amount <= total`, backed by a CHECK constraint.
- **Audit trail:** every stock change writes an `inventory_transactions` row in the same transaction.
````

- [ ] **Step 6: Update `CLAUDE.md` implemented features**

Replace the table body with:

```markdown
| `init` | Core schema: users, customers, products, orders, order items, payments, inventory ledger |
| — | Auth (first-user ADMIN, JWT), users, customers, products, inventory adjustments, orders + lifecycle, payments, dashboard, seed, Swagger |
```

- [ ] **Step 7: Full verification from a clean state**

```bash
cd backend && npm run lint && npm run typecheck && npm run build && npm test && npm run test:e2e
cd .. && docker compose down -v && docker compose up -d --build
sleep 30 && curl -s localhost:4000/health
curl -s -X POST localhost:4000/auth/register -H 'content-type: application/json' \
  -d '{"name":"Owner","email":"owner@shop.my","password":"Password123!"}' | head -c 200
docker compose exec backend npm run seed
```

Expected: every command succeeds. Health returns `{"status":"ok"}`. Register returns an `accessToken` and `"role":"ADMIN"`. Seed prints "Users already exist; skipping seed." (the register call created a user).

- [ ] **Step 8: Commit**

```bash
git add backend/src/seed.ts backend/src/main.ts backend/nest-cli.json README.md CLAUDE.md
git commit -m "feat: demo seed, Swagger docs, README quick start

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

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

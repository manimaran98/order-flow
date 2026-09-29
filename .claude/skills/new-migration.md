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

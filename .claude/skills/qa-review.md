# Skill: QA Review (OrderFlow backend)

Report each finding as `[SEVERITY] file:line — description — suggested fix`. End with **PASS** or **FAIL** + must-fix list.

## Security
- [ ] Every route is authenticated unless marked `@Public()` on purpose
- [ ] Admin-only routes carry `@Roles('ADMIN')` and have a STAFF-403 test
- [ ] No `passwordHash` in any response (use `publicUserSelect`)
- [ ] Raw SQL uses tagged templates (`$queryRaw`), never string concatenation of input

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

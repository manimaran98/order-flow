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

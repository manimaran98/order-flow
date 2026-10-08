-- Why: list-page search uses Prisma `contains` (+ mode: 'insensitive'), i.e. ILIKE/LIKE '%term%'.
-- A leading wildcard rules out btree indexes, so customer search and order search read every row.
-- Trigram GIN indexes serve substring matches of 3+ characters. Every index below is declared in
-- schema.prisma (postgresqlExtensions preview + `ops: raw("gin_trgm_ops")`), so there is no drift;
-- the only hand edit is IF NOT EXISTS, to keep the file re-runnable. Additive only.
-- Before/after plans: docs/perf/query-optimisation.md.
--
-- Plain CREATE INDEX (Prisma runs a migration in a transaction, which rules out CONCURRENTLY) blocks
-- writes to the table while it builds: well under a second at 20k customers / 200k orders. On a much
-- larger table, run the same statements with CONCURRENTLY by hand first; IF NOT EXISTS then makes
-- this migration a no-op.

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateIndex
CREATE INDEX IF NOT EXISTS "customers_name_trgm_idx" ON "customers" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "customers_phone_trgm_idx" ON "customers" USING GIN ("phone" gin_trgm_ops);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "customers_email_trgm_idx" ON "customers" USING GIN ("email" gin_trgm_ops);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "orders_order_number_trgm_idx" ON "orders" USING GIN ("order_number" gin_trgm_ops);

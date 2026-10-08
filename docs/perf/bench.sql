-- OrderFlow hot-query benchmark.
--
-- Every statement below is the SQL Prisma 7.10 generated for the service call named in its label,
-- captured with `log: [{ emit: 'event', level: 'query' }]` while calling the real compiled services
-- against orderflow_perf (see query-optimisation.md, "Capturing the SQL"). Two edits only:
--   * bind parameters are inlined as literals (Prisma sends $1..$n; with the default
--     plan_cache_mode=auto the first executions get custom plans, which is what literals give);
--   * long full-row select lists are written as `t.*` (same columns; Prisma adds ::text casts on
--     enum columns, which do not change the plan). COUNT sub-selects are verbatim.
--
-- For each query it prints one EXPLAIN (ANALYZE, BUFFERS) plan after a warm-up run, then the
-- median execution time of 9 runs (server-side "Execution Time", so no network or client cost).
--
-- Usage (from the repo root):
--   docker compose exec -T postgres psql -U orderflow -d orderflow_perf -X -q < docs/perf/bench.sql > docs/perf/results/after.txt

\pset pager off
\pset tuples_only on
\pset format unaligned
-- No query here reaches jit_above_cost; turned off anyway so JIT compile time can never skew a run.
SET jit = off;

CREATE FUNCTION pg_temp.bench(q text, n int DEFAULT 9) RETURNS numeric LANGUAGE plpgsql AS $$
DECLARE
  j json;
  times numeric[] := '{}';
BEGIN
  EXECUTE 'EXPLAIN (ANALYZE, FORMAT JSON) ' || q INTO j;  -- warm-up
  FOR i IN 1..n LOOP
    EXECUTE 'EXPLAIN (ANALYZE, FORMAT JSON) ' || q INTO j;
    times := times || (j->0->>'Execution Time')::numeric;
  END LOOP;
  RETURN (SELECT round(percentile_cont(0.5) WITHIN GROUP (ORDER BY t)::numeric, 3) FROM unnest(times) t);
END $$;

CREATE FUNCTION pg_temp.run(label text, q text) RETURNS SETOF text LANGUAGE plpgsql AS $$
DECLARE
  line text;
  med numeric;
BEGIN
  med := pg_temp.bench(q);
  RETURN NEXT '';
  RETURN NEXT '### ' || label || '  | median ' || med || ' ms';
  FOR line IN EXECUTE 'EXPLAIN (ANALYZE, BUFFERS) ' || q LOOP
    RETURN NEXT line;
  END LOOP;
END $$;

-- Fixed ids (md5-derived in seed-perf.sql, identical on every load):
--   heaviest customer (1,400+ orders) 0186d86f-d865-e372-056b-57eab3d5ae64
--   order ORD-…-150000                 6f956e1e-4f96-8e7f-b0b5-69353a541164
--   product #1000                      c984e09c-331f-836a-dcf4-d9ae0353d1bb

-- ============================================================ orders list (GET /orders)
SELECT pg_temp.run('O1 orders.list page 1, no filter: rows',
$q$SELECT o.* FROM "public"."orders" o WHERE 1=1 ORDER BY o."created_at" DESC LIMIT 20 OFFSET 0$q$);
SELECT pg_temp.run('O1c orders.list page 1, no filter: count',
$q$SELECT COUNT(*) AS "_count$_all" FROM (SELECT "public"."orders"."id" FROM "public"."orders" WHERE 1=1 OFFSET 0) AS "sub"$q$);

SELECT pg_temp.run('O2 orders.list status=PENDING: rows',
$q$SELECT o.* FROM "public"."orders" o WHERE o."status" IN (CAST('PENDING'::text AS "public"."OrderStatus")) ORDER BY o."created_at" DESC LIMIT 20 OFFSET 0$q$);
SELECT pg_temp.run('O2c orders.list status=PENDING: count',
$q$SELECT COUNT(*) AS "_count$_all" FROM (SELECT "public"."orders"."id" FROM "public"."orders" WHERE "public"."orders"."status" IN (CAST('PENDING'::text AS "public"."OrderStatus")) OFFSET 0) AS "sub"$q$);

SELECT pg_temp.run('O3 orders.list paymentStatus=UNPAID,PARTIAL: rows',
$q$SELECT o.* FROM "public"."orders" o WHERE o."payment_status" IN (CAST('UNPAID'::text AS "public"."PaymentStatus"),CAST('PARTIAL'::text AS "public"."PaymentStatus")) ORDER BY o."created_at" DESC LIMIT 20 OFFSET 0$q$);
SELECT pg_temp.run('O3c orders.list paymentStatus=UNPAID,PARTIAL: count',
$q$SELECT COUNT(*) AS "_count$_all" FROM (SELECT "public"."orders"."id" FROM "public"."orders" WHERE "public"."orders"."payment_status" IN (CAST('UNPAID'::text AS "public"."PaymentStatus"),CAST('PARTIAL'::text AS "public"."PaymentStatus")) OFFSET 0) AS "sub"$q$);

-- search = order number OR customer name, case-insensitive substring
SELECT pg_temp.run('O4 orders.list search="siew" (common name, 7k orders): rows',
$q$SELECT o.* FROM "public"."orders" o LEFT JOIN "public"."customers" AS "j0" ON ("j0"."id") = (o."customer_id") WHERE (o."order_number" ILIKE ('%' || 'siew' || '%') OR ("j0"."name" ILIKE ('%' || 'siew' || '%') AND ("j0"."id" IS NOT NULL))) ORDER BY o."created_at" DESC LIMIT 20 OFFSET 0$q$);
SELECT pg_temp.run('O4c orders.list search="siew": count',
$q$SELECT COUNT(*) AS "_count$_all" FROM (SELECT "public"."orders"."id" FROM "public"."orders" LEFT JOIN "public"."customers" AS "j0" ON ("j0"."id") = ("public"."orders"."customer_id") WHERE ("public"."orders"."order_number" ILIKE ('%' || 'siew' || '%') OR ("j0"."name" ILIKE ('%' || 'siew' || '%') AND ("j0"."id" IS NOT NULL))) OFFSET 0) AS "sub"$q$);

SELECT pg_temp.run('O5 orders.list search="kavitha a/l pillai" (rare name, 322 orders): rows',
$q$SELECT o.* FROM "public"."orders" o LEFT JOIN "public"."customers" AS "j0" ON ("j0"."id") = (o."customer_id") WHERE (o."order_number" ILIKE ('%' || 'kavitha a/l pillai' || '%') OR ("j0"."name" ILIKE ('%' || 'kavitha a/l pillai' || '%') AND ("j0"."id" IS NOT NULL))) ORDER BY o."created_at" DESC LIMIT 20 OFFSET 0$q$);
SELECT pg_temp.run('O5c orders.list search="kavitha a/l pillai": count',
$q$SELECT COUNT(*) AS "_count$_all" FROM (SELECT "public"."orders"."id" FROM "public"."orders" LEFT JOIN "public"."customers" AS "j0" ON ("j0"."id") = ("public"."orders"."customer_id") WHERE ("public"."orders"."order_number" ILIKE ('%' || 'kavitha a/l pillai' || '%') OR ("j0"."name" ILIKE ('%' || 'kavitha a/l pillai' || '%') AND ("j0"."id" IS NOT NULL))) OFFSET 0) AS "sub"$q$);

SELECT pg_temp.run('O6 orders.list search="150123" (one order by number): rows',
$q$SELECT o.* FROM "public"."orders" o LEFT JOIN "public"."customers" AS "j0" ON ("j0"."id") = (o."customer_id") WHERE (o."order_number" ILIKE ('%' || '150123' || '%') OR ("j0"."name" ILIKE ('%' || '150123' || '%') AND ("j0"."id" IS NOT NULL))) ORDER BY o."created_at" DESC LIMIT 20 OFFSET 0$q$);
SELECT pg_temp.run('O6c orders.list search="150123": count',
$q$SELECT COUNT(*) AS "_count$_all" FROM (SELECT "public"."orders"."id" FROM "public"."orders" LEFT JOIN "public"."customers" AS "j0" ON ("j0"."id") = ("public"."orders"."customer_id") WHERE ("public"."orders"."order_number" ILIKE ('%' || '150123' || '%') OR ("j0"."name" ILIKE ('%' || '150123' || '%') AND ("j0"."id" IS NOT NULL))) OFFSET 0) AS "sub"$q$);

-- ============================================================ customers (GET /customers, GET /customers/:id)
SELECT pg_temp.run('C1 customers.list page 1, no search: rows',
$q$SELECT c.* FROM "public"."customers" c WHERE c."deleted_at" IS NULL ORDER BY c."name" ASC LIMIT 20 OFFSET 0$q$);
SELECT pg_temp.run('C1c customers.list no search: count',
$q$SELECT COUNT(*) AS "_count$_all" FROM (SELECT "public"."customers"."id" FROM "public"."customers" WHERE "public"."customers"."deleted_at" IS NULL OFFSET 0) AS "sub"$q$);

SELECT pg_temp.run('C2 customers.list search="lim" (common): rows',
$q$SELECT c.* FROM "public"."customers" c WHERE (c."deleted_at" IS NULL AND (c."name" ILIKE ('%' || 'lim' || '%') OR c."phone"::text LIKE ('%' || 'lim' || '%') OR c."email" ILIKE ('%' || 'lim' || '%'))) ORDER BY c."name" ASC LIMIT 20 OFFSET 0$q$);
SELECT pg_temp.run('C2c customers.list search="lim": count',
$q$SELECT COUNT(*) AS "_count$_all" FROM (SELECT "public"."customers"."id" FROM "public"."customers" WHERE ("public"."customers"."deleted_at" IS NULL AND ("public"."customers"."name" ILIKE ('%' || 'lim' || '%') OR "public"."customers"."phone"::text LIKE ('%' || 'lim' || '%') OR "public"."customers"."email" ILIKE ('%' || 'lim' || '%'))) OFFSET 0) AS "sub"$q$);

SELECT pg_temp.run('C3 customers.list search="kavitha a/l pillai" (rare): rows',
$q$SELECT c.* FROM "public"."customers" c WHERE (c."deleted_at" IS NULL AND (c."name" ILIKE ('%' || 'kavitha a/l pillai' || '%') OR c."phone"::text LIKE ('%' || 'kavitha a/l pillai' || '%') OR c."email" ILIKE ('%' || 'kavitha a/l pillai' || '%'))) ORDER BY c."name" ASC LIMIT 20 OFFSET 0$q$);
SELECT pg_temp.run('C3c customers.list search="kavitha a/l pillai": count',
$q$SELECT COUNT(*) AS "_count$_all" FROM (SELECT "public"."customers"."id" FROM "public"."customers" WHERE ("public"."customers"."deleted_at" IS NULL AND ("public"."customers"."name" ILIKE ('%' || 'kavitha a/l pillai' || '%') OR "public"."customers"."phone"::text LIKE ('%' || 'kavitha a/l pillai' || '%') OR "public"."customers"."email" ILIKE ('%' || 'kavitha a/l pillai' || '%'))) OFFSET 0) AS "sub"$q$);

SELECT pg_temp.run('C4 customers.list search="7712" (phone digits): rows',
$q$SELECT c.* FROM "public"."customers" c WHERE (c."deleted_at" IS NULL AND (c."name" ILIKE ('%' || '7712' || '%') OR c."phone"::text LIKE ('%' || '7712' || '%') OR c."email" ILIKE ('%' || '7712' || '%'))) ORDER BY c."name" ASC LIMIT 20 OFFSET 0$q$);
SELECT pg_temp.run('C4c customers.list search="7712": count',
$q$SELECT COUNT(*) AS "_count$_all" FROM (SELECT "public"."customers"."id" FROM "public"."customers" WHERE ("public"."customers"."deleted_at" IS NULL AND ("public"."customers"."name" ILIKE ('%' || '7712' || '%') OR "public"."customers"."phone"::text LIKE ('%' || '7712' || '%') OR "public"."customers"."email" ILIKE ('%' || '7712' || '%'))) OFFSET 0) AS "sub"$q$);

SELECT pg_temp.run('C5 customers.findOne recent orders (include orders take 20; Prisma sends no LIMIT)',
$q$SELECT o."id", o."order_number", o."status"::text, o."payment_status"::text, o."total", o."paid_amount", o."created_at", o."customer_id" FROM "public"."orders" o WHERE o."customer_id" IN ('0186d86f-d865-e372-056b-57eab3d5ae64') ORDER BY o."created_at" DESC OFFSET 0$q$);
SELECT pg_temp.run('C6 customers.orders page 1: rows',
$q$SELECT o."id", o."order_number", o."status"::text, o."payment_status"::text, o."total", o."paid_amount", o."created_at" FROM "public"."orders" o WHERE o."customer_id" = '0186d86f-d865-e372-056b-57eab3d5ae64' ORDER BY o."created_at" DESC LIMIT 20 OFFSET 0$q$);
SELECT pg_temp.run('C6c customers.orders: count',
$q$SELECT COUNT(*) AS "_count$_all" FROM (SELECT "public"."orders"."id" FROM "public"."orders" WHERE "public"."orders"."customer_id" = '0186d86f-d865-e372-056b-57eab3d5ae64' OFFSET 0) AS "sub"$q$);

-- ============================================================ products (GET /products)
SELECT pg_temp.run('P1 products.list search="rendang": rows',
$q$SELECT p.* FROM "public"."products" p WHERE (p."name" ILIKE ('%' || 'rendang' || '%') OR p."sku" ILIKE ('%' || 'rendang' || '%')) ORDER BY p."name" ASC LIMIT 20 OFFSET 0$q$);
SELECT pg_temp.run('P1c products.list search="rendang": count',
$q$SELECT COUNT(*) AS "_count$_all" FROM (SELECT "public"."products"."id" FROM "public"."products" WHERE ("public"."products"."name" ILIKE ('%' || 'rendang' || '%') OR "public"."products"."sku" ILIKE ('%' || 'rendang' || '%')) OFFSET 0) AS "sub"$q$);

-- ============================================================ order detail (GET /orders/:id)
SELECT pg_temp.run('OD1 orders.findOne: order row',
$q$SELECT o.* FROM "public"."orders" o WHERE (o."id" = '6f956e1e-4f96-8e7f-b0b5-69353a541164' AND 1=1) LIMIT 1 OFFSET 0$q$);
SELECT pg_temp.run('OD2 orders.findOne: items',
$q$SELECT i.* FROM "public"."order_items" i WHERE i."order_id" = '6f956e1e-4f96-8e7f-b0b5-69353a541164' ORDER BY i."id" ASC OFFSET 0$q$);
SELECT pg_temp.run('OD3 orders.findOne: payments',
$q$SELECT p.* FROM "public"."payments" p WHERE p."order_id" = '6f956e1e-4f96-8e7f-b0b5-69353a541164' ORDER BY p."paid_at" ASC OFFSET 0$q$);

-- ============================================================ dashboard (GET /dashboard/summary, 6 queries in parallel)
SELECT pg_temp.run('D1 dashboard today (live orders since KL midnight)',
$q$SELECT COUNT(*) AS "_count$_all", SUM("total") AS "_sum$total" FROM (SELECT "public"."orders"."id", "public"."orders"."total" FROM "public"."orders" WHERE ("public"."orders"."status" <> CAST('CANCELLED'::text AS "public"."OrderStatus") AND "public"."orders"."created_at" >= (date_trunc('day', now() AT TIME ZONE 'Asia/Kuala_Lumpur') AT TIME ZONE 'Asia/Kuala_Lumpur')) OFFSET 0) AS "sub"$q$);
SELECT pg_temp.run('D2 dashboard unpaid (live orders not PAID: count, sum total, sum paid)',
$q$SELECT COUNT(*) AS "_count$_all", SUM("total") AS "_sum$total", SUM("paid_amount") AS "_sum$paid_amount" FROM (SELECT "public"."orders"."id", "public"."orders"."total", "public"."orders"."paid_amount" FROM "public"."orders" WHERE ("public"."orders"."status" <> CAST('CANCELLED'::text AS "public"."OrderStatus") AND "public"."orders"."payment_status" <> CAST('PAID'::text AS "public"."PaymentStatus")) OFFSET 0) AS "sub"$q$);
SELECT pg_temp.run('D3 dashboard pendingOrders',
$q$SELECT COUNT(*) AS "_count$_all" FROM (SELECT "public"."orders"."id" FROM "public"."orders" WHERE "public"."orders"."status" = CAST('PENDING'::text AS "public"."OrderStatus") OFFSET 0) AS "sub"$q$);
SELECT pg_temp.run('D4 dashboard awaitingFulfilment',
$q$SELECT COUNT(*) AS "_count$_all" FROM (SELECT "public"."orders"."id" FROM "public"."orders" WHERE "public"."orders"."status" IN (CAST('CONFIRMED'::text AS "public"."OrderStatus"),CAST('PACKING'::text AS "public"."OrderStatus"),CAST('READY'::text AS "public"."OrderStatus")) OFFSET 0) AS "sub"$q$);
SELECT pg_temp.run('D5 dashboard completedOrders (DELIVERED, ~170k rows)',
$q$SELECT COUNT(*) AS "_count$_all" FROM (SELECT "public"."orders"."id" FROM "public"."orders" WHERE "public"."orders"."status" = CAST('DELIVERED'::text AS "public"."OrderStatus") OFFSET 0) AS "sub"$q$);
SELECT pg_temp.run('D6 dashboard lowStockProducts',
$q$SELECT COUNT(*) AS "_count$_all" FROM (SELECT "public"."products"."id" FROM "public"."products" WHERE ("public"."products"."is_active" = true AND "public"."products"."stock_quantity" <= "public"."products"."low_stock_threshold") OFFSET 0) AS "sub"$q$);

-- ============================================================ payments, inventory
SELECT pg_temp.run('PAY1 payments.list page 1: rows',
$q$SELECT p.* FROM "public"."payments" p WHERE 1=1 ORDER BY p."paid_at" DESC LIMIT 20 OFFSET 0$q$);
SELECT pg_temp.run('PAY1c payments.list: count',
$q$SELECT COUNT(*) AS "_count$_all" FROM (SELECT "public"."payments"."id" FROM "public"."payments" WHERE 1=1 OFFSET 0) AS "sub"$q$);
SELECT pg_temp.run('INV1 inventory.ledger page 1: rows',
$q$SELECT t.* FROM "public"."inventory_transactions" t WHERE t."product_id" = 'c984e09c-331f-836a-dcf4-d9ae0353d1bb' ORDER BY t."created_at" DESC, t."id" DESC LIMIT 20 OFFSET 0$q$);
SELECT pg_temp.run('INV1c inventory.ledger: count',
$q$SELECT COUNT(*) AS "_count$_all" FROM (SELECT "public"."inventory_transactions"."id" FROM "public"."inventory_transactions" WHERE "public"."inventory_transactions"."product_id" = 'c984e09c-331f-836a-dcf4-d9ae0353d1bb' OFFSET 0) AS "sub"$q$);
SELECT pg_temp.run('INV2 inventory.lowStock',
$q$SELECT p."id", p."name", p."sku", p."stock_quantity", p."low_stock_threshold", p."is_active" FROM "public"."products" p WHERE (p."is_active" = true AND p."stock_quantity" <= p."low_stock_threshold") ORDER BY p."stock_quantity" ASC OFFSET 0$q$);

-- ============================================================ rewritten queries (shipped with the indexes)
-- orders.list search now runs (1) a customer-name lookup capped at 1,001 ids, then (2) the list and
-- count with `customer_id IN (<ids>)` instead of the LEFT JOIN, or `OR 1=0` when no customer matches.
-- More than 1,000 matching customers falls back to the LEFT JOIN form (O7 measures that case).
-- The IN lists are built here from the same lookup Prisma runs, so the statement text matches.
CREATE FUNCTION pg_temp.ids(term text) RETURNS text LANGUAGE sql AS $$
  SELECT coalesce(string_agg(quote_literal(id::text), ',' ORDER BY id), '')
  FROM (SELECT id FROM customers WHERE name ILIKE '%' || term || '%' ORDER BY id LIMIT 1001) c
$$;
CREATE FUNCTION pg_temp.orders_search(term text, count_only boolean) RETURNS text LANGUAGE sql AS $$
  SELECT CASE WHEN count_only
    THEN 'SELECT COUNT(*) AS "_count$_all" FROM (SELECT "public"."orders"."id" FROM "public"."orders" WHERE ("public"."orders"."order_number" ILIKE (''%'' || ' || quote_literal(term) || ' || ''%'') OR '
         || CASE WHEN pg_temp.ids(term) = '' THEN '1=0' ELSE '"public"."orders"."customer_id" IN (' || pg_temp.ids(term) || ')' END || ') OFFSET 0) AS "sub"'
    ELSE 'SELECT o.* FROM "public"."orders" o WHERE (o."order_number" ILIKE (''%'' || ' || quote_literal(term) || ' || ''%'') OR '
         || CASE WHEN pg_temp.ids(term) = '' THEN '1=0' ELSE 'o."customer_id" IN (' || pg_temp.ids(term) || ')' END || ') ORDER BY o."created_at" DESC LIMIT 20 OFFSET 0'
  END
$$;

SELECT pg_temp.run('R0 orders.list search: customer-name lookup ("siew", 595 ids)',
$q$SELECT "public"."customers"."id" FROM "public"."customers" WHERE "public"."customers"."name" ILIKE ('%' || 'siew' || '%') ORDER BY "public"."customers"."id" ASC LIMIT 1001 OFFSET 0$q$);
SELECT pg_temp.run('R4 orders.list search="siew" rewritten: rows', pg_temp.orders_search('siew', false));
SELECT pg_temp.run('R4c orders.list search="siew" rewritten: count', pg_temp.orders_search('siew', true));
SELECT pg_temp.run('R5 orders.list search="kavitha a/l pillai" rewritten: rows', pg_temp.orders_search('kavitha a/l pillai', false));
SELECT pg_temp.run('R5c orders.list search="kavitha a/l pillai" rewritten: count', pg_temp.orders_search('kavitha a/l pillai', true));
SELECT pg_temp.run('R6 orders.list search="150123" rewritten: rows', pg_temp.orders_search('150123', false));
SELECT pg_temp.run('R6c orders.list search="150123" rewritten: count', pg_temp.orders_search('150123', true));

-- Broad term: "bin" matches more than 1,000 customers, so the service keeps the LEFT JOIN form.
SELECT pg_temp.run('O7 orders.list search="bin" (broad, keeps the join): rows',
$q$SELECT o.* FROM "public"."orders" o LEFT JOIN "public"."customers" AS "j0" ON ("j0"."id") = (o."customer_id") WHERE (o."order_number" ILIKE ('%' || 'bin' || '%') OR ("j0"."name" ILIKE ('%' || 'bin' || '%') AND ("j0"."id" IS NOT NULL))) ORDER BY o."created_at" DESC LIMIT 20 OFFSET 0$q$);
SELECT pg_temp.run('O7c orders.list search="bin" (broad, keeps the join): count',
$q$SELECT COUNT(*) AS "_count$_all" FROM (SELECT "public"."orders"."id" FROM "public"."orders" LEFT JOIN "public"."customers" AS "j0" ON ("j0"."id") = ("public"."orders"."customer_id") WHERE ("public"."orders"."order_number" ILIKE ('%' || 'bin' || '%') OR ("j0"."name" ILIKE ('%' || 'bin' || '%') AND ("j0"."id" IS NOT NULL))) OFFSET 0) AS "sub"$q$);

-- dashboard unpaid: `payment_status IN (UNPAID, PARTIAL)` instead of `<> PAID` (same rows).
SELECT pg_temp.run('R2 dashboard unpaid rewritten (IN instead of <>)',
$q$SELECT COUNT(*) AS "_count$_all", SUM("total") AS "_sum$total", SUM("paid_amount") AS "_sum$paid_amount" FROM (SELECT "public"."orders"."id", "public"."orders"."total", "public"."orders"."paid_amount" FROM "public"."orders" WHERE ("public"."orders"."status" <> CAST('CANCELLED'::text AS "public"."OrderStatus") AND "public"."orders"."payment_status" IN (CAST('UNPAID'::text AS "public"."PaymentStatus"),CAST('PARTIAL'::text AS "public"."PaymentStatus"))) OFFSET 0) AS "sub"$q$);

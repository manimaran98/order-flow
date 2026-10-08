# OrderFlow query optimisation: PostgreSQL 16, Prisma 7.10

This note records how I found the slow queries behind OrderFlow's list pages and dashboard, loaded realistic data, measured each query with `EXPLAIN (ANALYZE, BUFFERS)`, changed what the measurements showed was worth changing, and measured again on the same data. Every number below comes from the raw output in [`results/before.txt`](results/before.txt) and [`results/after.txt`](results/after.txt), and you can reproduce all of it with the commands at the end.

## Summary

| Screen / query | Before | After | Change |
|---|---:|---:|---|
| Orders search, common name `siew`: rows + count | 0.60 + 151.8 ms | 0.50 lookup + 0.19 + 3.1 ms | Rewrite + trigram index on `orders.order_number` |
| Orders search, rare name `kavitha a/l pillai`: rows + count | 76.6 + 69.8 ms | 0.23 + 0.21 ms (+ lookup) | same |
| Orders search, order number `150123`: rows + count | 64.0 + 65.7 ms | 0.27 + 0.24 ms (+ lookup) | same |
| Customers search, rare name: rows + count | 11.9 + 12.4 ms | 0.36 + 0.39 ms | Trigram indexes on `customers.name/phone/email` |
| Customers search, phone digits `7712`: rows + count | 10.6 + 10.5 ms | 0.07 + 0.05 ms | same |
| Customers search, common `lim`: rows + count | 7.2 + 10.3 ms | 7.5 + 0.36 ms | same (rows query unchanged, see below) |
| Dashboard, unpaid live orders aggregate | 29.5 ms | 8.3 ms | Rewrite only (`IN` instead of `<>`), no new index |

Times are the server-side median "Execution Time" of 9 warm runs. "Lookup" is the new customer-name query that orders search runs first: 0.50 ms for the biggest case (595 matching customers).

What shipped:

- **Migration `20261008034542_add_search_trigram_indexes`**: enables `pg_trgm` and adds 4 GIN trigram indexes. All of it is declared in `schema.prisma`, so there is no drift (proof below).
- **`OrdersService.findAll`**: the customer-name part of the search now runs as a separate lookup, then filters orders with `customer_id IN (...)`. A broad term that matches more than 1,000 customers falls back to the original join. The rows returned are the same either way.
- **`DashboardService.summary`**: the unpaid aggregate filters with `payment_status IN (<every status except PAID>)` instead of `<> 'PAID'`. Same rows, and it can use the existing index.

## Method

1. **Inventory.** I read every service the UI calls (orders, customers, products, payments, inventory, dashboard) and listed what each page runs: list queries (filter + search + `ORDER BY` + `LIMIT/OFFSET`), the `COUNT(*)` that comes with each list, the order and customer detail queries, and the six dashboard aggregates.
2. **Data.** [`seed-perf.sql`](seed-perf.sql) loads a deterministic two-year history (table below) into a database migrated to the `init` schema. It runs in 66 s.
3. **Capturing the SQL.** I ran the real compiled services (`backend/dist`) against `orderflow_perf` through a `PrismaClient` with `log: [{ emit: 'event', level: 'query' }]` and recorded every statement and its parameters. [`bench.sql`](bench.sql) holds those statements with two mechanical edits, documented at the top of the file: bind parameters are inlined as literals, and long full-row select lists are written as `t.*`. Prisma's `COUNT` sub-selects are copied verbatim.
4. **Measuring.** `bench.sql` runs each statement once to warm the cache, then 9 times under `EXPLAIN (ANALYZE, FORMAT JSON)`, keeps the median `Execution Time`, and prints one `EXPLAIN (ANALYZE, BUFFERS)` plan. That is server time only, with no network or Node cost.
5. **Before** = the `init` schema with the data loaded and `VACUUM ANALYZE`d. **After** = the same database after `prisma migrate deploy` applied the new migration, followed by `VACUUM ANALYZE` on the two changed tables. The data is identical in both runs.

Environment: PostgreSQL 16.15 (`postgres:16-alpine`, Docker Desktop on Windows 11), default config (`shared_buffers` 128 MB, `work_mem` 4 MB), JIT off. Absolute times depend on the machine; the before/after ratios and the plan shapes are what matter.

### Data volume

| Table | Rows | Notes |
|---|---:|---|
| customers | 20,000 | Malay / Chinese / Indian name patterns, `01x-xxxxxxxx` phones, 65% with email, 2% soft-deleted |
| products | 2,000 | 94 inactive, 90 at or below their low-stock threshold |
| orders | 200,000 | ~274/day over 730 days. Customer choice is skewed (the top customer has 1,367 orders). 92.3% DELIVERED, 7% CANCELLED, ~1,440 in the live pipeline (PENDING to READY). 85% PAID |
| order_items | 530,243 | 1-5 lines per order |
| payments | 231,237 | 30% of paid orders split into two payments |
| inventory_transactions | 540,220 | A SALE row per confirmed line, plus 24 monthly RESTOCKs per product. Stock equals the ledger sum |

The database is about 370 MB. All CHECK constraints from the init migration hold: the load would fail otherwise.

## Query inventory and baseline

The baseline was fast for most of the app, so most queries needed no change:

| Query (service call) | Plan before | Before |
|---|---|---:|
| `orders.findAll` page 1, no filter | Index Scan Backward `orders_created_at_idx`, LIMIT 20 | 0.016 ms |
| `orders.findAll` `status=PENDING` / `paymentStatus=UNPAID,PARTIAL` | `orders_status_idx` + sort / backward scan of `created_at` | 0.11 / 0.03 ms |
| `orders.findOne` (order, items, payments) | pkey / `order_items_order_id_product_id_key` / `payments_order_id_idx` | 0.02 ms each |
| `customers.orders` page 1 (heaviest customer) | Bitmap `orders_customer_id_idx` + top-N sort | 0.30 ms |
| `payments.findAll` page 1 | Index Scan Backward `payments_paid_at_idx` | 0.016 ms |
| `inventory.ledger` page 1 | `inventory_transactions_product_id_created_at_idx` | 0.035 ms |
| `inventory.lowStock`, dashboard low-stock count | Seq Scan over 2,000 products | 0.14 / 0.10 ms |
| Dashboard today / pending / awaiting fulfilment | `orders_created_at_idx` / `orders_status_idx` | 0.05-0.10 ms |
| `products.findAll` search `rendang` | Seq Scan over 2,000 products | 1.0 + 1.2 ms |
| **`orders.findAll` search** | **Hash Left Join of all orders x all customers, then filter** | **60-152 ms** |
| **`customers.findAll` search** | **Seq Scan of all customers** | **7-12 ms** |
| **Dashboard unpaid aggregate** | **Seq Scan of all orders** | **29.5 ms** |
| Unfiltered list counts (`orders` 13.5 ms, `payments` 16.0 ms), dashboard DELIVERED count 12.4 ms | Index Only Scan over the whole index | see "Not changed" |

## 1. Orders search: the join no index can serve

`GET /orders?search=x` matches the order number or the customer's name. Prisma turns `{ customer: { name: { contains, mode: 'insensitive' } } }` into a `LEFT JOIN customers` with an `OR` that spans both tables:

```sql
SELECT ... FROM orders LEFT JOIN customers AS j0 ON j0.id = orders.customer_id
WHERE (orders.order_number ILIKE '%' || $1 || '%' OR (j0.name ILIKE '%' || $2 || '%' AND j0.id IS NOT NULL))
ORDER BY orders.created_at DESC LIMIT 20 OFFSET 0;   -- plus the same WHERE inside SELECT COUNT(*)
```

Neither side of that `OR` can be pushed below the join, so Postgres joins all 200,000 orders to all 20,000 customers and evaluates two `ILIKE`s per row:

```
### O4c orders.list search="siew": count  | median 151.775 ms
Aggregate  (actual time=153.023..153.026 rows=1)
  ->  Hash Left Join  (actual time=3.448..152.614 rows=7164)
        Filter: ((orders.order_number ~~* '%siew%') OR ((j0.name ~~* '%siew%') AND (j0.id IS NOT NULL)))
        Rows Removed by Filter: 192836
        ->  Seq Scan on orders  (rows=200000)
        ->  Hash  ->  Seq Scan on customers j0  (rows=20000)
```

The rows query is only cheap when the term is common: walking `created_at` backwards finds 20 matches quickly. A rare name or an order number has to visit almost every order (O5 76.6 ms, O6 64.0 ms).

**Indexes alone do not fix this.** I added trigram indexes on `customers.name` and `orders.order_number` and re-ran the unchanged Prisma SQL: the plan stayed the same Hash Left Join (after.txt O4c-O6c: 148 / 70 / 62 ms). An index can serve `orders.order_number ILIKE` or `customers.name ILIKE` on its own, but not an `OR` across a join.

**The rewrite.** `OrdersService.customerNameFilter` first resolves the customer side with the index:

```sql
SELECT id FROM customers WHERE name ILIKE '%' || $1 || '%' ORDER BY id LIMIT 1001;   -- trigram index
```

The order filter then becomes `order_number ILIKE ... OR customer_id IN ($2, ..., $n)`, which is two conditions on one table. Postgres can answer each with an index and combine them with a BitmapOr:

```
### R4c orders.list search="siew" rewritten: count  | median 3.113 ms
Aggregate  (actual time=3.108..3.109 rows=1)
  ->  Bitmap Heap Scan on orders  (rows=7164)
        Recheck Cond: ((order_number ~~* '%siew%') OR (customer_id = ANY ('{<595 ids>}'::uuid[])))
        ->  BitmapOr
              ->  Bitmap Index Scan on orders_order_number_trgm_idx  (rows=0)
              ->  Bitmap Index Scan on orders_customer_id_idx        (rows=7164)

### R5 orders.list search="kavitha a/l pillai" rewritten: rows  | median 0.227 ms
Limit  ->  Sort (top-N heapsort)  ->  Bitmap Heap Scan on orders (rows=322)  ->  BitmapOr (same two indexes)

### R6c orders.list search="150123" rewritten: count  | median 0.240 ms   (no customer matched, so Prisma sends `OR 1=0`)
Aggregate  ->  Bitmap Heap Scan on orders  ->  Bitmap Index Scan on orders_order_number_trgm_idx (rows=1)
```

For the common term `siew`, the planner keeps the backward `created_at` scan for the rows query (0.19 ms) and switches to the BitmapOr for the count. It picks the cheaper plan for each.

| Query | Before (join) | Rewrite, no new index | Rewrite + trigram indexes |
|---|---:|---:|---:|
| Customer-name lookup (`siew`) | n/a | 6.2 ms (Seq Scan) | **0.50 ms** (`customers_name_trgm_idx`) |
| `siew` rows / count | 0.60 / 151.8 ms | 0.20 / 29.2 ms | **0.19 / 3.1 ms** |
| `kavitha a/l pillai` rows / count | 76.6 / 69.8 ms | 5.2 / 32.2 ms | **0.23 / 0.21 ms** |
| `150123` rows / count | 64.0 / 65.7 ms | 29.3 / 27.0 ms | **0.27 / 0.24 ms** |

Both halves matter. Without `orders_order_number_trgm_idx`, the `order_number ILIKE` side of the `OR` still needs a Seq Scan of `orders` (the ~30 ms in the middle column).

**Why the 1,000-customer cap.** Prisma sends `IN (...)` as one bind parameter per id, and Postgres accepts at most 65,535 parameters. A short or very common term could exceed that on a large customer table, and a list of thousands of ids also costs planning time. So the lookup fetches at most 1,001 ids, and above 1,000 the service keeps the original join. Both forms return the same rows, and neither excludes soft-deleted customers. The new e2e test `searches customer names the same way whether few or many customers match` covers both paths, plus the soft-deleted and no-name-match cases.

**What this does not fix (stated plainly).** A broad term still costs about 150 ms for the count. `bin` matches 10,924 customers ("bin"/"binti") and 108k orders, so it takes the join path: O7c is 152 ms before and 149 ms after. Its rows query is fast either way (0.1 ms). Fixing that would need a different design (see "Not changed").

## 2. Customers search: trigram GIN on name, phone, email

`GET /customers?search=x` runs `name ILIKE '%x%' OR phone LIKE '%x%' OR email ILIKE '%x%'`. A leading wildcard rules out the existing btree indexes (`customers_name_idx` and `customers_phone_idx` are also in the `en_US.utf8` collation, so they cannot serve even a prefix `LIKE`). Before, every search was a Seq Scan of the table:

```
### C3 customers.list search="kavitha a/l pillai" (rare): rows  | median 11.916 ms
Limit  ->  Sort  ->  Seq Scan on customers c  (rows=27)
        Filter: ((deleted_at IS NULL) AND ((name ~~* ...) OR (phone ~~ ...) OR (email ~~* ...)))
        Rows Removed by Filter: 19973
```

Postgres can combine the three conditions with a BitmapOr only if every one of them is indexable, so all three columns get a `gin_trgm_ops` index:

```
### C3 customers.list search="kavitha a/l pillai" (rare): rows  | median 0.358 ms
Limit  ->  Sort  ->  Bitmap Heap Scan on customers c  (rows=27)
        Filter: (deleted_at IS NULL)
        ->  BitmapOr
              ->  Bitmap Index Scan on customers_name_trgm_idx   (rows=27)
              ->  Bitmap Index Scan on customers_phone_trgm_idx  (rows=0)
              ->  Bitmap Index Scan on customers_email_trgm_idx  (rows=0)
```

| Query | Before | After |
|---|---:|---:|
| `kavitha a/l pillai` rows / count | 11.9 / 12.4 ms | **0.36 / 0.39 ms** |
| `7712` (phone digits) rows / count | 10.6 / 10.5 ms | **0.07 / 0.05 ms** |
| `lim` count | 10.3 ms | **0.36 ms** |
| `lim` rows | 7.2 ms | 7.5 ms (unchanged) |

**The `lim` rows query got no faster, and this is why.** Postgres estimates that 532 of 20,000 customers match, assumes those matches are spread evenly through the alphabet, and decides that walking `customers_name_idx` in `ORDER BY name` order will find 20 matches quickly. But "Lim" is a surname at the start of the name, so the matches cluster under L, and the scan reads 10,114 rows before it finds them (`Rows Removed by Filter: 10114`). This is a known limit of how the planner prices `LIMIT` over a filtered ordered scan. It costs 7 ms at 20k customers and grows with the table. I left it alone: forcing the bitmap plan would mean changing the sort or the query shape, and the count alongside it dropped from 10.3 to 0.36 ms.

At 20,000 customers the absolute saving is about 10-20 ms per search. The before cost grows linearly with the customer table; the after cost depends on how many rows match.

## 3. Dashboard unpaid aggregate: `<>` cannot use an index

```sql
SELECT COUNT(*), SUM(total), SUM(paid_amount) FROM (SELECT ... FROM orders
 WHERE status <> 'CANCELLED' AND payment_status <> 'PAID' OFFSET 0) sub;
```

A btree cannot search for "not equal", so this read all 200k orders (29.5 ms, Seq Scan, 184,114 rows removed). PaymentStatus has three values, so `<> 'PAID'` is the same as `IN ('UNPAID', 'PARTIAL')`, and an `IN` list can use the existing `orders_payment_status_idx`:

```
### R2 dashboard unpaid rewritten (IN instead of <>)  | median 8.301 ms
Aggregate
  ->  Bitmap Heap Scan on orders  (rows=15886)
        Recheck Cond: (payment_status = ANY (ARRAY['UNPAID', 'PARTIAL']))
        Filter: (status <> 'CANCELLED')     Rows Removed by Filter: 13899
        ->  Bitmap Index Scan on orders_payment_status_idx  (rows=29785)
```

29.5 ms became 8.3 ms with no new index. The service builds the list as `Object.values(PaymentStatus).filter(s => s !== 'PAID')`, so it stays correct if a status is ever added. The dashboard e2e test still pins `unpaidOrders` and `outstandingAmount`.

Alternatives I measured and rejected:

- **Partial index `WHERE status <> 'CANCELLED' AND payment_status <> 'PAID'`.** Postgres never used it. Prisma sends enum values as `CAST($1::text AS "PaymentStatus")`, and the text-to-enum cast is not immutable, so the planner cannot prove the query's `WHERE` implies the index predicate. That is true with literals and with prepared generic plans alike. The same applies to any partial index on an enum column queried through Prisma.
- **Covering index `(payment_status, status) INCLUDE (total, paid_amount)`.** An Index Only Scan gets the aggregate to 4.6 ms, saving another ~4 ms. But it would be a second index led by `payment_status` (the existing one cannot be dropped in an additive-only migration), on `orders`, the most-written table, and `paid_amount` changes on every payment. That cost is not worth 4 ms on a dashboard tile.

## Not changed, and why

| Candidate | Measured | Decision |
|---|---|---|
| Trigram index on `products.name/sku` | Search is 1.0 + 1.2 ms (Seq Scan of 2,000 rows) | Not worth an index at this size. Revisit once products reach 20k+ (the public catalog may get there). |
| Composite `orders (status, created_at)` / `(payment_status, created_at)` | Filtered list pages are 0.03-0.11 ms | Already fast: the backward `created_at` scan finds 20 matches immediately, and PENDING has only about 466 rows to sort. |
| Composite `orders (customer_id, created_at DESC)` | `customers.orders` page 1 0.30 ms; customer detail 1.3 ms | Would remove a top-N sort of about 1,400 rows (sub-millisecond), and it would duplicate the FK index `orders_customer_id_idx`. |
| Customer detail (`include: { orders: { take: 20 } }`) | 1.3 ms in SQL, about 10 ms through Prisma | **Finding:** Prisma 7 sends this relation query with no `LIMIT` and slices to 20 in Node, so the heaviest customer transfers 1,367 rows. No index fixes that; a separate `order.findMany({ take: 20 })` would. Not changed here because it does not need an index (out of scope). |
| Unfiltered `COUNT(*)` (orders 13.5 ms, payments 16.0 ms) and DELIVERED count (12.4 ms) | Already Index Only Scans with 0 heap fetches | That is the cheapest exact count Postgres can do. Further gains need estimated counts (`pg_class.reltuples`) or cached counters, which are product decisions. |
| Broad orders search (`bin`, count 149 ms) | See section 1 | Needs a denormalised, trigram-indexed customer name on `orders`, or raw SQL for the search query. Both are bigger changes than this task covers. |
| FK indexes on `orders.created_by_id`, `payments.recorded_by_id`, `inventory_transactions.created_by_id` | No query filters on them | They would only help `DELETE FROM users`, and users are deactivated, not deleted. |
| Existing `customers_phone_idx` (btree) | No query can use it (search is `LIKE '%x%'`) | Left in place: this migration is additive-only. A candidate for a future cleanup migration. |
| Deep pagination (`OFFSET` in the thousands) | Not used by the UI (20 per page, few pages) | Keyset pagination would be the fix if it ever matters. |

## Write cost

[`write-cost.sql`](write-cost.sql) inserts 10,000 rows into each table inside a transaction that is rolled back, three times, before and after the migration (psql wall time, ms):

| Batch | Before (3 runs) | After (3 runs) | Per row |
|---|---|---|---|
| 10,000 customers | 56 / 91 / 75 | 244 / 196 / 230 | about +16 µs (3 GIN indexes) |
| 10,000 orders | 313 / 252 / 276 | 334 / 327 / 362 | about +6 µs (1 GIN index) |

A single `POST /customers` or `POST /orders` pays microseconds. Disk: the four indexes take 2.3 MB on customers (a 2.9 MB table) and 7.3 MB on orders (33 MB). Building them took 54 / 45 / 32 / 448 ms on this data. Prisma runs migrations inside a transaction, so `CONCURRENTLY` is not possible, and each build blocks writes to its table for that long. The migration notes how to pre-build the indexes concurrently on a much larger table.

**GIN pending list.** GIN indexes with `fastupdate` (the default) buffer new entries in a pending list until vacuum merges them, and every search has to scan that list linearly. After the 60,000 rolled-back write-cost inserts, the pending lists held 5,600-10,400 entries, and searches fell back to about the old Seq Scan times (customer search 12 ms, order-number lookup 2.3 ms) until `VACUUM`. In normal use autovacuum flushes the lists (and `gin_pending_list_limit`, 4 MB, caps them). A bulk import of customers should be followed by `VACUUM customers`. The after numbers in this note were taken after that `VACUUM`.

## Drift check

Every index is declared in `schema.prisma`. Prisma 7.10 supports this through the `postgresqlExtensions` preview feature (`extensions = [pg_trgm]`) and `@@index([col(ops: raw("gin_trgm_ops"))], type: Gin, map: "...")`. The only hand edit to the generated SQL is `IF NOT EXISTS`. Prisma 7's `--from-migrations` needs a shadow database (`datasource.shadowDatabaseUrl` in a Prisma config):

```
$ npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --exit-code
No difference detected.
(exit 0)
```

As a negative control, diffing the migrations against the old (`main`) schema reports the four indexes as "Removed index on columns (...)" and exits 2, so the check does detect a mismatch.

## Reproduce

From the repo root, with `docker compose up -d postgres` running:

```bash
docker compose exec -T postgres psql -U orderflow -c "CREATE DATABASE orderflow_perf"

# BEFORE: the init schema only (check out the commit before this change), load data, measure
(cd backend && DATABASE_URL=postgresql://orderflow:orderflow@localhost:5432/orderflow_perf npx prisma migrate deploy)
docker compose exec -T postgres psql -U orderflow -d orderflow_perf -v ON_ERROR_STOP=1 < docs/perf/seed-perf.sql
docker compose exec -T postgres psql -U orderflow -d orderflow_perf -X -q < docs/perf/bench.sql > docs/perf/results/before.txt

# AFTER: this branch's migration on the same data
(cd backend && DATABASE_URL=postgresql://orderflow:orderflow@localhost:5432/orderflow_perf npx prisma migrate deploy)
docker compose exec -T postgres psql -U orderflow -d orderflow_perf -c "VACUUM ANALYZE customers" -c "VACUUM ANALYZE orders"
docker compose exec -T postgres psql -U orderflow -d orderflow_perf -X -q < docs/perf/bench.sql > docs/perf/results/after.txt

# Optional: write cost (run it last, or VACUUM afterwards; see "GIN pending list")
docker compose exec -T postgres psql -U orderflow -d orderflow_perf -X < docs/perf/write-cost.sql

# Summary lines only
grep '###' docs/perf/results/before.txt docs/perf/results/after.txt
```

`bench.sql` uses fixed customer, order and product ids. `seed-perf.sql` derives every id from `md5()` and seeds `random()` with `setseed(0.42)`, so each load produces the same rows (timestamps are relative to `now()`, so "today" always has orders).

-- Write-cost probe: inserts 10,000 customers and 10,000 orders inside transactions that are rolled
-- back, three times each, and prints psql's wall time. Run it before and after the trigram
-- migration on the same data to see what the extra GIN indexes cost per insert.
--
--   docker compose exec -T postgres psql -U orderflow -d orderflow_perf -X < docs/perf/write-cost.sql

\timing on
SET jit = off;

\echo customers x10000 (1/3)
BEGIN;
INSERT INTO customers (id, name, phone, email, created_at, updated_at)
SELECT md5('wc-c' || i)::uuid, 'Write Cost ' || i || ' binti Test', '012-' || (5000000 + i), 'wc' || i || '@gmail.com', now(), now()
FROM generate_series(1, 10000) i;
ROLLBACK;
\echo customers x10000 (2/3)
BEGIN;
INSERT INTO customers (id, name, phone, email, created_at, updated_at)
SELECT md5('wc-c' || i)::uuid, 'Write Cost ' || i || ' binti Test', '012-' || (5000000 + i), 'wc' || i || '@gmail.com', now(), now()
FROM generate_series(1, 10000) i;
ROLLBACK;
\echo customers x10000 (3/3)
BEGIN;
INSERT INTO customers (id, name, phone, email, created_at, updated_at)
SELECT md5('wc-c' || i)::uuid, 'Write Cost ' || i || ' binti Test', '012-' || (5000000 + i), 'wc' || i || '@gmail.com', now(), now()
FROM generate_series(1, 10000) i;
ROLLBACK;

\echo orders x10000 (1/3)
BEGIN;
INSERT INTO orders (id, order_number, customer_id, subtotal, discount, total, created_by_id, created_at, updated_at)
SELECT md5('wc-o' || i)::uuid, 'ORD-29991231-' || lpad(i::text, 6, '0'), md5('customer:1')::uuid, 10, 0, 10, md5('user:1')::uuid, now(), now()
FROM generate_series(1, 10000) i;
ROLLBACK;
\echo orders x10000 (2/3)
BEGIN;
INSERT INTO orders (id, order_number, customer_id, subtotal, discount, total, created_by_id, created_at, updated_at)
SELECT md5('wc-o' || i)::uuid, 'ORD-29991231-' || lpad(i::text, 6, '0'), md5('customer:1')::uuid, 10, 0, 10, md5('user:1')::uuid, now(), now()
FROM generate_series(1, 10000) i;
ROLLBACK;
\echo orders x10000 (3/3)
BEGIN;
INSERT INTO orders (id, order_number, customer_id, subtotal, discount, total, created_by_id, created_at, updated_at)
SELECT md5('wc-o' || i)::uuid, 'ORD-29991231-' || lpad(i::text, 6, '0'), md5('customer:1')::uuid, 10, 0, 10, md5('user:1')::uuid, now(), now()
FROM generate_series(1, 10000) i;
ROLLBACK;

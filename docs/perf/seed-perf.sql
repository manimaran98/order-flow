-- OrderFlow benchmark data set.
--
-- Loads a realistic two-year history for one busy SME into an EMPTY, fully migrated database:
--   6 users, 20,000 customers, 2,000 products, 200,000 orders, 530,243 order items (1-5 per order),
--   231,237 payments and 540,220 inventory ledger rows (~370 MB).
--
-- Deterministic: ids are md5-derived UUIDs and every random() call follows setseed(), so two runs
-- produce the same rows. Timestamps are relative to now() so the dashboard's "today" figures
-- always have data; everything else (ids, mixes, amounts) is identical between runs.
--
-- Usage (from the repo root, database already migrated with `prisma migrate deploy`):
--   docker compose exec -T postgres psql -U orderflow -d orderflow_perf -v ON_ERROR_STOP=1 < docs/perf/seed-perf.sql
--
-- Respects every CHECK constraint in the init migration: non-negative prices and stock,
-- 0 <= discount <= subtotal, total = subtotal - discount, 0 <= paid_amount <= total,
-- positive item quantities and payment amounts, non-zero ledger quantities.

\set ON_ERROR_STOP 1
\timing on

BEGIN;

SELECT setseed(0.42);

-- Deterministic UUID from a namespace and a number.
CREATE OR REPLACE FUNCTION pg_temp.uid(ns text, n bigint) RETURNS uuid
  LANGUAGE sql IMMUTABLE AS $$ SELECT md5(ns || ':' || n)::uuid $$;

-- ---------------------------------------------------------------- users
INSERT INTO users (id, name, email, password_hash, role, is_active, created_at, updated_at)
SELECT pg_temp.uid('user', i),
       (ARRAY['Aisyah Rahman','Tan Wei Ming','Priya Nair','Hafiz Ismail','Lim Mei Ling','Ravi Kumar'])[i],
       'user' || i || '@perf.orderflow.local',
       -- Not a usable password: this data set is for EXPLAIN, not for logging in.
       '$2b$10$perfperfperfperfperfpeuK0hR0Lq7o2y7x8e1Qb0b0b0b0b0b0b',
       CASE WHEN i = 1 THEN 'ADMIN' ELSE 'STAFF' END::"Role",
       true,
       now() - interval '760 days',
       now() - interval '760 days'
FROM generate_series(1, 6) AS i;

-- ---------------------------------------------------------------- customers (20,000)
-- Malay, Chinese and Indian name patterns; Malaysian mobile numbers; ~65% have an email;
-- 2% soft-deleted.
WITH n AS (
  SELECT i,
         random() AS r_ethnic, random() AS r_first, random() AS r_last, random() AS r_email,
         random() AS r_del, random() AS r_age, (10000000 + floor(random() * 89999999))::bigint AS phone_digits,
         (ARRAY['012','013','014','016','017','018','019','011'])[1 + floor(random() * 8)::int] AS prefix
  FROM generate_series(1, 20000) AS i
), named AS (
  SELECT n.*,
         CASE
           WHEN r_ethnic < 0.55 THEN
             (ARRAY['Ahmad','Muhammad','Nur','Siti','Aisyah','Hafiz','Faizal','Nurul','Amirul','Farah','Zainal','Hidayah','Azlan','Syafiq','Iman'])[1 + floor(r_first * 15)::int]
             || ' ' || (ARRAY['bin Abdullah','binti Ismail','bin Rahman','binti Hassan','bin Yusof','binti Ahmad','bin Ibrahim','binti Omar','bin Zakaria','binti Salleh'])[1 + floor(r_last * 10)::int]
           WHEN r_ethnic < 0.85 THEN
             (ARRAY['Tan','Lim','Lee','Wong','Ng','Chan','Ong','Goh','Teo','Chong','Yap','Low'])[1 + floor(r_last * 12)::int]
             || ' ' || (ARRAY['Wei Ming','Mei Ling','Kok Leong','Siew Lan','Jia Hui','Chee Keong','Hui Min','Boon Hock','Li Ting','Kah Wai'])[1 + floor(r_first * 10)::int]
           ELSE
             (ARRAY['Ravi','Priya','Suresh','Kavitha','Ganesh','Deepa','Arun','Lakshmi','Vijay','Meena'])[1 + floor(r_first * 10)::int]
             || ' a/l ' || (ARRAY['Kumar','Raman','Muthu','Subramaniam','Krishnan','Nair','Pillai','Selvam'])[1 + floor(r_last * 8)::int]
         END AS full_name
  FROM n
)
INSERT INTO customers (id, name, phone, email, address, notes, deleted_at, created_at, updated_at)
SELECT pg_temp.uid('customer', i),
       full_name || CASE WHEN i % 7 = 0 THEN ' ' || (i % 97) ELSE '' END,  -- some disambiguating suffixes
       prefix || '-' || phone_digits::text,
       CASE WHEN r_email < 0.65 THEN 'cust' || i || '@' || (ARRAY['gmail.com','yahoo.com','hotmail.com','outlook.com'])[1 + i % 4] END,
       (i % 200) || ', Jalan ' || (ARRAY['Ampang','Klang Lama','Bukit Bintang','Tun Razak','Sultan Ismail','Gasing','SS2/24','Puchong'])[1 + i % 8]
         || ', ' || (ARRAY['Kuala Lumpur','Petaling Jaya','Shah Alam','Subang Jaya','Johor Bahru','Penang','Ipoh','Kota Kinabalu'])[1 + (i / 8) % 8],
       NULL,
       CASE WHEN r_del < 0.02 THEN now() - (r_age * interval '300 days') END,
       now() - interval '740 days' + (i / 20000.0) * interval '730 days',
       now() - interval '740 days' + (i / 20000.0) * interval '730 days'
FROM named;

-- ---------------------------------------------------------------- products (2,000)
WITH p AS (
  SELECT i, random() AS r_price, random() AS r_margin, random() AS r_active, random() AS r_thr,
         (ARRAY['Kopi','Teh Tarik','Kuih','Sambal','Rempah','Beras','Minyak','Gula Melaka','Kicap','Serunding',
                'Dodol','Belacan','Santan','Tepung','Biskut','Kerepek','Madu','Cili Kering','Kaya','Rendang Paste'])[1 + i % 20] AS base,
         (ARRAY['Kampung','Premium','Original','Pedas','Organik','Classic','Asli','Gold','Special','Homemade'])[1 + (i / 20) % 10] AS variant,
         (ARRAY['250g','500g','1kg','2kg','5kg','330ml','1L','Pack of 6','Pack of 12','Box'])[1 + (i / 200) % 10] AS size
  FROM generate_series(1, 2000) AS i
)
INSERT INTO products (id, name, sku, description, selling_price, cost_price, stock_quantity, low_stock_threshold, is_active, created_at, updated_at)
SELECT pg_temp.uid('product', i),
       base || ' ' || variant || ' ' || size,
       'SKU-' || upper(left(replace(base, ' ', ''), 3)) || '-' || lpad(i::text, 5, '0'),
       NULL,
       round((2 + r_price * 148)::numeric, 2),
       round(((2 + r_price * 148) * (0.45 + r_margin * 0.3))::numeric, 2),
       0,  -- set from the ledger below
       10 + floor(r_thr * 21)::int,
       r_active >= 0.05,
       now() - interval '760 days',
       now() - interval '760 days'
FROM p;

-- ---------------------------------------------------------------- orders (200,000) + items
-- Order n is placed at an evenly spread point over the last 730 days (~274 orders/day) with jitter.
-- Customer choice is skewed (random()^2): regulars order far more often than one-off buyers.
CREATE TEMP TABLE tmp_orders ON COMMIT DROP AS
SELECT n,
       pg_temp.uid('order', n) AS id,
       pg_temp.uid('customer', 1 + floor(power(random(), 2) * 20000)::bigint) AS customer_id,
       pg_temp.uid('user', 1 + floor(random() * 6)::bigint) AS created_by_id,
       least(now() - interval '1 minute',
             now() - interval '730 days' + (n / 200000.0) * interval '730 days' + random() * interval '2 hours') AS created_at,
       random() AS r_status, random() AS r_pay, random() AS r_disc, random() AS r_prod,
       random() AS r_q1, random() AS r_q2, random() AS r_q3, random() AS r_nitems
FROM generate_series(1, 200000) AS n;

ALTER TABLE tmp_orders ADD COLUMN status "OrderStatus", ADD COLUMN pay_bucket text;

-- Older than a week: almost everything is delivered, ~7% cancelled. Last week: the live pipeline.
UPDATE tmp_orders SET status = (CASE
    WHEN created_at < now() - interval '7 days' THEN CASE WHEN r_status < 0.07 THEN 'CANCELLED' ELSE 'DELIVERED' END
    WHEN r_status < 0.25 THEN 'PENDING'
    WHEN r_status < 0.45 THEN 'CONFIRMED'
    WHEN r_status < 0.60 THEN 'PACKING'
    WHEN r_status < 0.75 THEN 'READY'
    WHEN r_status < 0.95 THEN 'DELIVERED'
    ELSE 'CANCELLED' END)::"OrderStatus",
  pay_bucket = CASE
    WHEN r_status < 0.07 AND created_at < now() - interval '7 days' THEN 'UNPAID'
    WHEN created_at < now() - interval '7 days' THEN CASE WHEN r_pay < 0.92 THEN 'PAID' WHEN r_pay < 0.97 THEN 'PARTIAL' ELSE 'UNPAID' END
    ELSE CASE WHEN r_pay < 0.30 THEN 'PAID' WHEN r_pay < 0.50 THEN 'PARTIAL' ELSE 'UNPAID' END END;
UPDATE tmp_orders SET pay_bucket = 'UNPAID' WHERE status = 'CANCELLED';
ALTER TABLE tmp_orders ADD PRIMARY KEY (id);
ANALYZE tmp_orders;

-- 1-5 lines per order (avg ~3). Lines use product offsets 0, 397, 794, ... so (order_id, product_id) is unique.
CREATE TEMP TABLE tmp_items ON COMMIT DROP AS
SELECT o.id AS order_id, o.n, k,
       pg_temp.uid('product', 1 + ((floor(power(o.r_prod, 1.5) * 2000)::int + k * 397) % 2000)) AS product_id,
       1 + floor((CASE k % 3 WHEN 0 THEN o.r_q1 WHEN 1 THEN o.r_q2 ELSE o.r_q3 END) * 5)::int AS quantity
FROM tmp_orders o
CROSS JOIN LATERAL generate_series(0, (CASE WHEN o.r_nitems < 0.15 THEN 1 WHEN o.r_nitems < 0.45 THEN 2
                                            WHEN o.r_nitems < 0.80 THEN 3 WHEN o.r_nitems < 0.95 THEN 4 ELSE 5 END) - 1) AS k;

INSERT INTO orders (id, order_number, customer_id, status, payment_status, subtotal, discount, total, paid_amount,
                    notes, created_by_id, confirmed_at, cancelled_at, delivered_at, created_at, updated_at)
SELECT o.id,
       'ORD-' || to_char(o.created_at AT TIME ZONE 'Asia/Kuala_Lumpur', 'YYYYMMDD') || '-' || lpad(o.n::text, 6, '0'),
       o.customer_id,
       o.status,
       o.pay_bucket::"PaymentStatus",
       s.subtotal,
       d.discount,
       s.subtotal - d.discount,
       CASE o.pay_bucket WHEN 'PAID' THEN s.subtotal - d.discount
                         WHEN 'PARTIAL' THEN round((s.subtotal - d.discount) / 2, 2)
                         ELSE 0 END,
       NULL,
       o.created_by_id,
       CASE WHEN o.status NOT IN ('PENDING', 'CANCELLED') THEN o.created_at + interval '30 minutes' END,
       CASE WHEN o.status = 'CANCELLED' THEN o.created_at + interval '1 day' END,
       CASE WHEN o.status = 'DELIVERED' THEN o.created_at + interval '2 days' END,
       o.created_at,
       o.created_at + interval '2 days'
FROM tmp_orders o
JOIN (
  SELECT i.order_id, sum(i.quantity * p.selling_price) AS subtotal
  FROM tmp_items i JOIN products p ON p.id = i.product_id
  GROUP BY i.order_id
) s ON s.order_id = o.id
CROSS JOIN LATERAL (SELECT CASE WHEN o.r_disc < 0.15 THEN round(s.subtotal * 0.05, 2) ELSE 0 END AS discount) d;

INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, subtotal)
SELECT pg_temp.uid('item', i.n * 10 + i.k), i.order_id, i.product_id, i.quantity, p.selling_price, i.quantity * p.selling_price
FROM tmp_items i JOIN products p ON p.id = i.product_id;

SELECT setval('order_number_seq', 200000);

-- ---------------------------------------------------------------- payments
-- PARTIAL: one payment of the paid amount. PAID: one payment, or two (half + rest) for 30% of orders.
INSERT INTO payments (id, order_id, amount, method, reference, paid_at, recorded_by_id, created_at)
SELECT pg_temp.uid('payment', o.n * 10 + part),
       o.id,
       CASE WHEN o.parts = 1 THEN o.paid_amount
            WHEN part = 1 THEN round(o.paid_amount / 2, 2)
            ELSE o.paid_amount - round(o.paid_amount / 2, 2) END,
       (ARRAY['CASH','BANK_TRANSFER','BANK_TRANSFER','CARD','OTHER'])[1 + (o.n + part) % 5]::"PaymentMethod",
       CASE WHEN (o.n + part) % 5 IN (1, 2) THEN 'FPX' || lpad((o.n * 10 + part)::text, 10, '0') END,
       least(now(), o.created_at + part * interval '1 day'),
       o.created_by_id,
       least(now(), o.created_at + part * interval '1 day')
FROM (
  SELECT t.n, t.id, t.created_by_id, t.created_at, ord.paid_amount,
         CASE WHEN t.pay_bucket = 'PAID' AND t.r_disc > 0.7 AND ord.paid_amount >= 0.02 THEN 2 ELSE 1 END AS parts
  FROM tmp_orders t JOIN orders ord ON ord.id = t.id
  WHERE ord.paid_amount > 0
) o
CROSS JOIN LATERAL generate_series(1, o.parts) AS part;

-- ---------------------------------------------------------------- inventory ledger
-- A SALE row per line of every order that reached CONFIRMED (cancelled ones never deducted here).
INSERT INTO inventory_transactions (id, product_id, type, quantity, reference_type, reference_id, note, created_by_id, created_at)
SELECT pg_temp.uid('itx-sale', i.n * 10 + i.k), i.product_id, 'SALE', -i.quantity, 'ORDER', i.order_id, NULL,
       o.created_by_id, o.created_at + interval '30 minutes'
FROM tmp_items i JOIN tmp_orders o ON o.id = i.order_id
WHERE o.status NOT IN ('PENDING', 'CANCELLED');

-- 24 monthly RESTOCK rows per product, sized so the running stock never ends negative.
-- 6% of products get no top-up margin, which leaves them at or near their low-stock threshold.
WITH sold AS (
  SELECT p.id, row_number() OVER (ORDER BY p.id) AS pn, coalesce(-sum(t.quantity), 0) AS units
  FROM products p LEFT JOIN inventory_transactions t ON t.product_id = p.id AND t.type = 'SALE'
  GROUP BY p.id
)
INSERT INTO inventory_transactions (id, product_id, type, quantity, reference_type, reference_id, note, created_by_id, created_at)
SELECT pg_temp.uid('itx-restock', s.pn * 100 + m), s.id, 'RESTOCK',
       ceil(s.units / 24.0)::int + CASE WHEN s.pn % 17 = 0 THEN 0 ELSE 5 + floor(random() * 20)::int END,
       'MANUAL', NULL, 'Monthly restock', pg_temp.uid('user', 1),
       now() - interval '735 days' + m * interval '30 days'
FROM sold s CROSS JOIN generate_series(0, 23) AS m;

UPDATE products p SET stock_quantity = l.qty
FROM (SELECT product_id, sum(quantity)::int AS qty FROM inventory_transactions GROUP BY product_id) l
WHERE l.product_id = p.id;

COMMIT;

-- VACUUM (not just ANALYZE) also sets the visibility map, as autovacuum would on a live system,
-- so index-only scans in the benchmark are not penalised by a freshly bulk-loaded heap.
VACUUM ANALYZE;

SELECT 'users' AS tbl, count(*) FROM users UNION ALL
SELECT 'customers', count(*) FROM customers UNION ALL
SELECT 'products', count(*) FROM products UNION ALL
SELECT 'orders', count(*) FROM orders UNION ALL
SELECT 'order_items', count(*) FROM order_items UNION ALL
SELECT 'payments', count(*) FROM payments UNION ALL
SELECT 'inventory_transactions', count(*) FROM inventory_transactions;

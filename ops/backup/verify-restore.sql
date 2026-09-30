-- Minimal functional validation of a restored ERP database. Read-only.
-- Output: one row per check, "name|ok|detail" (psql -At -F'|'). restore.sh fails on any ok=f.
-- Amounts are compared as numeric, never float (docs/decimal_policy.md).
\set ON_ERROR_STOP on
\pset format unaligned
\pset tuples_only on
\pset fieldsep '|'

WITH
critical(tbl) AS (VALUES ('users'), ('products'), ('stocks'), ('customers'), ('sales'),
  ('fiscal_documents'), ('account_receivables'), ('account_receivable_movements'),
  ('payments'), ('payment_allocations'), ('checks')),
readable AS (
  SELECT tbl, to_regclass(format('public.%I', tbl)) IS NOT NULL AS present,
         CASE WHEN to_regclass(format('public.%I', tbl)) IS NULL THEN NULL
              ELSE (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM public.%I', tbl), false, true, '')))[1]::text::bigint
         END AS n
  FROM critical
),
bad AS (
  SELECT ar.id FROM public.account_receivables ar
  JOIN (SELECT account_receivable_id, sum(subsequent_balance - previous_balance) AS net
        FROM public.account_receivable_movements GROUP BY 1) m ON m.account_receivable_id = ar.id
  WHERE ar.current_balance <> m.net
),
over AS (
  SELECT p.id FROM public.payments p
  JOIN (SELECT payment_id, sum(amount_allocated) AS alloc
        FROM public.payment_allocations GROUP BY 1) a ON a.payment_id = p.id
  WHERE a.alloc > p.total_amount
),
mig AS (
  SELECT count(*) AS applied, min(timestamp) AS lo, max(timestamp) AS hi FROM public.migrations
)
SELECT 'table_readable:' || tbl, present::text, coalesce(n::text || ' rows', 'missing') FROM readable
UNION ALL
SELECT 'migrations_contiguous', (applied > 0 AND applied = hi - lo + 1)::text,
       applied || ' applied, timestamps ' || lo || '..' || hi FROM mig
UNION ALL
SELECT 'stock_non_negative',
       (NOT EXISTS (SELECT 1 FROM public.stocks WHERE current_base_stock < 0))::text,
       (SELECT count(*) FROM public.stocks WHERE current_base_stock < 0) || ' negative rows'
UNION ALL
-- ledger: each receivable's balance equals the sum of its movement deltas (order independent)
SELECT 'ledger_balance_matches_movements',
       (NOT EXISTS (SELECT 1 FROM bad))::text,
       (SELECT count(*) FROM bad) || ' mismatched receivables'
UNION ALL
SELECT 'payment_allocations_within_payment_total',
       (NOT EXISTS (SELECT 1 FROM over))::text,
       (SELECT count(*) FROM over) || ' payments over-allocated'
;

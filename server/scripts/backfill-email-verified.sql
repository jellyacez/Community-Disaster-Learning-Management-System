-- One-time backfill: mark accounts verified that were created while email verification was off.
-- Verification was off 2026-06-19 (9bb5b75) to 2026-09-30 (c0a533e) and again from 2026-10-26
-- (fbb4374) until it was re-enabled, so those accounts have emailVerified = false and are blocked at
-- sign-in. Run by hand on each database, after a backup. Step 2 changes data only once uncommented.
--
-- Parameters (psql -v), both timestamptz; give an explicit offset:
--   cutoff  required. Accounts created before this are included.
--   since   optional. Accounts created at or after this are included (default: no lower bound).
--
-- (a) everything created before the deploy that re-enabled verification:
--   psql "$DATABASE_URL" -v cutoff='2026-11-14 18:00:00+08' -f server/scripts/backfill-email-verified.sql
--
-- (b) a date range, e.g. just the fbb4374 window:
--   psql "$DATABASE_URL" -v since='2026-10-26 00:00:00+08' -v cutoff='2026-11-14 18:00:00+08' \
--        -f server/scripts/backfill-email-verified.sql

\set ON_ERROR_STOP on

\if :{?cutoff}
\else
  \echo 'Set the cutoff, e.g. -v cutoff=''2026-11-14 18:00:00+08'''
  \quit
\endif
\if :{?since}
\else
  \set since '-infinity'
\endif

\echo 'Range: createdAt >=' :'since' 'and <' :'cutoff'

-- Step 1: review (read-only)

SELECT count(*) AS accounts_to_verify
FROM public."user"
WHERE "emailVerified" = false
  AND "createdAt" >= :'since'::timestamptz
  AND "createdAt" < :'cutoff'::timestamptz;

-- unreachable = a reserved test domain; nobody can receive the verification email there
SELECT to_char(date_trunc('month', "createdAt" AT TIME ZONE '+08'), 'YYYY-MM') AS created_month,
       role,
       lower(split_part(email, '@', 2)) AS email_domain,
       (lower(split_part(email, '@', 2)) IN ('example.com', 'test.local')
         OR lower(split_part(email, '@', 2)) LIKE '%.invalid') AS unreachable,
       count(*) AS accounts
FROM public."user"
WHERE "emailVerified" = false
  AND "createdAt" >= :'since'::timestamptz
  AND "createdAt" < :'cutoff'::timestamptz
GROUP BY 1, 2, 3, 4
ORDER BY 1, 2, 3;

-- Step 2: apply. Uncomment, check that updated_rows matches accounts_to_verify above, then COMMIT
-- (or ROLLBACK if it doesn't).
--
-- BEGIN;
--
-- WITH updated AS (
--   UPDATE public."user"
--   SET "emailVerified" = true,
--       "updatedAt" = NOW()
--   WHERE "emailVerified" = false
--     AND "createdAt" >= :'since'::timestamptz
--     AND "createdAt" < :'cutoff'::timestamptz
--   RETURNING 1
-- )
-- SELECT count(*) AS updated_rows FROM updated;
--
-- COMMIT;

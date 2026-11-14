-- One-time backfill: mark accounts verified that were created while email verification was off.
-- Verification was off 2026-06-19 (9bb5b75) to 2026-09-30 (c0a533e) and again from 2026-10-26
-- (fbb4374) until it was re-enabled, so those accounts have emailVerified = false and are blocked at
-- sign-in. Run on each database after a backup. Step 1 is read-only; step 2 runs only with -v apply=true.
--
-- Parameters (psql -v), both timestamptz; give an explicit offset:
--   cutoff  required. Accounts created before this are included.
--   since   optional. Accounts created at or after this are included (default: no lower bound).
--   apply     optional. true runs step 2 (needs expected).
--   expected  required with apply=true. The UPDATE commits only if it changes exactly this many rows.
--
-- (a) everything created before the deploy that re-enabled verification:
--   psql "$DATABASE_URL" -v cutoff='2026-11-14 18:00:00+08' -f server/scripts/backfill-email-verified.sql
--
-- (b) a date range, e.g. just the fbb4374 window:
--   psql "$DATABASE_URL" -v since='2026-10-26 00:00:00+08' -v cutoff='2026-11-14 18:00:00+08' \
--        -f server/scripts/backfill-email-verified.sql
--
-- dry run, then apply with the count the dry run printed:
--   psql "$DATABASE_URL" -v cutoff='...' -f server/scripts/backfill-email-verified.sql
--   psql "$DATABASE_URL" -v cutoff='...' -v apply=true -v expected=41 -f server/scripts/backfill-email-verified.sql

\set ON_ERROR_STOP on

\if :{?cutoff}
\else
  -- \quit would exit 0; raise instead so callers (CI) see a failure
  DO $$ BEGIN RAISE EXCEPTION 'cutoff is required, e.g. -v cutoff=''2026-11-14 18:00:00+08'''; END $$;
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
       (lower(split_part(email, '@', 2)) IN ('example.com', 'test.local', 'test.com', 'sample.com')
         OR lower(split_part(email, '@', 2)) LIKE '%.invalid') AS unreachable,
       count(*) AS accounts
FROM public."user"
WHERE "emailVerified" = false
  AND "createdAt" >= :'since'::timestamptz
  AND "createdAt" < :'cutoff'::timestamptz
GROUP BY 1, 2, 3, 4
ORDER BY 1, 2, 3;

-- Step 2: apply (only with -v apply=true)

\if :{?apply}
\else
  \set apply false
\endif

\if :apply
  \if :{?expected}
  \else
    DO $$ BEGIN RAISE EXCEPTION 'apply=true needs -v expected=<N> (accounts_to_verify from a dry run)'; END $$;
  \endif
  SELECT :'expected' ~ '^[0-9]+$' AS expected_is_number \gset
  \if :expected_is_number
  \else
    DO $$ BEGIN RAISE EXCEPTION 'expected must be a whole number'; END $$;
  \endif

  BEGIN;
  WITH updated AS (
    UPDATE public."user"
    SET "emailVerified" = true,
        "updatedAt" = NOW()
    WHERE "emailVerified" = false
      AND "createdAt" >= :'since'::timestamptz
      AND "createdAt" < :'cutoff'::timestamptz
    RETURNING 1
  )
  SELECT count(*) AS updated_rows FROM updated \gset
  \echo 'updated_rows:' :updated_rows ' expected:' :expected
  SELECT :updated_rows = :'expected'::int AS count_matches \gset
  \if :count_matches
    COMMIT;
    \echo 'Committed.'
  \else
    ROLLBACK;
    \echo 'Count mismatch, rolled back. Nothing changed.'
    DO $$ BEGIN RAISE EXCEPTION 'updated_rows did not match expected; rolled back'; END $$;
  \endif
\else
  \echo 'Dry run: nothing changed. Re-run with -v apply=true -v expected=<accounts_to_verify> to apply.'
\endif

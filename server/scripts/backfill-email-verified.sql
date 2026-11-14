-- One-time backfill. Email verification was switched off in fbb4374 (2026-10-26 23:18 +08:00) and is
-- back on now, so accounts created in between have emailVerified = false and can't sign in.
-- Run by hand on each database, after a backup. Nothing below changes data until step 2 is uncommented.
--
--   psql "$DATABASE_URL" -f server/scripts/backfill-email-verified.sql

-- Step 1: review (read-only)

SELECT count(*) AS accounts_to_verify
FROM public."user"
WHERE "emailVerified" = false
  AND "createdAt" >= '2026-10-26 00:00:00+08';

SELECT id, email, role, "createdAt"
FROM public."user"
WHERE "emailVerified" = false
  AND "createdAt" >= '2026-10-26 00:00:00+08'
ORDER BY "createdAt";

-- Not touched by step 2: unverified accounts from before the cutoff. Verification was also off from
-- 2026-06-19 (9bb5b75) to 2026-09-30 (c0a533e), so some of these may need the same treatment.
SELECT to_char(date_trunc('month', "createdAt" AT TIME ZONE '+08'), 'YYYY-MM') AS created_month,
       role,
       count(*) AS unverified
FROM public."user"
WHERE "emailVerified" = false
  AND "createdAt" < '2026-10-26 00:00:00+08'
GROUP BY 1, 2
ORDER BY 1, 2;

-- Step 2: apply. Uncomment, check that UPDATE's row count matches accounts_to_verify, then COMMIT
-- (or ROLLBACK if it doesn't).
--
-- BEGIN;
--
-- UPDATE public."user"
-- SET "emailVerified" = true,
--     "updatedAt" = NOW()
-- WHERE "emailVerified" = false
--   AND "createdAt" >= '2026-10-26 00:00:00+08';
--
-- COMMIT;

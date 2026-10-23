-- 11: better-auth 1.7's admin plugin requires session."impersonatedBy".
-- schema.sql already defines it, but databases created before it was added (local dev
-- and EC2) never received it. Without it, better-auth 1.7 rejects every sign-in and
-- session lookup with "Database schema mismatch".
--
-- Additive only and safe to re-run (deploy.yml applies migration.sql on every deploy).

BEGIN;

ALTER TABLE public.session ADD COLUMN IF NOT EXISTS "impersonatedBy" text;

COMMIT;

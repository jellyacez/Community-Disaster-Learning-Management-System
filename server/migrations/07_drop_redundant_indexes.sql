-- Migration: 07_drop_redundant_indexes.sql
-- Description: Drop redundant/duplicate indexes that consume write I/O without providing query planner benefits.
--
-- Safety Audit Confirmed:
-- 1. idx_certificates_verification_token is 100% duplicate of uq_certificates_verification_token (UNIQUE constraint index).
-- 2. idx_module_activity_user is covered by composite index idx_module_activity_user_modstatus(user_id, modstatus).
-- 3. idx_activity_log_user_id is covered by composite index idx_activity_log_user_date(user_id, act_date).
-- 4. None of these index names are referenced directly in application code, raw SQL query hints, or ORM configurations.

BEGIN;

-- 1. Drop redundant duplicate index on certificates (already enforced by unique constraint index)
DROP INDEX IF EXISTS public.idx_certificates_verification_token;

-- 2. Drop single-column user_id index on module_activity (covered by leading column of idx_module_activity_user_modstatus)
DROP INDEX IF EXISTS public.idx_module_activity_user;

-- 3. Drop single-column user_id index on activity_log (covered by leading column of idx_activity_log_user_date)
DROP INDEX IF EXISTS public.idx_activity_log_user_id;

COMMIT;

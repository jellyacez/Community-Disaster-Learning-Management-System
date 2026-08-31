BEGIN;

-- Migration: 04_add_recert_notified_at.sql
-- Description: Add recert_notified_at to certificates for recertification notification idempotency tracking

-- 1. Add notification tracking column safely if it does not already exist
ALTER TABLE public.certificates 
    ADD COLUMN IF NOT EXISTS recert_notified_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 2. Performance index for notification cron jobs querying unnotified certificates
CREATE INDEX IF NOT EXISTS idx_certificates_recert_notified_at 
    ON public.certificates (recert_notified_at) 
    WHERE recert_notified_at IS NULL;

COMMIT;
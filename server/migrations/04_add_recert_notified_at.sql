-- Migration: 04_add_recert_notified_at.sql
-- Description: Add recert_notified_at to certificates for recertification notification idempotency tracking

ALTER TABLE public.certificates 
ADD COLUMN IF NOT EXISTS recert_notified_at TIMESTAMP WITH TIME ZONE;

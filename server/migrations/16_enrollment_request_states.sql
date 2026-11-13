-- Migration: 16_enrollment_request_states.sql
-- Description: Enrollment code requests are pending, approved or rejected (admins can now
-- decline one). A user has at most one pending request per module: the app checks before
-- inserting, but two simultaneous requests could both pass that check.
-- Idempotent, so setup.js can re-run it.

-- Duplicate pending requests are the same request twice; keep the oldest
UPDATE public.enrollment_requests er
SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
WHERE er.status = 'pending'
  AND EXISTS (
    SELECT 1 FROM public.enrollment_requests older
    WHERE older.user_id = er.user_id
      AND older.module_id = er.module_id
      AND older.status = 'pending'
      AND older.id < er.id
  );

CREATE UNIQUE INDEX IF NOT EXISTS uq_enrollment_requests_one_pending
    ON public.enrollment_requests (user_id, module_id) WHERE status = 'pending';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'enrollment_requests_status_check') THEN
    ALTER TABLE public.enrollment_requests
      ADD CONSTRAINT enrollment_requests_status_check
      CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

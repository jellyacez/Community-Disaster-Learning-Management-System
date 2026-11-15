SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user'
  AND column_name IN (
    'name',
    'first_name',
    'middle_name',
    'last_name'
  )
ORDER BY column_name;
ALTER TABLE public.module_data
  ADD COLUMN IF NOT EXISTS enrollment_code VARCHAR(12);
UPDATE public.module_data
SET enrollment_code = upper(substr(md5(random()::text || mod_id::text), 1, 6))
WHERE enrollment_code IS NULL;


CREATE TABLE IF NOT EXISTS public.enrollment_requests (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  module_id INT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- From 15_user_archived_default.sql: archived is never NULL (it read as "not archived"
-- at sign-in but dropped the user from every count filtering archived = false).
UPDATE public."user" SET archived = false WHERE archived IS NULL;
ALTER TABLE public."user" ALTER COLUMN archived SET DEFAULT false;

-- From 16_enrollment_request_states.sql: at most one pending request per user and module.
-- ModuleService.requestModuleCode relies on this index to reject simultaneous requests (23505).
-- Duplicate pending requests are the same request twice; keep the oldest so the index can build.
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

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

-- Emergency hotlines (docs/specs/emergency-contacts.md). Admins edit them through
-- PUT /api/admin/emergency-contacts; every place that shows or dials a hotline reads this table.
-- Sample rows (is_sample) are shown but never dialable. The defaults go in only while the table
-- is empty, so later runs never undo an admin's edits.
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  agency      varchar(80) NOT NULL
              CONSTRAINT emergency_contacts_agency_check CHECK (char_length(btrim(agency)) BETWEEN 1 AND 80),
  label       varchar(80) NOT NULL
              CONSTRAINT emergency_contacts_label_check CHECK (char_length(btrim(label)) BETWEEN 1 AND 80),
  phone       varchar(32) NOT NULL
              CONSTRAINT emergency_contacts_phone_check CHECK (phone ~ '^\+?[0-9][0-9 -]*[0-9]$'),
  is_sample   boolean     NOT NULL DEFAULT false,
  sort_order  integer     NOT NULL,
  active      boolean     NOT NULL DEFAULT true,
  -- No index: the table holds at most 15 rows, so the FK check on user delete is trivial.
  updated_by  text        REFERENCES public."user"(id) ON DELETE SET NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.emergency_contacts (agency, label, phone, is_sample, sort_order)
SELECT v.agency, v.label, v.phone, v.is_sample, v.sort_order
FROM (VALUES
  ('National Emergency', 'Emergency hotline', '911', false, 1),
  ('MDRRMO Bacolor', 'Globe', '0987 654 3210', true, 2),
  ('MDRRMO Bacolor', 'Smart', '0987 654 3210', true, 3),
  ('MDRRMO Bacolor', 'Landline', '045 900-0199', true, 4),
  ('BFP Bacolor', 'Fire station', '0987 654 3210', true, 5),
  ('PNP Bacolor', 'Police station', '0987 654 3210', true, 6)
) AS v(agency, label, phone, is_sample, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.emergency_contacts);

-- Integer list version for optimistic locking; every saved PUT increments it.
INSERT INTO public.system_settings (key, value) VALUES ('emergency_contacts_version', '1')
ON CONFLICT (key) DO NOTHING;

-- Devices a user has signed in from, remembered independently of sessions. The "new login" email
-- used to look at live sessions only, and sign-out, expiry, force-logout-all and restores delete
-- them, so the same phone was reported as new on every sign-in. One row per browser family and OS
-- (utils/userAgent.js deviceKey). The primary key's leading user_id also serves the FK cascade.
-- Rows for existing sessions are added at server start (securityService.backfillKnownDevices),
-- because normalising a User-Agent is done in JS, not SQL.
CREATE TABLE IF NOT EXISTS public.user_known_devices (
  user_id        text        NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  browser_family text        NOT NULL,
  os_family      text        NOT NULL,
  first_seen_at  timestamptz NOT NULL DEFAULT now(),
  last_seen_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, browser_family, os_family)
);

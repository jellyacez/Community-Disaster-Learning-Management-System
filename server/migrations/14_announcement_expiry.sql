-- Migration: 14_announcement_expiry.sql
-- Description: Urgent advisories now end. An urgent announcement is "in effect" until
-- expires_at passes or an admin lifts it (lifted_at); after that it is no longer pinned
-- above the feed. Idempotent, so setup.js can re-run it.

ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS lifted_at timestamp with time zone;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS lifted_by text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_announcements_lifted_by') THEN
    ALTER TABLE public.announcements
      ADD CONSTRAINT fk_announcements_lifted_by
      FOREIGN KEY (lifted_by) REFERENCES public."user"(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Urgent advisories posted before this migration had no end, so they stayed pinned forever.
-- Give them the same 24-hour default window, counted from when they were posted.
UPDATE public.announcements
SET expires_at = date + INTERVAL '24 hours'
WHERE priority = 'urgent' AND expires_at IS NULL;

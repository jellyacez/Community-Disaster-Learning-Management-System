-- Migration: 15_user_archived_default.sql
-- Description: Editing a user's name/email set "user".archived to NULL, because the edit
-- form doesn't send archived. NULL reads as "not archived" at sign-in but drops the user
-- from every count that filters on archived = false. Treat those rows as not archived
-- (their effective state) and default the column so new rows can't be NULL either.
-- Idempotent, so setup.js can re-run it.

UPDATE public."user" SET archived = false WHERE archived IS NULL;

ALTER TABLE public."user" ALTER COLUMN archived SET DEFAULT false;

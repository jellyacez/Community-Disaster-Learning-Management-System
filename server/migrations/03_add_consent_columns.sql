-- Add consent tracking columns to "user" table
ALTER TABLE public."user"
  ADD COLUMN consent_given_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  ADD COLUMN consent_version TEXT DEFAULT NULL;

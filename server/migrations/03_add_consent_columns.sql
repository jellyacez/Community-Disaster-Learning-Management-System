BEGIN;

-- Add consent tracking columns safely if they do not already exist
ALTER TABLE public."user"
    ADD COLUMN IF NOT EXISTS consent_given_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS consent_version TEXT DEFAULT NULL;

-- Optional index for auditing and filtering users by consent status/version
CREATE INDEX IF NOT EXISTS idx_user_consent_version 
    ON public."user" (consent_version);

COMMIT;
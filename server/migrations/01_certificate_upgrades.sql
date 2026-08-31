BEGIN;

-- 1. Safely add the column if not already present
ALTER TABLE public.certificates 
    ADD COLUMN IF NOT EXISTS verification_token UUID;

-- 2. Safely recreate/add the unique constraint without duplicate errors
ALTER TABLE public.certificates 
    DROP CONSTRAINT IF EXISTS uq_certificates_verification_token;

ALTER TABLE public.certificates 
    ADD CONSTRAINT uq_certificates_verification_token UNIQUE (verification_token);

COMMIT;
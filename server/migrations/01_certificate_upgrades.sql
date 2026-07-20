ALTER TABLE public.certificates ADD COLUMN verification_token UUID;
UPDATE public.certificates SET verification_token = gen_random_uuid() WHERE verification_token IS NULL;
ALTER TABLE public.certificates ALTER COLUMN verification_token SET NOT NULL;
ALTER TABLE public.certificates ADD CONSTRAINT uq_certificates_verification_token UNIQUE (verification_token);

ALTER TABLE public.certificates ADD COLUMN expires_at TIMESTAMP;
ALTER TABLE public.certificates ADD COLUMN status VARCHAR(50) DEFAULT 'active' NOT NULL;

-- Fix 2 Unique constraint
ALTER TABLE public.certificates ADD CONSTRAINT uq_certificates_user_module UNIQUE (user_id, module_id);

-- Fix 3 result_id nullable
ALTER TABLE public.certificates ALTER COLUMN result_id DROP NOT NULL;

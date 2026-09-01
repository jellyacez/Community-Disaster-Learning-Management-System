BEGIN;

-- 1. Add revocation columns safely if they do not already exist
ALTER TABLE public.certificates 
    ADD COLUMN IF NOT EXISTS revocation_reason TEXT,
    ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS revoked_by TEXT;

-- 2. Safely add the foreign key constraint without collision errors
ALTER TABLE public.certificates 
    DROP CONSTRAINT IF EXISTS fk_certificates_revoked_by;

ALTER TABLE public.certificates 
    ADD CONSTRAINT fk_certificates_revoked_by 
    FOREIGN KEY (revoked_by) 
    REFERENCES public."user" (id) 
    ON DELETE SET NULL;

-- 3. Optional performance index for querying revoked certificates/audits
CREATE INDEX IF NOT EXISTS idx_certificates_revoked_at 
    ON public.certificates (revoked_at);

COMMIT;
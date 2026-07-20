ALTER TABLE public.certificates ADD COLUMN revocation_reason TEXT;
ALTER TABLE public.certificates ADD COLUMN revoked_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.certificates ADD COLUMN revoked_by TEXT;
ALTER TABLE public.certificates ADD CONSTRAINT fk_certificates_revoked_by FOREIGN KEY (revoked_by) REFERENCES public."user" (id);

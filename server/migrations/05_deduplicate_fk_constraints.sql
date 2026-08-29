-- Migration: 05_deduplicate_fk_constraints.sql
-- Description: Drop redundant duplicate foreign key constraints accumulated from previous setup iterations and ensure single canonical named foreign keys.

BEGIN;

-- 1. Drop existing legacy/duplicate constraint handles if present
ALTER TABLE public.certificates DROP CONSTRAINT IF EXISTS fk_user CASCADE;
ALTER TABLE public.certificates DROP CONSTRAINT IF EXISTS fk_certificates_user_id CASCADE;

ALTER TABLE public.module_activity DROP CONSTRAINT IF EXISTS fk_user CASCADE;
ALTER TABLE public.module_activity DROP CONSTRAINT IF EXISTS fk_module CASCADE;
ALTER TABLE public.module_activity DROP CONSTRAINT IF EXISTS fk_module_activity_user_id CASCADE;
ALTER TABLE public.module_activity DROP CONSTRAINT IF EXISTS fk_module_activity_mod_id CASCADE;

ALTER TABLE public.user_step_progress DROP CONSTRAINT IF EXISTS fk_user CASCADE;
ALTER TABLE public.user_step_progress DROP CONSTRAINT IF EXISTS fk_user_step_progress_user_id CASCADE;

ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS fk_module CASCADE;
ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS fk_questions_mod_id CASCADE;

-- 2. Add canonical, uniquely-named foreign key constraints
ALTER TABLE public.certificates
    ADD CONSTRAINT fk_certificates_user_id FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE SET NULL;

ALTER TABLE public.module_activity
    ADD CONSTRAINT fk_module_activity_user_id FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;

ALTER TABLE public.module_activity
    ADD CONSTRAINT fk_module_activity_mod_id FOREIGN KEY (mod_id) REFERENCES public.module_data(mod_id) ON DELETE CASCADE;

ALTER TABLE public.user_step_progress
    ADD CONSTRAINT fk_user_step_progress_user_id FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;

ALTER TABLE public.questions
    ADD CONSTRAINT fk_questions_mod_id FOREIGN KEY (mod_id) REFERENCES public.module_data(mod_id) ON DELETE CASCADE;

COMMIT;

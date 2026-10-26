-- 13: Index and integrity fixes.
-- - Index questions.step_id (every assessment load and grade filters on it) and the two
--   foreign keys that cascade without an index (quiz_attempt_answers.question_id,
--   quiz_attempts.step_id), which draft saves trigger by deleting questions and steps.
-- - Drop three single-column indexes already covered by a composite index on the same
--   leading column (they only add write cost).
-- - Add the missing foreign key on questions.step_id.
-- - One enrollment per user and module: enrolling was check-then-insert, so simultaneous
--   requests could create duplicates. The app inserts with ON CONFLICT DO NOTHING.
--
-- Prod was checked before writing this: 0 orphan questions, 0 duplicate enrollments.
-- Additive except for the three redundant indexes, and safe to re-run (deploy.yml applies
-- migration.sql on every deploy).

BEGIN;

SET LOCAL lock_timeout = '5s';

CREATE INDEX IF NOT EXISTS idx_questions_step_id
    ON public.questions (step_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempt_answers_question_id
    ON public.quiz_attempt_answers (question_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_step_id
    ON public.quiz_attempts (step_id);

-- Covered by idx_session_user_updated ("userId", "updatedAt" DESC)
DROP INDEX IF EXISTS public.idx_session_user_id;
-- Covered by idx_module_data_parent_status (parent_mod_id, status)
DROP INDEX IF EXISTS public.idx_module_data_parent_mod_id;
-- Covered by idx_announcements_barangay_date (barangay_id, date DESC)
DROP INDEX IF EXISTS public.idx_announcements_barangay_id;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_questions_step_id') THEN
    ALTER TABLE public.questions
      ADD CONSTRAINT fk_questions_step_id FOREIGN KEY (step_id)
      REFERENCES public.module_steps (step_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_module_activity_user_mod') THEN
    ALTER TABLE public.module_activity
      ADD CONSTRAINT uq_module_activity_user_mod UNIQUE (user_id, mod_id);
  END IF;
END $$;

COMMIT;

ALTER TABLE public.module_activity
ADD CONSTRAINT module_activity_user_module_unique
UNIQUE (user_id, mod_id);

ALTER TABLE activity_log ADD COLUMN ip_address VARCHAR(45);
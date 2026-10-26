-- 12: Per-question explanation and situational interaction type.
-- rationale: one explanation for the whole question, shown after answering (used by
--   action-sequence scenarios, which have no per-choice rationale).
-- interaction_type: how a situational question is answered. NULL keeps the old behavior of
--   inferring it from the answer key, so existing questions need no update.
--
-- Additive only and safe to re-run (deploy.yml applies migration.sql on every deploy).

BEGIN;

SET LOCAL lock_timeout = '5s';

ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS rationale text;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS interaction_type varchar(32);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'questions_interaction_type_check') THEN
    ALTER TABLE public.questions ADD CONSTRAINT questions_interaction_type_check CHECK (
      interaction_type IS NULL
      OR interaction_type IN ('priority_action', 'hazard_identification', 'action_sequence')
    );
  END IF;
END $$;

COMMIT;

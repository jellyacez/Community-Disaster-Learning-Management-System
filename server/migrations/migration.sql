-- 10: Server-owned attempts for final assessments.
-- The server keeps the question order, the current question's deadline, and each
-- recorded answer, and grades only what it recorded. The answer key never reaches
-- the learner before an answer is locked in.
--
-- Additive only and safe to re-run (deploy.yml applies migration.sql on every deploy).

BEGIN;

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    attempt_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    mod_id integer NOT NULL REFERENCES public.module_data(mod_id) ON DELETE CASCADE,
    step_id integer NOT NULL REFERENCES public.module_steps(step_id) ON DELETE CASCADE,
    -- [{ "questionId": n, "optionIds": [n, ...] }] in the order the learner sees them
    question_order jsonb NOT NULL,
    current_index integer NOT NULL DEFAULT 0,
    question_deadline timestamp with time zone,
    tab_switch_count integer NOT NULL DEFAULT 0,
    status character varying(20) NOT NULL DEFAULT 'open',
    started_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at timestamp with time zone,
    CONSTRAINT quiz_attempts_status_check CHECK (status IN ('open', 'submitted', 'expired', 'locked'))
);

-- At most one open attempt per learner per assessment step
CREATE UNIQUE INDEX IF NOT EXISTS uq_quiz_attempts_one_open
    ON public.quiz_attempts (user_id, step_id) WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_step
    ON public.quiz_attempts (user_id, step_id);

CREATE TABLE IF NOT EXISTS public.quiz_attempt_answers (
    attempt_id integer NOT NULL REFERENCES public.quiz_attempts(attempt_id) ON DELETE CASCADE,
    question_id integer NOT NULL REFERENCES public.questions(question_id) ON DELETE CASCADE,
    selected_choice_ids integer[] NOT NULL DEFAULT '{}',
    timed_out boolean NOT NULL DEFAULT false,
    answered_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- First answer wins: a question can be answered once per attempt
    PRIMARY KEY (attempt_id, question_id)
);

COMMIT;

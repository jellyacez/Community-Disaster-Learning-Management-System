-- Migration: 06_add_performance_indexes.sql
-- Description: Adds missing indexes on Foreign Key columns and high-frequency query paths (catalog partial index, session telemetry, announcement sorting, quiz results).

-- ============================================================================
-- 1. FOREIGN KEY SUPPORTING INDEXES
-- ============================================================================

-- Session table: Foreign key on "userId" references "user"(id)
CREATE INDEX IF NOT EXISTS idx_session_user_id 
    ON public."session" ("userId");

-- Module Data: Self-referencing FK parent_mod_id for versioning & draft parent lookups
CREATE INDEX IF NOT EXISTS idx_module_data_parent_mod_id 
    ON public.module_data (parent_mod_id);

-- Module Data: Foreign key on author_id references "user"(id)
CREATE INDEX IF NOT EXISTS idx_module_data_author_id 
    ON public.module_data (author_id);

-- User: Foreign key on barangay_id references barangays(id)
CREATE INDEX IF NOT EXISTS idx_user_barangay_id 
    ON public."user" (barangay_id);

-- User Step Progress: Foreign key on step_id references module_steps(step_id)
CREATE INDEX IF NOT EXISTS idx_user_step_progress_step_id 
    ON public.user_step_progress (step_id);

-- Results: Foreign keys on user_id and mod_id
CREATE INDEX IF NOT EXISTS idx_results_user_mod 
    ON public.results (user_id, mod_id);

CREATE INDEX IF NOT EXISTS idx_results_mod_id 
    ON public.results (mod_id);

-- Announcements: Foreign keys on author_id and barangay_id
CREATE INDEX IF NOT EXISTS idx_announcements_author_id 
    ON public.announcements (author_id);

CREATE INDEX IF NOT EXISTS idx_announcements_barangay_id 
    ON public.announcements (barangay_id);

-- Certificates: Foreign keys on revoked_by and modact_id
CREATE INDEX IF NOT EXISTS idx_certificates_revoked_by 
    ON public.certificates (revoked_by);

CREATE INDEX IF NOT EXISTS idx_certificates_modact_id 
    ON public.certificates (modact_id);

-- Questions & Choices: Foreign keys for quiz hierarchy
CREATE INDEX IF NOT EXISTS idx_choices_question_id 
    ON public.choices (question_id);

CREATE INDEX IF NOT EXISTS idx_questions_mod_id 
    ON public.questions (mod_id);

-- User Notifications: Foreign key on user_id references "user"(id)
CREATE INDEX IF NOT EXISTS idx_user_notification_user_id 
    ON public.user_notification (user_id);


-- ============================================================================
-- 2. HIGH-FREQUENCY COMPOSITE & PARTIAL QUERY INDEXES
-- ============================================================================

-- Partial Index for Resident Module Catalog:
-- Accelerates high-frequency resident queries (getAvailableModules, dashboard counts)
-- by indexing ONLY active published modules without wasting memory on drafts/archived modules.
CREATE INDEX IF NOT EXISTS idx_module_data_published 
    ON public.module_data (mod_id DESC) 
    WHERE status = 'published' AND moddateremove IS NULL;

-- Admin Module Management & Draft Parent Lookup:
CREATE INDEX IF NOT EXISTS idx_module_data_parent_status 
    ON public.module_data (parent_mod_id, status);

CREATE INDEX IF NOT EXISTS idx_module_data_status_dateadd 
    ON public.module_data (status, moddateadd DESC);

-- User Session Telemetry:
-- Optimizes GET /api/users/me/sessions (WHERE "userId" = $1 ORDER BY "updatedAt" DESC LIMIT 5)
-- eliminating in-memory sorting.
CREATE INDEX IF NOT EXISTS idx_session_user_updated 
    ON public."session" ("userId", "updatedAt" DESC);

-- Announcements Sorting & Feeds:
CREATE INDEX IF NOT EXISTS idx_announcements_date_desc 
    ON public.announcements (date DESC);

CREATE INDEX IF NOT EXISTS idx_announcements_barangay_date 
    ON public.announcements (barangay_id, date DESC);

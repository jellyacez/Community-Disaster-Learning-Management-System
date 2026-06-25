--
-- PostgreSQL database dump
--

\restrict asItH3YRlPFulc1kjenzQyDE7XE5cx8lhlYNrr39EQg1Nic4GMFsbTncJ33Yyi5

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

-- Started on 2026-06-22 18:08:29

SET statement_timeout = 0;

SET lock_timeout = 0;

SET idle_in_transaction_session_timeout = 0;

SET transaction_timeout = 0;

SET client_encoding = 'UTF8';

SET standard_conforming_strings = on;

SELECT pg_catalog.set_config ('search_path', '', false);

SET check_function_bodies = false;

SET xmloption = content;

SET client_min_messages = warning;

SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 221 (class 1259 OID 16520)
-- Name: account; Type: TABLE; Schema: public; Owner: postgres
--

-- ==========================================
-- 1. INDEPENDENT TABLES (No Foreign Keys)
-- ==========================================

-- ==========================================
-- 1. INDEPENDENT TABLES (No Foreign Keys)
-- ==========================================

CREATE TABLE public."user" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    "emailVerified" boolean NOT NULL,
    image text,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    barangay text NOT NULL,
    role text,
    banned boolean,
    "banReason" text,
    "banExpires" timestamp with time zone,
    archived boolean,
    "lastPasswordChange" timestamp without time zone,
    "twoFactorEnabled" boolean,
    CONSTRAINT user_pkey PRIMARY KEY (id),
    CONSTRAINT user_email_key UNIQUE (email)
);

CREATE TABLE public.module_data (
    mod_id integer GENERATED ALWAYS AS IDENTITY,
    modname character varying(500) NOT NULL,
    moddateadd date NOT NULL,
    moddateremove date NOT NULL,
    modcat character varying(50) NOT NULL,
    description character varying(500),
    level character varying(50),
    duration character varying(50),
    video_url character varying(500),
    image_url character varying(500) DEFAULT NULL,
    CONSTRAINT module_data_pkey PRIMARY KEY (mod_id)
);

CREATE TABLE public.verification (
    id text NOT NULL,
    identifier text NOT NULL,
    value text NOT NULL,
    "expiresAt" timestamp
    with
        time zone NOT NULL,
        "createdAt" timestamp
    with
        time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updatedAt" timestamp
    with
        time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        CONSTRAINT verification_pkey PRIMARY KEY (id)
);

-- ==========================================
-- 2. DEPENDENT TABLES (Level 1 - Direct Refs)
-- ==========================================

CREATE TABLE public.account (
    id text NOT NULL,
    "accountId" text NOT NULL,
    "providerId" text NOT NULL,
    "userId" text NOT NULL,
    "accessToken" text,
    "refreshToken" text,
    "idToken" text,
    "accessTokenExpiresAt" timestamp with time zone,
    "refreshTokenExpiresAt" timestamp with time zone,
    scope text,
    password text,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    CONSTRAINT account_pkey PRIMARY KEY (id),
    CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE
);

CREATE TABLE public.session (
    id text NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    token text NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "userId" text NOT NULL,
    "impersonatedBy" text,
    CONSTRAINT session_pkey PRIMARY KEY (id),
    CONSTRAINT session_token_key UNIQUE (token),
    CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE
);

CREATE TABLE public."twoFactor" (
    id text NOT NULL,
    secret text NOT NULL,
    "backupCodes" text NOT NULL,
    "userId" text NOT NULL,
    verified boolean,
    CONSTRAINT "twoFactor_pkey" PRIMARY KEY (id),
    CONSTRAINT "twoFactor_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE
);

CREATE TABLE public.activity_log (
    act_id integer GENERATED ALWAYS AS IDENTITY,
    user_id text NOT NULL,
    act_date date NOT NULL,
    act_log character varying(500) NOT NULL,
    CONSTRAINT activity_log_pkey PRIMARY KEY (act_id),
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE
);

CREATE TABLE public.announcements (
    id integer GENERATED ALWAYS AS IDENTITY,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    date timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    author_id text NOT NULL,
    CONSTRAINT announcements_pkey PRIMARY KEY (id),
    CONSTRAINT fk_author FOREIGN KEY (author_id) REFERENCES public."user"(id) ON DELETE CASCADE
);

CREATE TABLE public.module_activity (
    modact_id integer GENERATED ALWAYS AS IDENTITY,
    user_id text NOT NULL,
    mod_id integer NOT NULL,
    modstatus character varying(100) NOT NULL,
    modstart character varying(100) NOT NULL,
    modend character varying(100) NOT NULL,
    CONSTRAINT module_activity_pkey PRIMARY KEY (modact_id),
    CONSTRAINT fk_module FOREIGN KEY (mod_id) REFERENCES public.module_data(mod_id) ON DELETE CASCADE,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE
);

CREATE TABLE public.questions (
    question_id integer GENERATED ALWAYS AS IDENTITY,
    mod_id integer NOT NULL,
    question_text text NOT NULL,
    points integer DEFAULT 1,
    date_added timestamp
    with
        time zone DEFAULT CURRENT_TIMESTAMP,
        image_url character varying(500) DEFAULT NULL,
        CONSTRAINT questions_pkey PRIMARY KEY (question_id),
        CONSTRAINT fk_module FOREIGN KEY (mod_id) REFERENCES public.module_data (mod_id) ON DELETE CASCADE
);

CREATE TABLE public.results (
    result_id integer GENERATED ALWAYS AS IDENTITY,
    user_id text NOT NULL,
    mod_id integer NOT NULL,
    score integer NOT NULL,
    total_points integer NOT NULL,
    passed boolean NOT NULL,
    date_taken timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT results_pkey PRIMARY KEY (result_id),
    CONSTRAINT fk_quiz_module FOREIGN KEY (mod_id) REFERENCES public.module_data(mod_id) ON DELETE CASCADE,
    CONSTRAINT fk_quiz_user FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE
);

CREATE TABLE public.module_steps (
    step_id integer GENERATED ALWAYS AS IDENTITY,
    mod_id integer NOT NULL,
    step_order integer NOT NULL,
    step_title character varying(255),
    step_content text,
    media_url character varying(500),
    step_type character varying(50) NOT NULL,
    CONSTRAINT module_steps_pkey PRIMARY KEY (step_id),
    CONSTRAINT fk_module_steps FOREIGN KEY (mod_id) REFERENCES public.module_data (mod_id) ON DELETE CASCADE,
    CONSTRAINT module_steps_mod_id_step_order_key UNIQUE (mod_id, step_order)
);

-- ==========================================
-- 3. DEPENDENT TABLES (Level 2 - Deep Refs)
-- ==========================================

CREATE TABLE public.certificates (
    cert_id integer GENERATED ALWAYS AS IDENTITY,
    user_id text NOT NULL,
    modact_id integer NOT NULL,
    result_id integer NOT NULL,
    cert_rec character varying(100) NOT NULL,
    CONSTRAINT certificates_pkey PRIMARY KEY (cert_id),
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE,
    CONSTRAINT fk_modact FOREIGN KEY (modact_id) REFERENCES public.module_activity(modact_id) ON DELETE CASCADE
);

CREATE TABLE public.choices (
    choice_id integer GENERATED ALWAYS AS IDENTITY,
    question_id integer NOT NULL,
    choice_text text NOT NULL,
    is_correct boolean DEFAULT false NOT NULL,
    CONSTRAINT choices_pkey PRIMARY KEY (choice_id),
    CONSTRAINT fk_question FOREIGN KEY (question_id) REFERENCES public.questions (question_id) ON DELETE CASCADE
);

-- ==========================================
-- 4. PERFORMANCE LOOKUP INDEXES
-- ==========================================

CREATE INDEX "account_userId_idx" ON public.account USING btree ("userId");

CREATE INDEX "session_userId_idx" ON public.session USING btree ("userId");

CREATE INDEX "twoFactor_secret_idx" ON public."twoFactor" USING btree (secret);

CREATE INDEX "twoFactor_userId_idx" ON public."twoFactor" USING btree ("userId");

CREATE INDEX verification_identifier_idx ON public.verification USING btree (identifier);

\unrestrict asItH3YRlPFulc1kjenzQyDE7XE5cx8lhlYNrr39EQg1Nic4GMFsbTncJ33Yyi5
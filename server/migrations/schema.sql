--
-- PostgreSQL database dump
--

\restrict PWR4abVGpcklyPIMsb6o0adK1Xofk3HkhnHmhb7g2ISaYEzawv8oOjI50l16ENq

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: rate_limit; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA rate_limit;


ALTER SCHEMA rate_limit OWNER TO postgres;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'resident',
    'head_mdrrmo_admin',
    'mdrrmo_admin',
    'barangay_admin',
    'system_admin'
);


ALTER TYPE public.user_role OWNER TO postgres;

--
-- Name: agg_decrement(text, text, timestamp with time zone); Type: FUNCTION; Schema: rate_limit; Owner: postgres
--

CREATE FUNCTION rate_limit.agg_decrement(key_ text, prefix text, reference_time timestamp with time zone DEFAULT now()) RETURNS void
    LANGUAGE plpgsql
    AS $_$
    DECLARE 
        in_session_id uuid;
        session_type text = 'aggregated';
    BEGIN
    
	select id
    FROM rate_limit.session_select($2, session_type)
    WHERE expires_at > $3
    INTO in_session_id;

    UPDATE rate_limit.records_aggregated
    SET count = greatest(0, count-1)
    WHERE key = $1 and session_id = in_session_id;
    END;
$_$;


ALTER FUNCTION rate_limit.agg_decrement(key_ text, prefix text, reference_time timestamp with time zone) OWNER TO postgres;

--
-- Name: agg_increment(text, text, double precision, timestamp with time zone); Type: FUNCTION; Schema: rate_limit; Owner: postgres
--

CREATE FUNCTION rate_limit.agg_increment(key_ text, prefix text, window_ms double precision, reference_time timestamp with time zone DEFAULT now()) RETURNS record
    LANGUAGE plpgsql
    AS $_$
    DECLARE
        in_session_id uuid;
        in_session_expiration timestamptz;
        session_type text = 'aggregated';
        record_count int = 0;
        ret RECORD;
    BEGIN

	Lock table rate_limit.sessions;
	    
    SELECT id, expires_at
    FROM rate_limit.session_select($2, session_type)
    WHERE expires_at > $4
    INTO in_session_id, in_session_expiration;
  
    IF in_session_id is null THEN
        in_session_expiration = to_timestamp(extract (epoch from $4)+ $3/1000.0);
        SELECT id, in_session_expiration
        FROM rate_limit.session_reset(
            $2, session_type, in_session_expiration
        ) 
        INTO in_session_id;
    END IF;


    INSERT INTO rate_limit.records_aggregated(key, session_id)
    VALUES ($1, in_session_id)
    ON CONFLICT ON CONSTRAINT unique_session_key DO UPDATE
    SET count = records_aggregated.count + 1
    RETURNING count INTO record_count;
   
   	ret:= (record_count, in_session_expiration);

    RETURN ret;
    END; 
$_$;


ALTER FUNCTION rate_limit.agg_increment(key_ text, prefix text, window_ms double precision, reference_time timestamp with time zone) OWNER TO postgres;

--
-- Name: agg_reset_key(text, text, timestamp with time zone); Type: FUNCTION; Schema: rate_limit; Owner: postgres
--

CREATE FUNCTION rate_limit.agg_reset_key(key_ text, prefix text, reference_time timestamp with time zone DEFAULT now()) RETURNS void
    LANGUAGE plpgsql
    AS $_$
    DECLARE 
        in_session_id uuid;
        session_type text = 'aggregated';
    BEGIN
    
    SELECT id
    FROM rate_limit.session_select($2, session_type)
    WHERE expires_at > $3
    INTO in_session_id;

    DELETE FROM rate_limit.records_aggregated
    WHERE key = $1 and session_id = in_session_id;
    END;
$_$;


ALTER FUNCTION rate_limit.agg_reset_key(key_ text, prefix text, reference_time timestamp with time zone) OWNER TO postgres;

--
-- Name: agg_reset_session(text, timestamp with time zone); Type: FUNCTION; Schema: rate_limit; Owner: postgres
--

CREATE FUNCTION rate_limit.agg_reset_session(prefix text, reference_time timestamp with time zone DEFAULT now()) RETURNS void
    LANGUAGE plpgsql
    AS $_$
    DECLARE 
        in_session_id uuid;
        session_type text = 'aggregated';
    BEGIN
    
    SELECT id
    FROM rate_limit.session_select($1, session_type)
    WHERE expires_at > $2
    INTO in_session_id;

    DELETE FROM rate_limit.records_aggregated
    WHERE session_id = in_session_id;
    END;
$_$;


ALTER FUNCTION rate_limit.agg_reset_session(prefix text, reference_time timestamp with time zone) OWNER TO postgres;

--
-- Name: ind_decrement(text, text, timestamp with time zone); Type: FUNCTION; Schema: rate_limit; Owner: postgres
--

CREATE FUNCTION rate_limit.ind_decrement(key_ text, prefix text, reference_time timestamp with time zone DEFAULT now()) RETURNS void
    LANGUAGE plpgsql
    AS $_$
    DECLARE 
        in_session_id uuid;
        session_type text = 'individual';
    BEGIN
    
    SELECT id
    FROM rate_limit.session_select($2, session_type)
    WHERE expires_at > $3
    INTO in_session_id;

    WITH 
    rows_to_delete AS (
        SELECT id FROM rate_limit.individual_records
        WHERE key = $1 and session_id = in_session_id ORDER BY event_time LIMIT 1
        )
    DELETE FROM rate_limit.individual_records 
    USING rows_to_delete WHERE individual_records.id = rows_to_delete.id;
    END;
$_$;


ALTER FUNCTION rate_limit.ind_decrement(key_ text, prefix text, reference_time timestamp with time zone) OWNER TO postgres;

--
-- Name: ind_increment(text, text, double precision, timestamp with time zone); Type: FUNCTION; Schema: rate_limit; Owner: postgres
--

CREATE FUNCTION rate_limit.ind_increment(key_ text, prefix text, window_ms double precision, reference_time timestamp with time zone DEFAULT now()) RETURNS record
    LANGUAGE plpgsql
    AS $_$
    DECLARE
        in_session_id uuid;
        in_session_expiration timestamptz;
        session_type text = 'individual';
        record_count int = 0;
        ret RECORD;
    BEGIN

    LOCK TABLE rate_limit.sessions;
    
    SELECT id, expires_at
    FROM rate_limit.session_select($2, session_type)
    WHERE expires_at > $4
    INTO in_session_id, in_session_expiration;
  
    IF in_session_id is null THEN
        in_session_expiration = to_timestamp(extract (epoch from $4)+ $3/1000.0);
        SELECT id, in_session_expiration
        FROM rate_limit.session_reset(
            $2, session_type, in_session_expiration
        ) 
        INTO in_session_id;
    END IF;


    INSERT INTO rate_limit.individual_records(key, session_id) VALUES ($1, in_session_id);
    
    SELECT count(id)::int AS count FROM rate_limit.individual_records WHERE key = $1 AND session_id = in_session_id
    INTO record_count;
   
   	ret:= (record_count, in_session_expiration);

    RETURN ret;
    END; 
$_$;


ALTER FUNCTION rate_limit.ind_increment(key_ text, prefix text, window_ms double precision, reference_time timestamp with time zone) OWNER TO postgres;

--
-- Name: ind_reset_key(text, text, timestamp with time zone); Type: FUNCTION; Schema: rate_limit; Owner: postgres
--

CREATE FUNCTION rate_limit.ind_reset_key(key_ text, prefix text, reference_time timestamp with time zone DEFAULT now()) RETURNS void
    LANGUAGE plpgsql
    AS $_$
    DECLARE 
        in_session_id uuid;
        session_type text = 'individual';
    BEGIN
    
    SELECT id
    FROM rate_limit.session_select($2, session_type)
    WHERE expires_at > $3
    INTO in_session_id;

    DELETE FROM rate_limit.individual_records
    WHERE key = $1 AND session_id = in_session_id;
    END;
$_$;


ALTER FUNCTION rate_limit.ind_reset_key(key_ text, prefix text, reference_time timestamp with time zone) OWNER TO postgres;

--
-- Name: ind_reset_session(text, timestamp with time zone); Type: FUNCTION; Schema: rate_limit; Owner: postgres
--

CREATE FUNCTION rate_limit.ind_reset_session(prefix text, reference_time timestamp with time zone DEFAULT now()) RETURNS void
    LANGUAGE plpgsql
    AS $_$
    DECLARE 
        in_session_id uuid;
        session_type text = 'individual';
    BEGIN
    
    SELECT id
    FROM rate_limit.session_select($1, session_type)
    WHERE expires_at > $2
    INTO in_session_id;

    DELETE FROM rate_limit.individual_records
    WHERE session_id = in_session_id;
    END;
$_$;


ALTER FUNCTION rate_limit.ind_reset_session(prefix text, reference_time timestamp with time zone) OWNER TO postgres;

--
-- Name: session_reset(text, text, timestamp with time zone); Type: FUNCTION; Schema: rate_limit; Owner: postgres
--

CREATE FUNCTION rate_limit.session_reset(name_ text, type_ text, expires_at_ timestamp with time zone) RETURNS TABLE(id uuid, name_ text, type_ text)
    LANGUAGE sql
    AS $_$
    DELETE FROM rate_limit.sessions 
    WHERE name_ = $1 AND type_ = $2;

    INSERT INTO rate_limit.sessions(name_, type_, expires_at) 
    SELECT $1, $2, $3 
    RETURNING id, name_, type_;
$_$;


ALTER FUNCTION rate_limit.session_reset(name_ text, type_ text, expires_at_ timestamp with time zone) OWNER TO postgres;

--
-- Name: session_select(text, text); Type: FUNCTION; Schema: rate_limit; Owner: postgres
--

CREATE FUNCTION rate_limit.session_select(name_ text, type_ text) RETURNS TABLE(id uuid, name_ text, type_ text, expires_at timestamp with time zone)
    LANGUAGE sql
    AS $_$
    SELECT id, name_, type_, expires_at
    FROM rate_limit.sessions
    WHERE name_ = $1 AND type_ = $2
    LIMIT 1;
$_$;


ALTER FUNCTION rate_limit.session_select(name_ text, type_ text) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account; Type: TABLE; Schema: public; Owner: postgres
--

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
    "updatedAt" timestamp with time zone NOT NULL
);


ALTER TABLE public.account OWNER TO postgres;

--
-- Name: activity_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity_log (
    act_id integer NOT NULL,
    user_id text,
    act_date timestamp with time zone NOT NULL,
    act_log character varying(500) NOT NULL
);


ALTER TABLE public.activity_log OWNER TO postgres;

--
-- Name: activity_log_act_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.activity_log ALTER COLUMN act_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.activity_log_act_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: announcements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.announcements (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    date timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    author_id text NOT NULL
);


ALTER TABLE public.announcements OWNER TO postgres;

--
-- Name: announcements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.announcements ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.announcements_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: barangays; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.barangays (
    id integer NOT NULL,
    name character varying(100) NOT NULL
);


ALTER TABLE public.barangays OWNER TO postgres;

--
-- Name: barangays_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.barangays_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.barangays_id_seq OWNER TO postgres;

--
-- Name: barangays_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.barangays_id_seq OWNED BY public.barangays.id;


--
-- Name: blocked_ips; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.blocked_ips (
    id integer NOT NULL,
    ip_address character varying(45) NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.blocked_ips OWNER TO postgres;

--
-- Name: blocked_ips_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.blocked_ips_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.blocked_ips_id_seq OWNER TO postgres;

--
-- Name: blocked_ips_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.blocked_ips_id_seq OWNED BY public.blocked_ips.id;


--
-- Name: certificates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.certificates (
    cert_id integer NOT NULL,
    user_id text,
    modact_id integer NOT NULL,
    result_id integer,
    cert_rec character varying(100) NOT NULL,
    anonymized_name character varying(255),
    barangay character varying(255),
    module_id integer,
    completion_date timestamp without time zone,
    verification_token uuid NOT NULL,
    expires_at timestamp without time zone,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    revocation_reason text,
    revoked_at timestamp with time zone,
    revoked_by text
);


ALTER TABLE public.certificates OWNER TO postgres;

--
-- Name: certificates_cert_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.certificates ALTER COLUMN cert_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.certificates_cert_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: choices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.choices (
    choice_id integer NOT NULL,
    question_id integer NOT NULL,
    choice_text text NOT NULL,
    is_correct boolean DEFAULT false NOT NULL,
    rationale text,
    sequence_order integer
);


ALTER TABLE public.choices OWNER TO postgres;

--
-- Name: choices_choice_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.choices ALTER COLUMN choice_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.choices_choice_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: feedbacks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.feedbacks (
    id integer NOT NULL,
    user_id text,
    recipient text NOT NULL,
    type text NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.feedbacks OWNER TO postgres;

--
-- Name: feedbacks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.feedbacks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.feedbacks_id_seq OWNER TO postgres;

--
-- Name: feedbacks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.feedbacks_id_seq OWNED BY public.feedbacks.id;


--
-- Name: levels; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.levels (
    level_id integer NOT NULL,
    mod_id integer NOT NULL,
    level_order integer NOT NULL,
    level_title character varying(255) NOT NULL,
    level_description text,
    passing_threshold integer DEFAULT 80,
    is_locked_by_default boolean DEFAULT true
);


ALTER TABLE public.levels OWNER TO postgres;

--
-- Name: levels_level_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.levels ALTER COLUMN level_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.levels_level_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.migrations OWNER TO postgres;

--
-- Name: module_activity; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.module_activity (
    modact_id integer NOT NULL,
    user_id text NOT NULL,
    mod_id integer NOT NULL,
    modstatus character varying(100) NOT NULL,
    progress integer DEFAULT 0 CONSTRAINT module_activity_modstart_not_null NOT NULL,
    started_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp with time zone
);


ALTER TABLE public.module_activity OWNER TO postgres;

--
-- Name: module_activity_modact_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.module_activity ALTER COLUMN modact_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.module_activity_modact_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: module_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.module_data (
    mod_id integer NOT NULL,
    modname character varying(500) NOT NULL,
    moddateadd timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    moddateremove timestamp with time zone,
    modcat character varying(50) NOT NULL,
    description character varying(500),
    level character varying(50),
    duration character varying(50),
    video_url character varying(500),
    image_url character varying(500) DEFAULT NULL::character varying,
    status character varying(20) DEFAULT 'draft'::character varying,
    rejection_reason text,
    CONSTRAINT valid_modcat CHECK (((modcat)::text = ANY ((ARRAY['Flood'::character varying, 'Earthquake'::character varying, 'Fire'::character varying, 'General'::character varying])::text[]))),
    CONSTRAINT valid_module_status CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'pending_review'::character varying, 'published'::character varying, 'rejected'::character varying])::text[])))
);


ALTER TABLE public.module_data OWNER TO postgres;

--
-- Name: module_data_mod_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.module_data ALTER COLUMN mod_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.module_data_mod_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: module_steps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.module_steps (
    step_id integer NOT NULL,
    level_id integer NOT NULL,
    step_order integer NOT NULL,
    step_title character varying(255),
    step_content text,
    media_url character varying(500),
    step_type character varying(50) NOT NULL,
    is_final_assessment boolean DEFAULT false,
    loop_back_step_id integer
);


ALTER TABLE public.module_steps OWNER TO postgres;

--
-- Name: module_steps_step_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.module_steps ALTER COLUMN step_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.module_steps_step_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: questions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.questions (
    question_id integer NOT NULL,
    mod_id integer NOT NULL,
    question_text text NOT NULL,
    points integer DEFAULT 1,
    date_added timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    image_url character varying(500) DEFAULT NULL::character varying,
    step_id integer
);


ALTER TABLE public.questions OWNER TO postgres;

--
-- Name: questions_question_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.questions ALTER COLUMN question_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.questions_question_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: results; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.results (
    result_id integer NOT NULL,
    user_id text NOT NULL,
    mod_id integer NOT NULL,
    score integer NOT NULL,
    total_points integer NOT NULL,
    passed boolean NOT NULL,
    date_taken timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    level_id integer,
    step_id integer
);


ALTER TABLE public.results OWNER TO postgres;

--
-- Name: results_result_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.results ALTER COLUMN result_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.results_result_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: session; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.session (
    id text NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    token text NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "userId" text NOT NULL,
    "impersonatedBy" text
);


ALTER TABLE public.session OWNER TO postgres;

--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_settings (
    key character varying(100) NOT NULL,
    value text DEFAULT ''::text NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.system_settings OWNER TO postgres;

--
-- Name: twoFactor; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."twoFactor" (
    id text NOT NULL,
    secret text NOT NULL,
    "backupCodes" text NOT NULL,
    "userId" text NOT NULL,
    verified boolean
);

ALTER TABLE "twoFactor" ADD column "failedVerificationCount" integer;

alter table "twoFactor" ADD column "lockedUntil" timestamp with time zone;


ALTER TABLE public."twoFactor" OWNER TO postgres;

--
-- Name: user; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."user" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    "emailVerified" boolean NOT NULL,
    image text,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    role public.user_role DEFAULT 'resident'::public.user_role,
    banned boolean,
    "banReason" text,
    "banExpires" timestamp with time zone,
    archived boolean,
    "lastPasswordChange" timestamp without time zone,
    "twoFactorEnabled" boolean,
    last_active timestamp with time zone,
    settings jsonb DEFAULT '{"reminders": true, "announcements": true}'::jsonb,
    consent_given_at timestamp with time zone,
    consent_version text,
    barangay_id integer
);


ALTER TABLE public."user" OWNER TO postgres;

--
-- Name: COLUMN "user".consent_given_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."user".consent_given_at IS 'Timestamp when the user explicitly clicked the consent button during registration. NULL for accounts created before this migration.';


--
-- Name: COLUMN "user".consent_version; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."user".consent_version IS 'Version identifier of the consent text the user agreed to (e.g. 1-2026). NULL for pre-migration accounts.';


--
-- Name: user_step_progress; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_step_progress (
    progress_id integer NOT NULL,
    user_id text NOT NULL,
    step_id integer NOT NULL,
    completed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_step_progress OWNER TO postgres;

--
-- Name: user_step_progress_progress_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.user_step_progress ALTER COLUMN progress_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.user_step_progress_progress_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: verification; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.verification (
    id text NOT NULL,
    identifier text NOT NULL,
    value text NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.verification OWNER TO postgres;

--
-- Name: individual_records; Type: TABLE; Schema: rate_limit; Owner: postgres
--

CREATE TABLE rate_limit.individual_records (
    id uuid DEFAULT public.uuid_generate_v1() NOT NULL,
    key text,
    event_time timestamp with time zone DEFAULT now(),
    session_id uuid
);


ALTER TABLE rate_limit.individual_records OWNER TO postgres;

--
-- Name: records_aggregated; Type: TABLE; Schema: rate_limit; Owner: postgres
--

CREATE TABLE rate_limit.records_aggregated (
    key text NOT NULL,
    session_id uuid,
    count integer DEFAULT 1
);


ALTER TABLE rate_limit.records_aggregated OWNER TO postgres;

--
-- Name: sessions; Type: TABLE; Schema: rate_limit; Owner: postgres
--

CREATE TABLE rate_limit.sessions (
    id uuid DEFAULT public.uuid_generate_v1() NOT NULL,
    name_ text,
    type_ text,
    registered_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone
);


ALTER TABLE rate_limit.sessions OWNER TO postgres;

--
-- Name: barangays id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.barangays ALTER COLUMN id SET DEFAULT nextval('public.barangays_id_seq'::regclass);


--
-- Name: blocked_ips id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blocked_ips ALTER COLUMN id SET DEFAULT nextval('public.blocked_ips_id_seq'::regclass);


--
-- Name: feedbacks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedbacks ALTER COLUMN id SET DEFAULT nextval('public.feedbacks_id_seq'::regclass);


--
-- Name: account account_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (id);


--
-- Name: activity_log activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_pkey PRIMARY KEY (act_id);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: barangays barangays_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.barangays
    ADD CONSTRAINT barangays_name_key UNIQUE (name);


--
-- Name: barangays barangays_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.barangays
    ADD CONSTRAINT barangays_pkey PRIMARY KEY (id);


--
-- Name: blocked_ips blocked_ips_ip_address_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blocked_ips
    ADD CONSTRAINT blocked_ips_ip_address_key UNIQUE (ip_address);


--
-- Name: blocked_ips blocked_ips_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blocked_ips
    ADD CONSTRAINT blocked_ips_pkey PRIMARY KEY (id);


--
-- Name: certificates certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_pkey PRIMARY KEY (cert_id);


--
-- Name: choices choices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.choices
    ADD CONSTRAINT choices_pkey PRIMARY KEY (choice_id);


--
-- Name: feedbacks feedbacks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedbacks
    ADD CONSTRAINT feedbacks_pkey PRIMARY KEY (id);


--
-- Name: levels levels_mod_id_level_order_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.levels
    ADD CONSTRAINT levels_mod_id_level_order_key UNIQUE (mod_id, level_order);


--
-- Name: levels levels_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.levels
    ADD CONSTRAINT levels_pkey PRIMARY KEY (level_id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: module_activity module_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_activity
    ADD CONSTRAINT module_activity_pkey PRIMARY KEY (modact_id);


--
-- Name: module_data module_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_data
    ADD CONSTRAINT module_data_pkey PRIMARY KEY (mod_id);


--
-- Name: module_steps module_steps_level_id_step_order_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_steps
    ADD CONSTRAINT module_steps_level_id_step_order_key UNIQUE (level_id, step_order);


--
-- Name: module_steps module_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_steps
    ADD CONSTRAINT module_steps_pkey PRIMARY KEY (step_id);


--
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (question_id);


--
-- Name: results results_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.results
    ADD CONSTRAINT results_pkey PRIMARY KEY (result_id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (id);


--
-- Name: session session_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_token_key UNIQUE (token);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (key);


--
-- Name: twoFactor twoFactor_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."twoFactor"
    ADD CONSTRAINT "twoFactor_pkey" PRIMARY KEY (id);


--
-- Name: user_step_progress unique_user_step; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_step_progress
    ADD CONSTRAINT unique_user_step UNIQUE (user_id, step_id);


--
-- Name: certificates uq_certificates_user_module; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT uq_certificates_user_module UNIQUE (user_id, module_id);


--
-- Name: certificates uq_certificates_verification_token; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT uq_certificates_verification_token UNIQUE (verification_token);


--
-- Name: user user_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_email_key UNIQUE (email);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: user_step_progress user_step_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_step_progress
    ADD CONSTRAINT user_step_progress_pkey PRIMARY KEY (progress_id);


--
-- Name: verification verification_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.verification
    ADD CONSTRAINT verification_pkey PRIMARY KEY (id);


--
-- Name: individual_records individual_records_pkey; Type: CONSTRAINT; Schema: rate_limit; Owner: postgres
--

ALTER TABLE ONLY rate_limit.individual_records
    ADD CONSTRAINT individual_records_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_name__key; Type: CONSTRAINT; Schema: rate_limit; Owner: postgres
--

ALTER TABLE ONLY rate_limit.sessions
    ADD CONSTRAINT sessions_name__key UNIQUE (name_);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: rate_limit; Owner: postgres
--

ALTER TABLE ONLY rate_limit.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: records_aggregated unique_session_key; Type: CONSTRAINT; Schema: rate_limit; Owner: postgres
--

ALTER TABLE ONLY rate_limit.records_aggregated
    ADD CONSTRAINT unique_session_key UNIQUE (session_id, key);


--
-- Name: account_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "account_userId_idx" ON public.account USING btree ("userId");


--
-- Name: idx_activity_log_act_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_log_act_date ON public.activity_log USING btree (act_date DESC);


--
-- Name: idx_activity_log_user_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_log_user_date ON public.activity_log USING btree (user_id, act_date DESC);


--
-- Name: idx_activity_log_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_log_user_id ON public.activity_log USING btree (user_id);


--
-- Name: idx_module_activity_mod; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_module_activity_mod ON public.module_activity USING btree (mod_id);


--
-- Name: idx_module_activity_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_module_activity_status ON public.module_activity USING btree (modstatus);


--
-- Name: idx_module_activity_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_module_activity_user ON public.module_activity USING btree (user_id);


--
-- Name: idx_module_data_cat; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_module_data_cat ON public.module_data USING btree (modcat);


--
-- Name: idx_user_archived; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_archived ON public."user" USING btree (archived);


--
-- Name: idx_user_banned; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_banned ON public."user" USING btree (banned);


--
-- Name: idx_user_last_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_last_active ON public."user" USING btree (last_active);


--
-- Name: idx_user_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_role ON public."user" USING btree (role);


--
-- Name: session_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "session_userId_idx" ON public.session USING btree ("userId");


--
-- Name: twoFactor_secret_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "twoFactor_secret_idx" ON public."twoFactor" USING btree (secret);


--
-- Name: twoFactor_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "twoFactor_userId_idx" ON public."twoFactor" USING btree ("userId");


--
-- Name: verification_identifier_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX verification_identifier_idx ON public.verification USING btree (identifier);


--
-- Name: account account_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: feedbacks feedbacks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedbacks
    ADD CONSTRAINT feedbacks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: announcements fk_author; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT fk_author FOREIGN KEY (author_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: certificates fk_certificates_revoked_by; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT fk_certificates_revoked_by FOREIGN KEY (revoked_by) REFERENCES public."user"(id);


--
-- Name: levels fk_level_module; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.levels
    ADD CONSTRAINT fk_level_module FOREIGN KEY (mod_id) REFERENCES public.module_data(mod_id) ON DELETE CASCADE;


--
-- Name: module_steps fk_level_steps; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_steps
    ADD CONSTRAINT fk_level_steps FOREIGN KEY (level_id) REFERENCES public.levels(level_id) ON DELETE CASCADE;


--
-- Name: certificates fk_modact; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT fk_modact FOREIGN KEY (modact_id) REFERENCES public.module_activity(modact_id) ON DELETE CASCADE;


--
-- Name: module_activity fk_module; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_activity
    ADD CONSTRAINT fk_module FOREIGN KEY (mod_id) REFERENCES public.module_data(mod_id) ON DELETE CASCADE;


--
-- Name: questions fk_module; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT fk_module FOREIGN KEY (mod_id) REFERENCES public.module_data(mod_id) ON DELETE CASCADE;


--
-- Name: choices fk_question; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.choices
    ADD CONSTRAINT fk_question FOREIGN KEY (question_id) REFERENCES public.questions(question_id) ON DELETE CASCADE;


--
-- Name: results fk_quiz_module; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.results
    ADD CONSTRAINT fk_quiz_module FOREIGN KEY (mod_id) REFERENCES public.module_data(mod_id) ON DELETE CASCADE;


--
-- Name: results fk_quiz_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.results
    ADD CONSTRAINT fk_quiz_user FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: activity_log fk_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: certificates fk_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: module_activity fk_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_activity
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: user_step_progress fk_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_step_progress
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: session session_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: twoFactor twoFactor_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."twoFactor"
    ADD CONSTRAINT "twoFactor_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: user user_barangay_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_barangay_id_fkey FOREIGN KEY (barangay_id) REFERENCES public.barangays(id);


--
-- Name: user_step_progress user_step_progress_step_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_step_progress
    ADD CONSTRAINT user_step_progress_step_id_fkey FOREIGN KEY (step_id) REFERENCES public.module_steps(step_id) ON DELETE CASCADE;


--
-- Name: individual_records individual_records_session_id_fkey; Type: FK CONSTRAINT; Schema: rate_limit; Owner: postgres
--

ALTER TABLE ONLY rate_limit.individual_records
    ADD CONSTRAINT individual_records_session_id_fkey FOREIGN KEY (session_id) REFERENCES rate_limit.sessions(id) ON DELETE CASCADE;


--
-- Name: records_aggregated records_aggregated_session_id_fkey; Type: FK CONSTRAINT; Schema: rate_limit; Owner: postgres
--

ALTER TABLE ONLY rate_limit.records_aggregated
    ADD CONSTRAINT records_aggregated_session_id_fkey FOREIGN KEY (session_id) REFERENCES rate_limit.sessions(id) ON DELETE CASCADE;


--
-- Seed: barangays of Bacolor, Pampanga
--

INSERT INTO public.barangays (name) VALUES
  ('Balas'),
  ('Cabalantian'),
  ('Cabambangan'),
  ('Cabetican'),
  ('Calibutbut'),
  ('Concepcion'),
  ('Dolores'),
  ('Duat'),
  ('Macabacle'),
  ('Magliman'),
  ('Maliwalu'),
  ('Mesalipit'),
  ('Parulog'),
  ('Potrero'),
  ('San Antonio'),
  ('San Isidro'),
  ('San Vicente'),
  ('Santa Barbara'),
  ('Santa Ines'),
  ('Talba'),
  ('Tinajero')
ON CONFLICT (name) DO NOTHING;


--
-- Seed: @acpr/rate-limit-postgresql migration tracking rows
--
-- WHY: schema.sql already contains the fully-built rate_limit schema (tables,
-- indexes, functions) from pg_dump. But @acpr/rate-limit-postgresql uses
-- postgres-migrations internally to track which of its own migrations have been
-- applied. When the migrations table is empty (fresh setup), it tries to re-run
-- its init migration and crashes with "relation already exists".
-- Pre-seeding these rows tells it everything has already been applied.
--
-- Hash formula: SHA1(fileName + fileContents) — matches postgres-migrations source.
-- If you ever upgrade @acpr/rate-limit-postgresql, recompute these hashes.
--

INSERT INTO public.migrations (id, name, hash) VALUES
  (0, 'create-migrations-table',   'e18db593bcde2aca2a408c4d1100f6abba2195df'),
  (1, 'init',                      '208eb8a4ca26ba263dee8cf9ecaa67d62457ff66'),
  (2, 'add-db-functions-agg',      '317e301e29395196eb085666baa6460895bb735e'),
  (3, 'add-db-functions-ind',      '6ad38534d3f44e57259031b0a544051b66accab9'),
  (4, 'add-db-functions-sessions', '020ef3175794fe0fcacc951f94f9eee1a7a269a6'),
  (5, 'hotfix-update-constraints', '575425e72a16d6a483c08b2d45e47d1bc014bedc'),
  (6, 'move-session-to-db-agg',    'b8b8483e1c452db0d9611520aa91b780d2519605'),
  (7, 'move-session-to-db-ind',    '2fb7791420cba1696b4d9d53f6d50a1af02af666')
ON CONFLICT (id) DO NOTHING;


CREATE TABLE public.user_notification (
    notification_id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_notification_id
        FOREIGN KEY (user_id)
        REFERENCES public."user"(id)
        ON DELETE CASCADE
);

--
-- PostgreSQL database dump complete
--

\unrestrict PWR4abVGpcklyPIMsb6o0adK1Xofk3HkhnHmhb7g2ISaYEzawv8oOjI50l16ENq


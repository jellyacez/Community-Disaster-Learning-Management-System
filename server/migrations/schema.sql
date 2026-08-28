--
-- PostgreSQL database dump
--

\restrict g7LnI8266YBBnbmTkg9C9GuqufRvPuSe7RassMw2axRz6h4Jn4ZwEfofPm09sgP

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

-- Started on 2026-08-21 15:49:58

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
-- TOC entry 7 (class 2615 OID 41796)
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- TOC entry 5312 (class 0 OID 0)
-- Dependencies: 7
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- TOC entry 6 (class 2615 OID 41797)
-- Name: rate_limit; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA rate_limit;


ALTER SCHEMA rate_limit OWNER TO postgres;

--
-- TOC entry 2 (class 3079 OID 41798)
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- TOC entry 5314 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- TOC entry 915 (class 1247 OID 41810)
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
-- TOC entry 263 (class 1255 OID 41821)
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
-- TOC entry 285 (class 1255 OID 41822)
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
-- TOC entry 286 (class 1255 OID 41823)
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
-- TOC entry 287 (class 1255 OID 41824)
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
-- TOC entry 288 (class 1255 OID 41825)
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
-- TOC entry 289 (class 1255 OID 41826)
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
-- TOC entry 290 (class 1255 OID 41827)
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
-- TOC entry 291 (class 1255 OID 41828)
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
-- TOC entry 292 (class 1255 OID 41829)
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
-- TOC entry 293 (class 1255 OID 41830)
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
-- TOC entry 221 (class 1259 OID 41831)
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
-- TOC entry 222 (class 1259 OID 41843)
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
-- TOC entry 223 (class 1259 OID 41851)
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
-- TOC entry 224 (class 1259 OID 41852)
-- Name: announcements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.announcements (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    date timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    author_id text NOT NULL,
    barangay_id integer
);


ALTER TABLE public.announcements OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 41863)
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
-- TOC entry 226 (class 1259 OID 41864)
-- Name: barangays; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.barangays (
    id integer NOT NULL,
    name character varying(100) NOT NULL
);


ALTER TABLE public.barangays OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 41869)
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
-- TOC entry 5315 (class 0 OID 0)
-- Dependencies: 227
-- Name: barangays_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.barangays_id_seq OWNED BY public.barangays.id;


--
-- TOC entry 228 (class 1259 OID 41870)
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
-- TOC entry 229 (class 1259 OID 41878)
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
-- TOC entry 5316 (class 0 OID 0)
-- Dependencies: 229
-- Name: blocked_ips_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.blocked_ips_id_seq OWNED BY public.blocked_ips.id;


--
-- TOC entry 230 (class 1259 OID 41879)
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
    revoked_by text,
    recert_notified_at timestamp with time zone
);


ALTER TABLE public.certificates OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 41890)
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
-- TOC entry 232 (class 1259 OID 41891)
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
-- TOC entry 233 (class 1259 OID 41901)
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
-- TOC entry 262 (class 1259 OID 42317)
-- Name: feedback_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.feedback_messages (
    id integer NOT NULL,
    feedback_id integer,
    sender_type text NOT NULL,
    sender_id text NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT feedback_messages_sender_type_check CHECK ((sender_type = ANY (ARRAY['resident'::text, 'admin'::text])))
);


ALTER TABLE public.feedback_messages OWNER TO postgres;

--
-- TOC entry 261 (class 1259 OID 42316)
-- Name: feedback_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.feedback_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.feedback_messages_id_seq OWNER TO postgres;

--
-- TOC entry 5317 (class 0 OID 0)
-- Dependencies: 261
-- Name: feedback_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.feedback_messages_id_seq OWNED BY public.feedback_messages.id;


--
-- TOC entry 234 (class 1259 OID 41902)
-- Name: feedbacks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.feedbacks (
    id integer NOT NULL,
    user_id text,
    recipient text NOT NULL,
    type text NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    reply text,
    status text DEFAULT 'Pending'::text,
    replied_by text,
    replied_at timestamp with time zone,
    CONSTRAINT feedbacks_status_check CHECK ((status = ANY (ARRAY['Pending'::text, 'Replied'::text, 'Closed'::text])))
);


ALTER TABLE public.feedbacks OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 41913)
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
-- TOC entry 5318 (class 0 OID 0)
-- Dependencies: 235
-- Name: feedbacks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.feedbacks_id_seq OWNED BY public.feedbacks.id;


--
-- TOC entry 236 (class 1259 OID 41914)
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
-- TOC entry 237 (class 1259 OID 41925)
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
-- TOC entry 238 (class 1259 OID 41926)
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
-- TOC entry 239 (class 1259 OID 41933)
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
-- TOC entry 240 (class 1259 OID 41945)
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
-- TOC entry 241 (class 1259 OID 41946)
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
    author_id text,
    CONSTRAINT valid_modcat CHECK (((modcat)::text = ANY (ARRAY[('Flood'::character varying)::text, ('Earthquake'::character varying)::text, ('Fire'::character varying)::text, ('General'::character varying)::text]))),
    CONSTRAINT valid_module_status CHECK (((status)::text = ANY (ARRAY[('draft'::character varying)::text, ('pending_review'::character varying)::text, ('published'::character varying)::text, ('rejected'::character varying)::text])))
);


ALTER TABLE public.module_data OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 41960)
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
-- TOC entry 243 (class 1259 OID 41961)
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
-- TOC entry 244 (class 1259 OID 41971)
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
-- TOC entry 245 (class 1259 OID 41972)
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
-- TOC entry 246 (class 1259 OID 41983)
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
-- TOC entry 247 (class 1259 OID 41984)
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
-- TOC entry 248 (class 1259 OID 41996)
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
-- TOC entry 249 (class 1259 OID 41997)
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
-- TOC entry 250 (class 1259 OID 42009)
-- Name: system_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_settings (
    key character varying(100) NOT NULL,
    value text DEFAULT ''::text NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.system_settings OWNER TO postgres;

--
-- TOC entry 251 (class 1259 OID 42018)
-- Name: twoFactor; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."twoFactor" (
    id text NOT NULL,
    secret text NOT NULL,
    "backupCodes" text NOT NULL,
    "userId" text NOT NULL,
    verified boolean,
    "failedVerificationCount" integer,
    "lockedUntil" timestamp with time zone
);


ALTER TABLE public."twoFactor" OWNER TO postgres;

--
-- TOC entry 252 (class 1259 OID 42027)
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
-- TOC entry 5319 (class 0 OID 0)
-- Dependencies: 252
-- Name: COLUMN "user".consent_given_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."user".consent_given_at IS 'Timestamp when the user explicitly clicked the consent button during registration. NULL for accounts created before this migration.';


--
-- TOC entry 5320 (class 0 OID 0)
-- Dependencies: 252
-- Name: COLUMN "user".consent_version; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."user".consent_version IS 'Version identifier of the consent text the user agreed to (e.g. 1-2026). NULL for pre-migration accounts.';


--
-- TOC entry 260 (class 1259 OID 42290)
-- Name: user_notification; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_notification (
    notification_id integer NOT NULL,
    user_id text NOT NULL,
    type text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_notification OWNER TO postgres;

--
-- TOC entry 259 (class 1259 OID 42289)
-- Name: user_notification_notification_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_notification_notification_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_notification_notification_id_seq OWNER TO postgres;

--
-- TOC entry 5321 (class 0 OID 0)
-- Dependencies: 259
-- Name: user_notification_notification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_notification_notification_id_seq OWNED BY public.user_notification.notification_id;


--
-- TOC entry 253 (class 1259 OID 42043)
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
-- TOC entry 254 (class 1259 OID 42052)
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
-- TOC entry 255 (class 1259 OID 42053)
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
-- TOC entry 256 (class 1259 OID 42066)
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
-- TOC entry 257 (class 1259 OID 42074)
-- Name: records_aggregated; Type: TABLE; Schema: rate_limit; Owner: postgres
--

CREATE TABLE rate_limit.records_aggregated (
    key text NOT NULL,
    session_id uuid,
    count integer DEFAULT 1
);


ALTER TABLE rate_limit.records_aggregated OWNER TO postgres;

--
-- TOC entry 258 (class 1259 OID 42081)
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
-- TOC entry 4998 (class 2604 OID 42089)
-- Name: barangays id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.barangays ALTER COLUMN id SET DEFAULT nextval('public.barangays_id_seq'::regclass);


--
-- TOC entry 4999 (class 2604 OID 42090)
-- Name: blocked_ips id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blocked_ips ALTER COLUMN id SET DEFAULT nextval('public.blocked_ips_id_seq'::regclass);


--
-- TOC entry 5037 (class 2604 OID 42320)
-- Name: feedback_messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback_messages ALTER COLUMN id SET DEFAULT nextval('public.feedback_messages_id_seq'::regclass);


--
-- TOC entry 5003 (class 2604 OID 42091)
-- Name: feedbacks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedbacks ALTER COLUMN id SET DEFAULT nextval('public.feedbacks_id_seq'::regclass);


--
-- TOC entry 5034 (class 2604 OID 42293)
-- Name: user_notification notification_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification ALTER COLUMN notification_id SET DEFAULT nextval('public.user_notification_notification_id_seq'::regclass);


--
-- TOC entry 5044 (class 2606 OID 42093)
-- Name: account account_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (id);


--
-- TOC entry 5047 (class 2606 OID 42095)
-- Name: activity_log activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_pkey PRIMARY KEY (act_id);


--
-- TOC entry 5052 (class 2606 OID 42097)
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- TOC entry 5054 (class 2606 OID 42099)
-- Name: barangays barangays_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.barangays
    ADD CONSTRAINT barangays_name_key UNIQUE (name);


--
-- TOC entry 5056 (class 2606 OID 42101)
-- Name: barangays barangays_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.barangays
    ADD CONSTRAINT barangays_pkey PRIMARY KEY (id);


--
-- TOC entry 5058 (class 2606 OID 42103)
-- Name: blocked_ips blocked_ips_ip_address_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blocked_ips
    ADD CONSTRAINT blocked_ips_ip_address_key UNIQUE (ip_address);


--
-- TOC entry 5060 (class 2606 OID 42105)
-- Name: blocked_ips blocked_ips_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blocked_ips
    ADD CONSTRAINT blocked_ips_pkey PRIMARY KEY (id);


--
-- TOC entry 5062 (class 2606 OID 42107)
-- Name: certificates certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_pkey PRIMARY KEY (cert_id);


--
-- TOC entry 5068 (class 2606 OID 42109)
-- Name: choices choices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.choices
    ADD CONSTRAINT choices_pkey PRIMARY KEY (choice_id);


--
-- TOC entry 5132 (class 2606 OID 42330)
-- Name: feedback_messages feedback_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback_messages
    ADD CONSTRAINT feedback_messages_pkey PRIMARY KEY (id);


--
-- TOC entry 5070 (class 2606 OID 42111)
-- Name: feedbacks feedbacks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedbacks
    ADD CONSTRAINT feedbacks_pkey PRIMARY KEY (id);


--
-- TOC entry 5072 (class 2606 OID 42113)
-- Name: levels levels_mod_id_level_order_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.levels
    ADD CONSTRAINT levels_mod_id_level_order_key UNIQUE (mod_id, level_order);


--
-- TOC entry 5074 (class 2606 OID 42115)
-- Name: levels levels_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.levels
    ADD CONSTRAINT levels_pkey PRIMARY KEY (level_id);


--
-- TOC entry 5076 (class 2606 OID 42117)
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- TOC entry 5078 (class 2606 OID 42119)
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- TOC entry 5083 (class 2606 OID 42121)
-- Name: module_activity module_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_activity
    ADD CONSTRAINT module_activity_pkey PRIMARY KEY (modact_id);


--
-- TOC entry 5086 (class 2606 OID 42123)
-- Name: module_data module_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_data
    ADD CONSTRAINT module_data_pkey PRIMARY KEY (mod_id);


--
-- TOC entry 5088 (class 2606 OID 42125)
-- Name: module_steps module_steps_level_id_step_order_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_steps
    ADD CONSTRAINT module_steps_level_id_step_order_key UNIQUE (level_id, step_order);


--
-- TOC entry 5090 (class 2606 OID 42127)
-- Name: module_steps module_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_steps
    ADD CONSTRAINT module_steps_pkey PRIMARY KEY (step_id);


--
-- TOC entry 5092 (class 2606 OID 42129)
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (question_id);


--
-- TOC entry 5094 (class 2606 OID 42131)
-- Name: results results_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.results
    ADD CONSTRAINT results_pkey PRIMARY KEY (result_id);


--
-- TOC entry 5096 (class 2606 OID 42133)
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (id);


--
-- TOC entry 5098 (class 2606 OID 42135)
-- Name: session session_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_token_key UNIQUE (token);


--
-- TOC entry 5101 (class 2606 OID 42137)
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (key);


--
-- TOC entry 5103 (class 2606 OID 42139)
-- Name: twoFactor twoFactor_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."twoFactor"
    ADD CONSTRAINT "twoFactor_pkey" PRIMARY KEY (id);


--
-- TOC entry 5115 (class 2606 OID 42141)
-- Name: user_step_progress unique_user_step; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_step_progress
    ADD CONSTRAINT unique_user_step UNIQUE (user_id, step_id);


--
-- TOC entry 5064 (class 2606 OID 42143)
-- Name: certificates uq_certificates_user_module; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT uq_certificates_user_module UNIQUE (user_id, module_id);


--
-- TOC entry 5066 (class 2606 OID 42145)
-- Name: certificates uq_certificates_verification_token; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT uq_certificates_verification_token UNIQUE (verification_token);


--
-- TOC entry 5111 (class 2606 OID 42147)
-- Name: user user_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_email_key UNIQUE (email);


--
-- TOC entry 5130 (class 2606 OID 42303)
-- Name: user_notification user_notification_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification
    ADD CONSTRAINT user_notification_pkey PRIMARY KEY (notification_id);


--
-- TOC entry 5113 (class 2606 OID 42149)
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- TOC entry 5117 (class 2606 OID 42151)
-- Name: user_step_progress user_step_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_step_progress
    ADD CONSTRAINT user_step_progress_pkey PRIMARY KEY (progress_id);


--
-- TOC entry 5120 (class 2606 OID 42153)
-- Name: verification verification_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.verification
    ADD CONSTRAINT verification_pkey PRIMARY KEY (id);


--
-- TOC entry 5122 (class 2606 OID 42155)
-- Name: individual_records individual_records_pkey; Type: CONSTRAINT; Schema: rate_limit; Owner: postgres
--

ALTER TABLE ONLY rate_limit.individual_records
    ADD CONSTRAINT individual_records_pkey PRIMARY KEY (id);


--
-- TOC entry 5126 (class 2606 OID 42157)
-- Name: sessions sessions_name__key; Type: CONSTRAINT; Schema: rate_limit; Owner: postgres
--

ALTER TABLE ONLY rate_limit.sessions
    ADD CONSTRAINT sessions_name__key UNIQUE (name_);


--
-- TOC entry 5128 (class 2606 OID 42159)
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: rate_limit; Owner: postgres
--

ALTER TABLE ONLY rate_limit.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 5124 (class 2606 OID 42161)
-- Name: records_aggregated unique_session_key; Type: CONSTRAINT; Schema: rate_limit; Owner: postgres
--

ALTER TABLE ONLY rate_limit.records_aggregated
    ADD CONSTRAINT unique_session_key UNIQUE (session_id, key);


--
-- TOC entry 5045 (class 1259 OID 42162)
-- Name: account_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "account_userId_idx" ON public.account USING btree ("userId");


--
-- TOC entry 5048 (class 1259 OID 42163)
-- Name: idx_activity_log_act_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_log_act_date ON public.activity_log USING btree (act_date DESC);


--
-- TOC entry 5049 (class 1259 OID 42164)
-- Name: idx_activity_log_user_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_log_user_date ON public.activity_log USING btree (user_id, act_date DESC);


--
-- TOC entry 5050 (class 1259 OID 42165)
-- Name: idx_activity_log_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_log_user_id ON public.activity_log USING btree (user_id);


--
-- TOC entry 5133 (class 1259 OID 42336)
-- Name: idx_feedback_messages_feedback_id_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_feedback_messages_feedback_id_created_at ON public.feedback_messages USING btree (feedback_id, created_at);


--
-- TOC entry 5079 (class 1259 OID 42166)
-- Name: idx_module_activity_mod; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_module_activity_mod ON public.module_activity USING btree (mod_id);


--
-- TOC entry 5080 (class 1259 OID 42167)
-- Name: idx_module_activity_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_module_activity_status ON public.module_activity USING btree (modstatus);


--
-- TOC entry 5081 (class 1259 OID 42168)
-- Name: idx_module_activity_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_module_activity_user ON public.module_activity USING btree (user_id);


--
-- TOC entry 5084 (class 1259 OID 42169)
-- Name: idx_module_data_cat; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_module_data_cat ON public.module_data USING btree (modcat);


--
-- TOC entry 5106 (class 1259 OID 42170)
-- Name: idx_user_archived; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_archived ON public."user" USING btree (archived);


--
-- TOC entry 5107 (class 1259 OID 42171)
-- Name: idx_user_banned; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_banned ON public."user" USING btree (banned);


--
-- TOC entry 5108 (class 1259 OID 42172)
-- Name: idx_user_last_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_last_active ON public."user" USING btree (last_active);


--
-- TOC entry 5109 (class 1259 OID 42173)
-- Name: idx_user_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_role ON public."user" USING btree (role);


--
-- TOC entry 5099 (class 1259 OID 42174)
-- Name: session_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "session_userId_idx" ON public.session USING btree ("userId");


--
-- TOC entry 5104 (class 1259 OID 42175)
-- Name: twoFactor_secret_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "twoFactor_secret_idx" ON public."twoFactor" USING btree (secret);


--
-- TOC entry 5105 (class 1259 OID 42176)
-- Name: twoFactor_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "twoFactor_userId_idx" ON public."twoFactor" USING btree ("userId");


--
-- TOC entry 5118 (class 1259 OID 42177)
-- Name: verification_identifier_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX verification_identifier_idx ON public.verification USING btree (identifier);


--
-- Tech Debt #5: Database Indexing & Query Plan Optimization
-- These composite and partial indexes optimize the most expensive multi-table
-- joins across certificates, module_activity, and feedbacks.
--

--
-- Name: idx_certificates_user_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX IF NOT EXISTS idx_certificates_user_status ON public.certificates USING btree (user_id, status);


--
-- Name: idx_certificates_expiry_sweep; Type: INDEX; Schema: public; Owner: postgres
-- Partial index used by the daily 1:00 AM recertification cron sweep.
--

CREATE INDEX IF NOT EXISTS idx_certificates_expiry_sweep ON public.certificates USING btree (status, expires_at) WHERE ((status)::text = 'active'::text);


--
-- Name: idx_certificates_verification_token; Type: INDEX; Schema: public; Owner: postgres
-- Optimizes QR-code certificate verification lookups.
--

CREATE INDEX IF NOT EXISTS idx_certificates_verification_token ON public.certificates USING btree (verification_token);


--
-- Name: idx_certificates_user_non_revoked; Type: INDEX; Schema: public; Owner: postgres
-- Optimizes the historical completion count scalar subquery in UserService.getAllUsers.
--

CREATE INDEX IF NOT EXISTS idx_certificates_user_non_revoked ON public.certificates USING btree (user_id) WHERE ((status)::text <> 'revoked'::text);


--
-- Name: idx_module_activity_user_modstatus; Type: INDEX; Schema: public; Owner: postgres
-- Composite index replacing the two separate single-column indexes (idx_module_activity_user, idx_module_activity_status).
--

CREATE INDEX IF NOT EXISTS idx_module_activity_user_modstatus ON public.module_activity USING btree (user_id, modstatus);


--
-- Name: idx_feedbacks_user_status_created; Type: INDEX; Schema: public; Owner: postgres
-- Optimizes feedback queue filtering by resident and status with chronological ordering.
--

CREATE INDEX IF NOT EXISTS idx_feedbacks_user_status_created ON public.feedbacks USING btree (user_id, status, created_at DESC);


--
-- TOC entry 5134 (class 2606 OID 42178)
-- Name: account account_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- TOC entry 5136 (class 2606 OID 42337)
-- Name: announcements announcements_barangay_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_barangay_id_fkey FOREIGN KEY (barangay_id) REFERENCES public.barangays(id) ON DELETE CASCADE;


--
-- TOC entry 5159 (class 2606 OID 42331)
-- Name: feedback_messages feedback_messages_feedback_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback_messages
    ADD CONSTRAINT feedback_messages_feedback_id_fkey FOREIGN KEY (feedback_id) REFERENCES public.feedbacks(id) ON DELETE CASCADE;


--
-- TOC entry 5142 (class 2606 OID 42183)
-- Name: feedbacks feedbacks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedbacks
    ADD CONSTRAINT feedbacks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- TOC entry 5137 (class 2606 OID 42188)
-- Name: announcements fk_author; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT fk_author FOREIGN KEY (author_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- TOC entry 5138 (class 2606 OID 42193)
-- Name: certificates fk_certificates_revoked_by; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT fk_certificates_revoked_by FOREIGN KEY (revoked_by) REFERENCES public."user"(id);


--
-- TOC entry 5143 (class 2606 OID 42198)
-- Name: levels fk_level_module; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.levels
    ADD CONSTRAINT fk_level_module FOREIGN KEY (mod_id) REFERENCES public.module_data(mod_id) ON DELETE CASCADE;


--
-- TOC entry 5147 (class 2606 OID 42203)
-- Name: module_steps fk_level_steps; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_steps
    ADD CONSTRAINT fk_level_steps FOREIGN KEY (level_id) REFERENCES public.levels(level_id) ON DELETE CASCADE;


--
-- TOC entry 5139 (class 2606 OID 42208)
-- Name: certificates fk_modact; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT fk_modact FOREIGN KEY (modact_id) REFERENCES public.module_activity(modact_id) ON DELETE CASCADE;


--
-- TOC entry 5144 (class 2606 OID 42213)
-- Name: module_activity fk_module; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_activity
    ADD CONSTRAINT fk_module FOREIGN KEY (mod_id) REFERENCES public.module_data(mod_id) ON DELETE CASCADE;


--
-- TOC entry 5148 (class 2606 OID 42218)
-- Name: questions fk_module; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT fk_module FOREIGN KEY (mod_id) REFERENCES public.module_data(mod_id) ON DELETE CASCADE;


--
-- TOC entry 5141 (class 2606 OID 42223)
-- Name: choices fk_question; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.choices
    ADD CONSTRAINT fk_question FOREIGN KEY (question_id) REFERENCES public.questions(question_id) ON DELETE CASCADE;


--
-- TOC entry 5149 (class 2606 OID 42228)
-- Name: results fk_quiz_module; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.results
    ADD CONSTRAINT fk_quiz_module FOREIGN KEY (mod_id) REFERENCES public.module_data(mod_id) ON DELETE CASCADE;


--
-- TOC entry 5150 (class 2606 OID 42233)
-- Name: results fk_quiz_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.results
    ADD CONSTRAINT fk_quiz_user FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- TOC entry 5135 (class 2606 OID 42238)
-- Name: activity_log fk_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- TOC entry 5140 (class 2606 OID 42243)
-- Name: certificates fk_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- TOC entry 5145 (class 2606 OID 42248)
-- Name: module_activity fk_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_activity
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- TOC entry 5154 (class 2606 OID 42253)
-- Name: user_step_progress fk_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_step_progress
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- TOC entry 5158 (class 2606 OID 42304)
-- Name: user_notification fk_user_notification_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification
    ADD CONSTRAINT fk_user_notification_id FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- TOC entry 5146 (class 2606 OID 42309)
-- Name: module_data module_data_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_data
    ADD CONSTRAINT module_data_author_id_fkey FOREIGN KEY (author_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- TOC entry 5151 (class 2606 OID 42258)
-- Name: session session_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- TOC entry 5152 (class 2606 OID 42263)
-- Name: twoFactor twoFactor_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."twoFactor"
    ADD CONSTRAINT "twoFactor_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- TOC entry 5153 (class 2606 OID 42268)
-- Name: user user_barangay_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_barangay_id_fkey FOREIGN KEY (barangay_id) REFERENCES public.barangays(id);


--
-- TOC entry 5155 (class 2606 OID 42273)
-- Name: user_step_progress user_step_progress_step_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_step_progress
    ADD CONSTRAINT user_step_progress_step_id_fkey FOREIGN KEY (step_id) REFERENCES public.module_steps(step_id) ON DELETE CASCADE;


--
-- TOC entry 5156 (class 2606 OID 42278)
-- Name: individual_records individual_records_session_id_fkey; Type: FK CONSTRAINT; Schema: rate_limit; Owner: postgres
--

ALTER TABLE ONLY rate_limit.individual_records
    ADD CONSTRAINT individual_records_session_id_fkey FOREIGN KEY (session_id) REFERENCES rate_limit.sessions(id) ON DELETE CASCADE;


--
-- TOC entry 5157 (class 2606 OID 42283)
-- Name: records_aggregated records_aggregated_session_id_fkey; Type: FK CONSTRAINT; Schema: rate_limit; Owner: postgres
--

ALTER TABLE ONLY rate_limit.records_aggregated
    ADD CONSTRAINT records_aggregated_session_id_fkey FOREIGN KEY (session_id) REFERENCES rate_limit.sessions(id) ON DELETE CASCADE;


--
-- TOC entry 5313 (class 0 OID 0)
-- Dependencies: 7
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO PUBLIC;


-- Completed on 2026-08-21 15:49:58

--
-- PostgreSQL database dump complete
--

\unrestrict g7LnI8266YBBnbmTkg9C9GuqufRvPuSe7RassMw2axRz6h4Jn4ZwEfofPm09sgP


--
-- PostgreSQL database dump
--

\restrict sW3R2077vwrLcteBFg5de7rmaFAfALxfqxoc42ZdoR9IGdA1izTXBYiJsDcHL7Z

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

-- Started on 2026-07-07 19:02:31

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
-- TOC entry 7 (class 2615 OID 25161)
-- Name: rate_limit; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA rate_limit;


ALTER SCHEMA rate_limit OWNER TO postgres;

--
-- TOC entry 2 (class 3079 OID 25150)
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- TOC entry 5247 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- TOC entry 281 (class 1255 OID 25218)
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
-- TOC entry 280 (class 1255 OID 25217)
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
-- TOC entry 282 (class 1255 OID 25219)
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
-- TOC entry 283 (class 1255 OID 25220)
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
-- TOC entry 285 (class 1255 OID 25222)
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
-- TOC entry 284 (class 1255 OID 25221)
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
-- TOC entry 267 (class 1255 OID 25223)
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
-- TOC entry 268 (class 1255 OID 25224)
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
-- TOC entry 266 (class 1255 OID 25214)
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
-- TOC entry 265 (class 1255 OID 25213)
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
-- TOC entry 223 (class 1259 OID 16520)
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
-- TOC entry 232 (class 1259 OID 16732)
-- Name: activity_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity_log (
    act_id integer NOT NULL,
    user_id text NOT NULL,
    act_date date NOT NULL,
    act_log character varying(500) NOT NULL
);


ALTER TABLE public.activity_log OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 16731)
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
-- TOC entry 234 (class 1259 OID 16750)
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
-- TOC entry 233 (class 1259 OID 16749)
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
-- TOC entry 254 (class 1259 OID 25226)
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
-- TOC entry 253 (class 1259 OID 25225)
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
-- TOC entry 5248 (class 0 OID 0)
-- Dependencies: 253
-- Name: blocked_ips_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.blocked_ips_id_seq OWNED BY public.blocked_ips.id;


--
-- TOC entry 229 (class 1259 OID 16681)
-- Name: certificates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.certificates (
    cert_id integer NOT NULL,
    user_id text NOT NULL,
    modact_id integer NOT NULL,
    result_id integer NOT NULL,
    cert_rec character varying(100) NOT NULL,
    anonymized_name character varying(255),
    barangay character varying(255),
    module_id integer,
    completion_date timestamp without time zone
);


ALTER TABLE public.certificates OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 16680)
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
-- TOC entry 238 (class 1259 OID 16787)
-- Name: choices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.choices (
    choice_id integer NOT NULL,
    question_id integer NOT NULL,
    choice_text text NOT NULL,
    is_correct boolean DEFAULT false NOT NULL
);


ALTER TABLE public.choices OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 16786)
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
-- TOC entry 245 (class 1259 OID 16971)
-- Name: levels; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.levels (
    level_id integer NOT NULL,
    mod_id integer NOT NULL,
    level_order integer NOT NULL,
    level_title character varying(255) NOT NULL,
    level_description text
);


ALTER TABLE public.levels OWNER TO postgres;

--
-- TOC entry 244 (class 1259 OID 16970)
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
-- TOC entry 249 (class 1259 OID 25139)
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
-- TOC entry 227 (class 1259 OID 16657)
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
-- TOC entry 226 (class 1259 OID 16656)
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
-- TOC entry 225 (class 1259 OID 16644)
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
    image_url character varying(500) DEFAULT NULL::character varying
);


ALTER TABLE public.module_data OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 16703)
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
-- TOC entry 247 (class 1259 OID 16990)
-- Name: module_steps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.module_steps (
    step_id integer NOT NULL,
    level_id integer NOT NULL,
    step_order integer NOT NULL,
    step_title character varying(255),
    step_content text,
    media_url character varying(500),
    step_type character varying(50) NOT NULL
);


ALTER TABLE public.module_steps OWNER TO postgres;

--
-- TOC entry 246 (class 1259 OID 16989)
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
-- TOC entry 236 (class 1259 OID 16769)
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
-- TOC entry 235 (class 1259 OID 16768)
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
-- TOC entry 240 (class 1259 OID 16805)
-- Name: results; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.results (
    result_id integer NOT NULL,
    user_id text NOT NULL,
    mod_id integer NOT NULL,
    score integer NOT NULL,
    total_points integer NOT NULL,
    passed boolean NOT NULL,
    date_taken timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.results OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 16804)
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
-- TOC entry 222 (class 1259 OID 16499)
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
-- TOC entry 248 (class 1259 OID 25119)
-- Name: system_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_settings (
    key character varying(100) NOT NULL,
    value text DEFAULT ''::text NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.system_settings OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 16829)
-- Name: twoFactor; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."twoFactor" (
    id text NOT NULL,
    secret text NOT NULL,
    "backupCodes" text NOT NULL,
    "userId" text NOT NULL,
    verified boolean
);


ALTER TABLE public."twoFactor" OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16481)
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
    barangay text NOT NULL,
    role text,
    banned boolean,
    "banReason" text,
    "banExpires" timestamp with time zone,
    archived boolean,
    "lastPasswordChange" timestamp without time zone,
    "twoFactorEnabled" boolean,
    last_active timestamp with time zone
);


ALTER TABLE public."user" OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 16883)
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
-- TOC entry 242 (class 1259 OID 16882)
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
-- TOC entry 224 (class 1259 OID 16539)
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
-- TOC entry 252 (class 1259 OID 25188)
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
-- TOC entry 251 (class 1259 OID 25174)
-- Name: records_aggregated; Type: TABLE; Schema: rate_limit; Owner: postgres
--

CREATE TABLE rate_limit.records_aggregated (
    key text NOT NULL,
    session_id uuid,
    count integer DEFAULT 1
);


ALTER TABLE rate_limit.records_aggregated OWNER TO postgres;

--
-- TOC entry 250 (class 1259 OID 25162)
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
-- TOC entry 4998 (class 2604 OID 25229)
-- Name: blocked_ips id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blocked_ips ALTER COLUMN id SET DEFAULT nextval('public.blocked_ips_id_seq'::regclass);


--
-- TOC entry 5014 (class 2606 OID 16533)
-- Name: account account_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (id);


--
-- TOC entry 5030 (class 2606 OID 16742)
-- Name: activity_log activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_pkey PRIMARY KEY (act_id);


--
-- TOC entry 5035 (class 2606 OID 16762)
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- TOC entry 5073 (class 2606 OID 25238)
-- Name: blocked_ips blocked_ips_ip_address_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blocked_ips
    ADD CONSTRAINT blocked_ips_ip_address_key UNIQUE (ip_address);


--
-- TOC entry 5075 (class 2606 OID 25236)
-- Name: blocked_ips blocked_ips_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blocked_ips
    ADD CONSTRAINT blocked_ips_pkey PRIMARY KEY (id);


--
-- TOC entry 5028 (class 2606 OID 16692)
-- Name: certificates certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_pkey PRIMARY KEY (cert_id);


--
-- TOC entry 5039 (class 2606 OID 16798)
-- Name: choices choices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.choices
    ADD CONSTRAINT choices_pkey PRIMARY KEY (choice_id);


--
-- TOC entry 5051 (class 2606 OID 16983)
-- Name: levels levels_mod_id_level_order_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.levels
    ADD CONSTRAINT levels_mod_id_level_order_key UNIQUE (mod_id, level_order);


--
-- TOC entry 5053 (class 2606 OID 16981)
-- Name: levels levels_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.levels
    ADD CONSTRAINT levels_pkey PRIMARY KEY (level_id);


--
-- TOC entry 5061 (class 2606 OID 25149)
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- TOC entry 5063 (class 2606 OID 25147)
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- TOC entry 5026 (class 2606 OID 16669)
-- Name: module_activity module_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_activity
    ADD CONSTRAINT module_activity_pkey PRIMARY KEY (modact_id);


--
-- TOC entry 5021 (class 2606 OID 16655)
-- Name: module_data module_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_data
    ADD CONSTRAINT module_data_pkey PRIMARY KEY (mod_id);


--
-- TOC entry 5055 (class 2606 OID 17002)
-- Name: module_steps module_steps_level_id_step_order_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_steps
    ADD CONSTRAINT module_steps_level_id_step_order_key UNIQUE (level_id, step_order);


--
-- TOC entry 5057 (class 2606 OID 17000)
-- Name: module_steps module_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_steps
    ADD CONSTRAINT module_steps_pkey PRIMARY KEY (step_id);


--
-- TOC entry 5037 (class 2606 OID 16780)
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (question_id);


--
-- TOC entry 5041 (class 2606 OID 16818)
-- Name: results results_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.results
    ADD CONSTRAINT results_pkey PRIMARY KEY (result_id);


--
-- TOC entry 5009 (class 2606 OID 16512)
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (id);


--
-- TOC entry 5011 (class 2606 OID 16514)
-- Name: session session_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_token_key UNIQUE (token);


--
-- TOC entry 5059 (class 2606 OID 25129)
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (key);


--
-- TOC entry 5043 (class 2606 OID 16839)
-- Name: twoFactor twoFactor_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."twoFactor"
    ADD CONSTRAINT "twoFactor_pkey" PRIMARY KEY (id);


--
-- TOC entry 5047 (class 2606 OID 16895)
-- Name: user_step_progress unique_user_step; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_step_progress
    ADD CONSTRAINT unique_user_step UNIQUE (user_id, step_id);


--
-- TOC entry 5005 (class 2606 OID 16498)
-- Name: user user_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_email_key UNIQUE (email);


--
-- TOC entry 5007 (class 2606 OID 16496)
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- TOC entry 5049 (class 2606 OID 16893)
-- Name: user_step_progress user_step_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_step_progress
    ADD CONSTRAINT user_step_progress_pkey PRIMARY KEY (progress_id);


--
-- TOC entry 5018 (class 2606 OID 16553)
-- Name: verification verification_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.verification
    ADD CONSTRAINT verification_pkey PRIMARY KEY (id);


--
-- TOC entry 5071 (class 2606 OID 25197)
-- Name: individual_records individual_records_pkey; Type: CONSTRAINT; Schema: rate_limit; Owner: postgres
--

ALTER TABLE ONLY rate_limit.individual_records
    ADD CONSTRAINT individual_records_pkey PRIMARY KEY (id);


--
-- TOC entry 5065 (class 2606 OID 25173)
-- Name: sessions sessions_name__key; Type: CONSTRAINT; Schema: rate_limit; Owner: postgres
--

ALTER TABLE ONLY rate_limit.sessions
    ADD CONSTRAINT sessions_name__key UNIQUE (name_);


--
-- TOC entry 5067 (class 2606 OID 25171)
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: rate_limit; Owner: postgres
--

ALTER TABLE ONLY rate_limit.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 5069 (class 2606 OID 25216)
-- Name: records_aggregated unique_session_key; Type: CONSTRAINT; Schema: rate_limit; Owner: postgres
--

ALTER TABLE ONLY rate_limit.records_aggregated
    ADD CONSTRAINT unique_session_key UNIQUE (session_id, key);


--
-- TOC entry 5015 (class 1259 OID 16555)
-- Name: account_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "account_userId_idx" ON public.account USING btree ("userId");


--
-- TOC entry 5031 (class 1259 OID 25131)
-- Name: idx_activity_log_act_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_log_act_date ON public.activity_log USING btree (act_date DESC);


--
-- TOC entry 5032 (class 1259 OID 25132)
-- Name: idx_activity_log_user_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_log_user_date ON public.activity_log USING btree (user_id, act_date DESC);


--
-- TOC entry 5033 (class 1259 OID 25130)
-- Name: idx_activity_log_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_log_user_id ON public.activity_log USING btree (user_id);


--
-- TOC entry 5022 (class 1259 OID 16921)
-- Name: idx_module_activity_mod; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_module_activity_mod ON public.module_activity USING btree (mod_id);


--
-- TOC entry 5023 (class 1259 OID 25138)
-- Name: idx_module_activity_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_module_activity_status ON public.module_activity USING btree (modstatus);


--
-- TOC entry 5024 (class 1259 OID 16920)
-- Name: idx_module_activity_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_module_activity_user ON public.module_activity USING btree (user_id);


--
-- TOC entry 5019 (class 1259 OID 16922)
-- Name: idx_module_data_cat; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_module_data_cat ON public.module_data USING btree (modcat);


--
-- TOC entry 5000 (class 1259 OID 25136)
-- Name: idx_user_archived; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_archived ON public."user" USING btree (archived);


--
-- TOC entry 5001 (class 1259 OID 25137)
-- Name: idx_user_banned; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_banned ON public."user" USING btree (banned);


--
-- TOC entry 5002 (class 1259 OID 25134)
-- Name: idx_user_last_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_last_active ON public."user" USING btree (last_active);


--
-- TOC entry 5003 (class 1259 OID 25135)
-- Name: idx_user_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_role ON public."user" USING btree (role);


--
-- TOC entry 5012 (class 1259 OID 16554)
-- Name: session_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "session_userId_idx" ON public.session USING btree ("userId");


--
-- TOC entry 5044 (class 1259 OID 16845)
-- Name: twoFactor_secret_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "twoFactor_secret_idx" ON public."twoFactor" USING btree (secret);


--
-- TOC entry 5045 (class 1259 OID 16846)
-- Name: twoFactor_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "twoFactor_userId_idx" ON public."twoFactor" USING btree ("userId");


--
-- TOC entry 5016 (class 1259 OID 16556)
-- Name: verification_identifier_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX verification_identifier_idx ON public.verification USING btree (identifier);


--
-- TOC entry 5077 (class 2606 OID 16534)
-- Name: account account_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- TOC entry 5083 (class 2606 OID 16763)
-- Name: announcements fk_author; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT fk_author FOREIGN KEY (author_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- TOC entry 5091 (class 2606 OID 16984)
-- Name: levels fk_level_module; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.levels
    ADD CONSTRAINT fk_level_module FOREIGN KEY (mod_id) REFERENCES public.module_data(mod_id) ON DELETE CASCADE;


--
-- TOC entry 5092 (class 2606 OID 17003)
-- Name: module_steps fk_level_steps; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_steps
    ADD CONSTRAINT fk_level_steps FOREIGN KEY (level_id) REFERENCES public.levels(level_id) ON DELETE CASCADE;


--
-- TOC entry 5080 (class 2606 OID 16698)
-- Name: certificates fk_modact; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT fk_modact FOREIGN KEY (modact_id) REFERENCES public.module_activity(modact_id) ON DELETE CASCADE;


--
-- TOC entry 5078 (class 2606 OID 16675)
-- Name: module_activity fk_module; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_activity
    ADD CONSTRAINT fk_module FOREIGN KEY (mod_id) REFERENCES public.module_data(mod_id) ON DELETE CASCADE;


--
-- TOC entry 5084 (class 2606 OID 16781)
-- Name: questions fk_module; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT fk_module FOREIGN KEY (mod_id) REFERENCES public.module_data(mod_id) ON DELETE CASCADE;


--
-- TOC entry 5085 (class 2606 OID 16799)
-- Name: choices fk_question; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.choices
    ADD CONSTRAINT fk_question FOREIGN KEY (question_id) REFERENCES public.questions(question_id) ON DELETE CASCADE;


--
-- TOC entry 5086 (class 2606 OID 16819)
-- Name: results fk_quiz_module; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.results
    ADD CONSTRAINT fk_quiz_module FOREIGN KEY (mod_id) REFERENCES public.module_data(mod_id) ON DELETE CASCADE;


--
-- TOC entry 5087 (class 2606 OID 16824)
-- Name: results fk_quiz_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.results
    ADD CONSTRAINT fk_quiz_user FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- TOC entry 5082 (class 2606 OID 16743)
-- Name: activity_log fk_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- TOC entry 5081 (class 2606 OID 16693)
-- Name: certificates fk_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- TOC entry 5079 (class 2606 OID 16670)
-- Name: module_activity fk_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_activity
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- TOC entry 5089 (class 2606 OID 16896)
-- Name: user_step_progress fk_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_step_progress
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- TOC entry 5076 (class 2606 OID 16515)
-- Name: session session_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- TOC entry 5088 (class 2606 OID 16840)
-- Name: twoFactor twoFactor_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."twoFactor"
    ADD CONSTRAINT "twoFactor_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- TOC entry 5090 (class 2606 OID 17013)
-- Name: user_step_progress user_step_progress_step_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_step_progress
    ADD CONSTRAINT user_step_progress_step_id_fkey FOREIGN KEY (step_id) REFERENCES public.module_steps(step_id) ON DELETE CASCADE;


--
-- TOC entry 5094 (class 2606 OID 25198)
-- Name: individual_records individual_records_session_id_fkey; Type: FK CONSTRAINT; Schema: rate_limit; Owner: postgres
--

ALTER TABLE ONLY rate_limit.individual_records
    ADD CONSTRAINT individual_records_session_id_fkey FOREIGN KEY (session_id) REFERENCES rate_limit.sessions(id) ON DELETE CASCADE;


--
-- TOC entry 5093 (class 2606 OID 25183)
-- Name: records_aggregated records_aggregated_session_id_fkey; Type: FK CONSTRAINT; Schema: rate_limit; Owner: postgres
--

ALTER TABLE ONLY rate_limit.records_aggregated
    ADD CONSTRAINT records_aggregated_session_id_fkey FOREIGN KEY (session_id) REFERENCES rate_limit.sessions(id) ON DELETE CASCADE;


-- Completed on 2026-07-07 19:02:32

--
-- PostgreSQL database dump complete
--

\unrestrict sW3R2077vwrLcteBFg5de7rmaFAfALxfqxoc42ZdoR9IGdA1izTXBYiJsDcHL7Z


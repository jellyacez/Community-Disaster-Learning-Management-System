--
-- PostgreSQL database dump
--

\restrict XuJPCYk03q4krleGQhqhacW3yflBN9amWaareXzRh8tHBpilEj4C68Ezb8h0k7N

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

-- Started on 2026-06-26 19:32:02

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

CREATE TABLE public.account (
    id text NOT NULL,
    "accountId" text NOT NULL,
    "providerId" text NOT NULL,
    "userId" text NOT NULL,
    "accessToken" text,
    "refreshToken" text,
    "idToken" text,
    "accessTokenExpiresAt" timestamp
    with
        time zone,
        "refreshTokenExpiresAt" timestamp
    with
        time zone,
        scope text,
        password text,
        "createdAt" timestamp
    with
        time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updatedAt" timestamp
    with
        time zone NOT NULL
);

ALTER TABLE public.account OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 16732)
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
-- TOC entry 229 (class 1259 OID 16731)
-- Name: activity_log_act_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.activity_log
ALTER COLUMN act_id
ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.activity_log_act_id_seq START
    WITH
        1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1
);

--
-- TOC entry 232 (class 1259 OID 16750)
-- Name: announcements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.announcements (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    date timestamp
    with
        time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        author_id text NOT NULL
);

ALTER TABLE public.announcements OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 16749)
-- Name: announcements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.announcements
ALTER COLUMN id
ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.announcements_id_seq START
    WITH
        1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1
);

--
-- TOC entry 227 (class 1259 OID 16681)
-- Name: certificates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.certificates (
    cert_id integer NOT NULL,
    user_id text NOT NULL,
    modact_id integer NOT NULL,
    result_id integer NOT NULL,
    cert_rec character varying(100) NOT NULL
);

ALTER TABLE public.certificates OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 16680)
-- Name: certificates_cert_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.certificates
ALTER COLUMN cert_id
ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.certificates_cert_id_seq START
    WITH
        1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1
);

--
-- TOC entry 236 (class 1259 OID 16787)
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
-- TOC entry 235 (class 1259 OID 16786)
-- Name: choices_choice_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.choices
ALTER COLUMN choice_id
ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.choices_choice_id_seq START
    WITH
        1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1
);

--
-- TOC entry 225 (class 1259 OID 16657)
-- Name: module_activity; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.module_activity (
    modact_id integer NOT NULL,
    user_id text NOT NULL,
    mod_id integer NOT NULL,
    modstatus character varying(100) NOT NULL,
    progress integer DEFAULT 0 CONSTRAINT module_activity_modstart_not_null NOT NULL,
    started_at timestamp
    with
        time zone DEFAULT CURRENT_TIMESTAMP,
        completed_at timestamp
    with
        time zone
);

ALTER TABLE public.module_activity OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 16656)
-- Name: module_activity_modact_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.module_activity
ALTER COLUMN modact_id
ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.module_activity_modact_id_seq START
    WITH
        1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1
);

--
-- TOC entry 223 (class 1259 OID 16644)
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
-- TOC entry 228 (class 1259 OID 16703)
-- Name: module_data_mod_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.module_data
ALTER COLUMN mod_id
ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.module_data_mod_id_seq START
    WITH
        1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1
);

--
-- TOC entry 241 (class 1259 OID 16864)
-- Name: module_steps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.module_steps (
    step_id integer NOT NULL,
    mod_id integer NOT NULL,
    step_order integer NOT NULL,
    step_title character varying(255),
    step_content text,
    media_url character varying(500),
    step_type character varying(50) NOT NULL
);

ALTER TABLE public.module_steps OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 16863)
-- Name: module_steps_step_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.module_steps
ALTER COLUMN step_id
ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.module_steps_step_id_seq START
    WITH
        1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1
);

--
-- TOC entry 234 (class 1259 OID 16769)
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
-- TOC entry 233 (class 1259 OID 16768)
-- Name: questions_question_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.questions
ALTER COLUMN question_id
ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.questions_question_id_seq START
    WITH
        1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1
);

--
-- TOC entry 238 (class 1259 OID 16805)
-- Name: results; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.results (
    result_id integer NOT NULL,
    user_id text NOT NULL,
    mod_id integer NOT NULL,
    score integer NOT NULL,
    total_points integer NOT NULL,
    passed boolean NOT NULL,
    date_taken timestamp
    with
        time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.results OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 16804)
-- Name: results_result_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.results
ALTER COLUMN result_id
ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.results_result_id_seq START
    WITH
        1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1
);

--
-- TOC entry 220 (class 1259 OID 16499)
-- Name: session; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.session (
    id text NOT NULL,
    "expiresAt" timestamp
    with
        time zone NOT NULL,
        token text NOT NULL,
        "createdAt" timestamp
    with
        time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updatedAt" timestamp
    with
        time zone NOT NULL,
        "ipAddress" text,
        "userAgent" text,
        "userId" text NOT NULL,
        "impersonatedBy" text
);

ALTER TABLE public.session OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 16829)
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
-- TOC entry 219 (class 1259 OID 16481)
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
    "twoFactorEnabled" boolean
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
    completed_at timestamp
    with
        time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.user_step_progress OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 16882)
-- Name: user_step_progress_progress_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.user_step_progress
ALTER COLUMN progress_id
ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.user_step_progress_progress_id_seq START
    WITH
        1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1
);

--
-- TOC entry 222 (class 1259 OID 16539)
-- Name: verification; Type: TABLE; Schema: public; Owner: postgres
--

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
        time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE public.verification OWNER TO postgres;

--
-- TOC entry 4948 (class 2606 OID 16533)
-- Name: account account_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account
ADD CONSTRAINT account_pkey PRIMARY KEY (id);

--
-- TOC entry 4960 (class 2606 OID 16742)
-- Name: activity_log activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_log
ADD CONSTRAINT activity_log_pkey PRIMARY KEY (act_id);

--
-- TOC entry 4962 (class 2606 OID 16762)
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);

--
-- TOC entry 4958 (class 2606 OID 16692)
-- Name: certificates certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificates
ADD CONSTRAINT certificates_pkey PRIMARY KEY (cert_id);

--
-- TOC entry 4966 (class 2606 OID 16798)
-- Name: choices choices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.choices
ADD CONSTRAINT choices_pkey PRIMARY KEY (choice_id);

--
-- TOC entry 4956 (class 2606 OID 16669)
-- Name: module_activity module_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_activity
ADD CONSTRAINT module_activity_pkey PRIMARY KEY (modact_id);

--
-- TOC entry 4954 (class 2606 OID 16655)
-- Name: module_data module_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_data
ADD CONSTRAINT module_data_pkey PRIMARY KEY (mod_id);

--
-- TOC entry 4974 (class 2606 OID 16876)
-- Name: module_steps module_steps_mod_id_step_order_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_steps
ADD CONSTRAINT module_steps_mod_id_step_order_key UNIQUE (mod_id, step_order);

--
-- TOC entry 4976 (class 2606 OID 16874)
-- Name: module_steps module_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_steps
ADD CONSTRAINT module_steps_pkey PRIMARY KEY (step_id);

--
-- TOC entry 4964 (class 2606 OID 16780)
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questions
ADD CONSTRAINT questions_pkey PRIMARY KEY (question_id);

--
-- TOC entry 4968 (class 2606 OID 16818)
-- Name: results results_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.results
ADD CONSTRAINT results_pkey PRIMARY KEY (result_id);

--
-- TOC entry 4943 (class 2606 OID 16512)
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
ADD CONSTRAINT session_pkey PRIMARY KEY (id);

--
-- TOC entry 4945 (class 2606 OID 16514)
-- Name: session session_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
ADD CONSTRAINT session_token_key UNIQUE (token);

--
-- TOC entry 4970 (class 2606 OID 16839)
-- Name: twoFactor twoFactor_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."twoFactor"
    ADD CONSTRAINT "twoFactor_pkey" PRIMARY KEY (id);

--
-- TOC entry 4978 (class 2606 OID 16895)
-- Name: user_step_progress unique_user_step; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_step_progress
ADD CONSTRAINT unique_user_step UNIQUE (user_id, step_id);

--
-- TOC entry 4939 (class 2606 OID 16498)
-- Name: user user_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_email_key UNIQUE (email);

--
-- TOC entry 4941 (class 2606 OID 16496)
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);

--
-- TOC entry 4980 (class 2606 OID 16893)
-- Name: user_step_progress user_step_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_step_progress
ADD CONSTRAINT user_step_progress_pkey PRIMARY KEY (progress_id);

--
-- TOC entry 4952 (class 2606 OID 16553)
-- Name: verification verification_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.verification
ADD CONSTRAINT verification_pkey PRIMARY KEY (id);

--
-- TOC entry 4949 (class 1259 OID 16555)
-- Name: account_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "account_userId_idx" ON public.account USING btree ("userId");

--
-- TOC entry 4946 (class 1259 OID 16554)
-- Name: session_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "session_userId_idx" ON public.session USING btree ("userId");

--
-- TOC entry 4971 (class 1259 OID 16845)
-- Name: twoFactor_secret_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "twoFactor_secret_idx" ON public."twoFactor" USING btree (secret);

--
-- TOC entry 4972 (class 1259 OID 16846)
-- Name: twoFactor_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "twoFactor_userId_idx" ON public."twoFactor" USING btree ("userId");

--
-- TOC entry 4950 (class 1259 OID 16556)
-- Name: verification_identifier_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX verification_identifier_idx ON public.verification USING btree (identifier);

--
-- TOC entry 4982 (class 2606 OID 16534)
-- Name: account account_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE;

--
-- TOC entry 4988 (class 2606 OID 16763)
-- Name: announcements fk_author; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT fk_author FOREIGN KEY (author_id) REFERENCES public."user"(id) ON DELETE CASCADE;

--
-- TOC entry 4985 (class 2606 OID 16698)
-- Name: certificates fk_modact; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificates
ADD CONSTRAINT fk_modact FOREIGN KEY (modact_id) REFERENCES public.module_activity (modact_id) ON DELETE CASCADE;

--
-- TOC entry 4983 (class 2606 OID 16675)
-- Name: module_activity fk_module; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_activity
ADD CONSTRAINT fk_module FOREIGN KEY (mod_id) REFERENCES public.module_data (mod_id) ON DELETE CASCADE;

--
-- TOC entry 4989 (class 2606 OID 16781)
-- Name: questions fk_module; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questions
ADD CONSTRAINT fk_module FOREIGN KEY (mod_id) REFERENCES public.module_data (mod_id) ON DELETE CASCADE;

--
-- TOC entry 4995 (class 2606 OID 16877)
-- Name: module_steps fk_module_steps; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_steps
ADD CONSTRAINT fk_module_steps FOREIGN KEY (mod_id) REFERENCES public.module_data (mod_id) ON DELETE CASCADE;

--
-- TOC entry 4991 (class 2606 OID 16799)
-- Name: choices fk_question; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.choices
ADD CONSTRAINT fk_question FOREIGN KEY (question_id) REFERENCES public.questions (question_id) ON DELETE CASCADE;

--
-- TOC entry 4992 (class 2606 OID 16819)
-- Name: results fk_quiz_module; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.results
ADD CONSTRAINT fk_quiz_module FOREIGN KEY (mod_id) REFERENCES public.module_data (mod_id) ON DELETE CASCADE;

--
-- TOC entry 4993 (class 2606 OID 16824)
-- Name: results fk_quiz_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.results
    ADD CONSTRAINT fk_quiz_user FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;

--
-- TOC entry 4996 (class 2606 OID 16901)
-- Name: user_step_progress fk_step; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_step_progress
ADD CONSTRAINT fk_step FOREIGN KEY (step_id) REFERENCES public.module_steps (step_id) ON DELETE CASCADE;

--
-- TOC entry 4990 (class 2606 OID 16906)
-- Name: questions fk_step_question; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questions
ADD CONSTRAINT fk_step_question FOREIGN KEY (step_id) REFERENCES public.module_steps (step_id) ON DELETE CASCADE;

--
-- TOC entry 4987 (class 2606 OID 16743)
-- Name: activity_log fk_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;

--
-- TOC entry 4986 (class 2606 OID 16693)
-- Name: certificates fk_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;

--
-- TOC entry 4984 (class 2606 OID 16670)
-- Name: module_activity fk_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_activity
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;

--
-- TOC entry 4997 (class 2606 OID 16896)
-- Name: user_step_progress fk_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_step_progress
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;

--
-- TOC entry 4981 (class 2606 OID 16515)
-- Name: session session_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE;

--
-- TOC entry 4994 (class 2606 OID 16840)
-- Name: twoFactor twoFactor_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."twoFactor"
    ADD CONSTRAINT "twoFactor_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE;

-- Completed on 2026-06-26 19:32:02

--
-- PostgreSQL database dump complete
--

\unrestrict XuJPCYk03q4krleGQhqhacW3yflBN9amWaareXzRh8tHBpilEj4C68Ezb8h0k7N
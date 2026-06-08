--
-- PostgreSQL database dump
--

\restrict 3dh7rSoXLQZwMrtUqIz7kMGLXeTSERZHPfhuNPiNzrL6aDMoaats3s6iT15qAsH

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

-- Started on 2026-06-08 21:19:25

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
-- TOC entry 4 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- TOC entry 5046 (class 0 OID 0)
-- Dependencies: 4
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 219 (class 1259 OID 16389)
-- Name: lmsusers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lmsusers (
    user_id integer NOT NULL,
    user_name character varying(100) NOT NULL,
    user_email character varying(100) NOT NULL,
    usercreationdate timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_password character varying(100) NOT NULL
);


--
-- TOC entry 220 (class 1259 OID 24580)
-- Name: lmsusers_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.lmsusers ALTER COLUMN user_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.lmsusers_user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 222 (class 1259 OID 24582)
-- Name: tblactlog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tblactlog (
    act_id integer NOT NULL,
    user_id integer NOT NULL,
    act_date date NOT NULL,
    act_log character varying(500) NOT NULL
);


--
-- TOC entry 221 (class 1259 OID 24581)
-- Name: tblactlog_act_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.tblactlog ALTER COLUMN act_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.tblactlog_act_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 224 (class 1259 OID 24594)
-- Name: tblcert; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tblcert (
    cert_id integer NOT NULL,
    user_id integer NOT NULL,
    modact_id integer NOT NULL,
    result_id integer NOT NULL,
    cert_rec character varying(100) NOT NULL
);


--
-- TOC entry 223 (class 1259 OID 24593)
-- Name: tblcert_cert_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.tblcert ALTER COLUMN cert_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.tblcert_cert_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 226 (class 1259 OID 24605)
-- Name: tblmodact; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tblmodact (
    modact_id integer NOT NULL,
    user_id integer NOT NULL,
    mod_id integer NOT NULL,
    modstatus character varying(100) NOT NULL,
    modstart character varying(100) NOT NULL,
    modend character varying(100) NOT NULL
);


--
-- TOC entry 225 (class 1259 OID 24604)
-- Name: tblmodact_modact_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.tblmodact ALTER COLUMN modact_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.tblmodact_modact_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 228 (class 1259 OID 24617)
-- Name: tblmoddata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tblmoddata (
    mod_id integer NOT NULL,
    modname character varying(500) NOT NULL,
    moddateadd date NOT NULL,
    moddateremove date NOT NULL,
    modcat character varying(50) NOT NULL
);


--
-- TOC entry 227 (class 1259 OID 24616)
-- Name: tblmoddata_mod_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.tblmoddata ALTER COLUMN mod_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.tblmoddata_mod_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 230 (class 1259 OID 24630)
-- Name: tblres; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tblres (
    result_id integer NOT NULL,
    user_id integer NOT NULL,
    modact_id integer NOT NULL,
    resgen character varying(100) NOT NULL
);


--
-- TOC entry 229 (class 1259 OID 24629)
-- Name: tblres_result_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.tblres ALTER COLUMN result_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.tblres_result_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 4883 (class 2606 OID 16397)
-- Name: lmsusers lmsusers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lmsusers
    ADD CONSTRAINT lmsusers_pkey PRIMARY KEY (user_id);


--
-- TOC entry 4885 (class 2606 OID 24592)
-- Name: tblactlog tblactlog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tblactlog
    ADD CONSTRAINT tblactlog_pkey PRIMARY KEY (act_id);


--
-- TOC entry 4887 (class 2606 OID 24603)
-- Name: tblcert tblcert_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tblcert
    ADD CONSTRAINT tblcert_pkey PRIMARY KEY (cert_id);


--
-- TOC entry 4889 (class 2606 OID 24615)
-- Name: tblmodact tblmodact_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tblmodact
    ADD CONSTRAINT tblmodact_pkey PRIMARY KEY (modact_id);


--
-- TOC entry 4891 (class 2606 OID 24628)
-- Name: tblmoddata tblmoddata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tblmoddata
    ADD CONSTRAINT tblmoddata_pkey PRIMARY KEY (mod_id);


--
-- TOC entry 4893 (class 2606 OID 24638)
-- Name: tblres tblres_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tblres
    ADD CONSTRAINT tblres_pkey PRIMARY KEY (result_id);


-- Completed on 2026-06-08 21:19:25

--
-- PostgreSQL database dump complete
--

\unrestrict 3dh7rSoXLQZwMrtUqIz7kMGLXeTSERZHPfhuNPiNzrL6aDMoaats3s6iT15qAsH


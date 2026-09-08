-- Stub do ambiente Supabase para Postgres puro
--
-- As migrations deste repositório dependem de objetos que o Supabase provê e
-- que `postgres:15-alpine` não tem: o schema `auth`, a tabela `auth.users`, a
-- função `auth.uid()`, os roles `anon`/`authenticated`/`service_role` e as
-- extensões `pgcrypto` e `pg_trgm`. Sem este stub, a 001 falha na primeira
-- linha (`REFERENCES auth.users(id)`).
--
-- ─── POR QUE OS DEFAULT PRIVILEGES ESTÃO AQUI ──────────────────────────
--
-- O Supabase configura DEFAULT PRIVILEGES no schema `public` concedendo tudo
-- a `anon` e `authenticated` em toda tabela nova (ver 004). É justamente esse
-- grant automático que o `REVOKE ALL ON public.positions FROM anon,
-- authenticated` da 006 precisa desfazer.
--
-- Reproduzi-lo ANTES de aplicar as migrations é o que torna o teste honesto:
-- num Postgres virgem não há grant algum, então o REVOKE passaria por
-- vacuidade e a asserção de "anon sem privilégio" não provaria nada.
--
-- ─── auth.uid() ────────────────────────────────────────────────────────
--
-- No Supabase, `auth.uid()` lê o `sub` do JWT que o PostgREST injeta como GUC
-- de sessão. O stub reproduz o mesmo contrato, de modo que o teste assume uma
-- identidade com `SET request.jwt.claim.sub = '<uuid>'`.

BEGIN;

-- ─────────────────────────────────────────────────────────────────
-- Extensões
-- ─────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─────────────────────────────────────────────────────────────────
-- Roles
-- ─────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────
-- Schema auth
-- ─────────────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS auth;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;

-- Só as colunas que as migrations 001/002 tocam.
CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  raw_user_meta_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Identidade da sessão, no mesmo contrato do Supabase: NULL quando não há
-- claim, o que faz toda policy `auth.uid() = user_id` falhar por padrão.
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────
-- Default privileges do Supabase — precisam existir ANTES das migrations
-- ─────────────────────────────────────────────────────────────────

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated;

COMMIT;

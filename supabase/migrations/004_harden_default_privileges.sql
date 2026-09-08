-- Endurecimento de permissões do schema public
--
-- ─── O PROBLEMA ────────────────────────────────────────────────────────
--
-- O Supabase configura DEFAULT PRIVILEGES no schema `public` concedendo
-- `arwdDxtm` a `anon` e `authenticated` — isto é, INSERT, SELECT, UPDATE,
-- DELETE, TRUNCATE, REFERENCES, TRIGGER e MAINTAIN — automaticamente em
-- TODA tabela nova. Confirmado via pg_default_acl em 2026-09-08.
--
-- O modelo do Supabase presume que RLS filtra o acesso, e para SELECT,
-- INSERT, UPDATE e DELETE isso é verdade. Mas TRUNCATE **não é interceptado
-- por RLS** — é gated apenas pelo privilégio de tabela. Verificado
-- empiricamente em Postgres 15: com RLS habilitado e policy apenas de
-- SELECT, `INSERT` é bloqueado e `DELETE` é filtrado para zero linhas,
-- enquanto `TRUNCATE` zera a tabela.
--
-- Alcance prático: o PostgREST não expõe TRUNCATE, então não se explora isso
-- com a anon key via HTTP. Exige conexão direta ao Postgres com o role `anon`.
-- É má configuração latente, não porta aberta — mas o custo de fechar é um
-- REVOKE, e sem isso toda tabela futura (positions, transactions, alerts das
-- Stories 2.2/2.5/2.6) nasce com o mesmo furo.
--
-- ─── ESCOPO DELIBERADAMENTE ESTREITO ───────────────────────────────────
--
-- Remove-se APENAS TRUNCATE dos defaults. INSERT/SELECT/UPDATE/DELETE
-- continuam concedidos, porque é assim que o PostgREST opera sob RLS —
-- removê-los quebraria o caminho de escrita das tabelas privadas.

BEGIN;

-- Tabelas futuras: para de conceder TRUNCATE
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE TRUNCATE ON TABLES FROM anon, authenticated;

-- Tabela existente: `users` herdou TRUNCATE e DELETE dos defaults, embora a
-- migration 001 só pretendesse conceder SELECT/INSERT/UPDATE. Normaliza para
-- a intenção original.
REVOKE ALL ON public.users FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;

COMMIT;

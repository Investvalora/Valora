-- Asserções de RLS e privilégios de `public.positions` — Story 2.2
--
-- Cobre a linha "Isolamento por usuário" da matriz de I/O da spec, que não é
-- testável em unidade porque o comportamento é do banco, não do cliente:
-- usuário B consultando as posições de A recebe zero linhas, sem erro.
--
-- Rodar com `psql -v ON_ERROR_STOP=1`: cada `assert` falso levanta exceção, o
-- psql aborta e o runner devolve status diferente de zero.
--
-- Toda asserção tem controle positivo ao lado. "B vê zero linhas" só prova
-- algo se "A vê a própria linha" também estiver verificado — senão a tabela
-- poderia estar simplesmente vazia.

\set USER_A '11111111-1111-4111-8111-111111111111'
\set USER_B '22222222-2222-4222-8222-222222222222'

-- ─────────────────────────────────────────────────────────────────
-- Utilitário de asserção
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.assert(condition BOOLEAN, description TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF condition IS TRUE THEN
    RAISE NOTICE 'PASS  %', description;
  ELSE
    RAISE EXCEPTION 'FAIL  %', description;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────
-- Sonda dos default privileges
--
-- Tabela criada DEPOIS das migrations: herda os defaults do schema public tal
-- como estão no fim delas. Se `anon` tem SELECT aqui, os defaults do stub
-- estão vivos — e portanto o REVOKE da 006 sobre `positions` foi exercitado
-- de verdade, não passou por vacuidade.
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE public.probe_default_privileges (id INT);

DO $$
BEGIN
  PERFORM public.assert(
    has_table_privilege('anon', 'public.probe_default_privileges', 'SELECT'),
    'default privileges do stub estao ativos (anon herda SELECT em tabela nova)'
  );

  -- A 004 tirou só TRUNCATE dos defaults; confirma que ela também vale.
  PERFORM public.assert(
    NOT has_table_privilege('anon', 'public.probe_default_privileges', 'TRUNCATE'),
    'migration 004 removeu TRUNCATE dos default privileges'
  );
END $$;

DROP TABLE public.probe_default_privileges;

-- ─────────────────────────────────────────────────────────────────
-- Estrutura: RLS habilitada e as quatro policies
-- ─────────────────────────────────────────────────────────────────

DO $$
BEGIN
  PERFORM public.assert(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.positions'::regclass),
    'RLS habilitada em public.positions'
  );

  PERFORM public.assert(
    (SELECT count(*) = 4 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'positions'),
    'quatro policies em public.positions (uma por operacao)'
  );

  PERFORM public.assert(
    (SELECT count(*) = 2 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'positions' AND with_check IS NOT NULL),
    'INSERT e UPDATE tem WITH CHECK'
  );
END $$;

-- ─────────────────────────────────────────────────────────────────
-- Privilégios de tabela: anon sem nada, authenticated sem TRUNCATE
-- ─────────────────────────────────────────────────────────────────

DO $$
DECLARE
  privilege TEXT;
BEGIN
  FOREACH privilege IN ARRAY ARRAY[
    'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'
  ]
  LOOP
    PERFORM public.assert(
      NOT has_table_privilege('anon', 'public.positions', privilege),
      format('anon nao tem %s em public.positions', privilege)
    );
  END LOOP;

  -- TRUNCATE não é interceptado por RLS (ver 004): o privilégio é a única
  -- barreira, então precisa estar ausente.
  PERFORM public.assert(
    NOT has_table_privilege('authenticated', 'public.positions', 'TRUNCATE'),
    'authenticated nao tem TRUNCATE em public.positions'
  );

  FOREACH privilege IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']
  LOOP
    PERFORM public.assert(
      has_table_privilege('authenticated', 'public.positions', privilege),
      format('authenticated tem %s em public.positions', privilege)
    );
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────
-- Fixtures: dois usuários e dois ativos do catálogo
-- ─────────────────────────────────────────────────────────────────

-- A migration 002 cria a linha em public.users por trigger.
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  (:'USER_A', 'a@valora.test', '{"full_name": "Usuario A"}'::jsonb),
  (:'USER_B', 'b@valora.test', '{"full_name": "Usuario B"}'::jsonb);

INSERT INTO public.assets (ticker, name, type, currency, quote_provider) VALUES
  ('PETR4', 'Petrobras PN', 'stock_br', 'BRL', 'brapi'),
  ('VALE3', 'Vale ON',      'stock_br', 'BRL', 'brapi');

DO $$
BEGIN
  PERFORM public.assert(
    (SELECT count(*) = 2 FROM public.users),
    'trigger da migration 002 criou os dois perfis em public.users'
  );
END $$;

-- ─────────────────────────────────────────────────────────────────
-- Usuário A grava a própria posição (caminho felizes do INSERT + WITH CHECK)
-- ─────────────────────────────────────────────────────────────────

SET ROLE authenticated;
SET request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

INSERT INTO public.positions (user_id, ticker, quantity, average_price, acquisition_date)
VALUES (:'USER_A', 'PETR4', 100, 32.1000, '2026-01-15');

DO $$
BEGIN
  PERFORM public.assert(
    (SELECT count(*) = 1 FROM public.positions),
    'A enxerga a propria posicao (controle positivo do SELECT)'
  );
END $$;

-- WITH CHECK do INSERT: A não grava posição no nome de B.
DO $$
DECLARE
  observed TEXT := 'nenhum erro';
BEGIN
  BEGIN
    INSERT INTO public.positions (user_id, ticker, quantity, average_price, acquisition_date)
    VALUES ('22222222-2222-4222-8222-222222222222', 'VALE3', 1, 1, '2026-01-15');
  EXCEPTION WHEN OTHERS THEN
    observed := SQLSTATE;
  END;

  PERFORM public.assert(
    observed = '42501',
    format('A nao insere posicao de B: esperado SQLSTATE 42501, obtido %s', observed)
  );
END $$;

RESET ROLE;
RESET request.jwt.claim.sub;

-- ─────────────────────────────────────────────────────────────────
-- Usuário B: isolamento de leitura e de escrita
-- ─────────────────────────────────────────────────────────────────

SET ROLE authenticated;
SET request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';

DO $$
DECLARE
  affected INT;
BEGIN
  -- Linha da matriz: zero linhas, sem erro.
  PERFORM public.assert(
    (SELECT count(*) = 0 FROM public.positions),
    'B recebe zero linhas ao consultar posicoes (isolamento por usuario)'
  );

  PERFORM public.assert(
    (SELECT count(*) = 0 FROM public.positions WHERE ticker = 'PETR4'),
    'B nao alcanca a posicao de A nem filtrando pelo ticker'
  );

  UPDATE public.positions SET quantity = 999 WHERE ticker = 'PETR4';
  GET DIAGNOSTICS affected = ROW_COUNT;
  PERFORM public.assert(affected = 0, 'UPDATE de B nao atinge linha alguma de A');

  DELETE FROM public.positions WHERE ticker = 'PETR4';
  GET DIAGNOSTICS affected = ROW_COUNT;
  PERFORM public.assert(affected = 0, 'DELETE de B nao atinge linha alguma de A');
END $$;

-- B grava a própria posição: prova que a policy filtra por dono, e não que a
-- escrita esteja quebrada para todos.
INSERT INTO public.positions (user_id, ticker, quantity, average_price, acquisition_date)
VALUES (:'USER_B', 'VALE3', 50, 61.5000, '2026-02-20');

DO $$
BEGIN
  PERFORM public.assert(
    (SELECT count(*) = 1 FROM public.positions),
    'B enxerga apenas a propria posicao depois de gravar'
  );

  PERFORM public.assert(
    (SELECT ticker = 'VALE3' FROM public.positions),
    'a unica linha visivel a B e a de B'
  );
END $$;

RESET ROLE;
RESET request.jwt.claim.sub;

-- ─────────────────────────────────────────────────────────────────
-- Visão de dono (bypassa RLS): a linha de A sobreviveu intacta
-- ─────────────────────────────────────────────────────────────────

DO $$
BEGIN
  PERFORM public.assert(
    (SELECT count(*) = 2 FROM public.positions),
    'as duas posicoes existem de fato na tabela'
  );

  PERFORM public.assert(
    (SELECT quantity = 100 AND user_id = '11111111-1111-4111-8111-111111111111'
       FROM public.positions WHERE ticker = 'PETR4'),
    'a posicao de A permaneceu intacta apos UPDATE e DELETE de B'
  );
END $$;

-- ─────────────────────────────────────────────────────────────────
-- Sessão sem identidade (auth.uid() nulo) não alcança nada
-- ─────────────────────────────────────────────────────────────────

SET ROLE authenticated;

DO $$
BEGIN
  PERFORM public.assert(
    (SELECT count(*) = 0 FROM public.positions),
    'sessao sem claim de usuario nao le posicao alguma'
  );
END $$;

RESET ROLE;

-- ─────────────────────────────────────────────────────────────────
-- Constraints de domínio da 006
-- ─────────────────────────────────────────────────────────────────

SET ROLE authenticated;
SET request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

DO $$
DECLARE
  observed TEXT := 'nenhum erro';
BEGIN
  -- Duplicata (user_id, ticker) — o 23505 que o formulário traduz.
  BEGIN
    INSERT INTO public.positions (user_id, ticker, quantity, average_price, acquisition_date)
    VALUES ('11111111-1111-4111-8111-111111111111', 'PETR4', 1, 1, '2026-03-01');
  EXCEPTION WHEN OTHERS THEN
    observed := SQLSTATE;
  END;
  PERFORM public.assert(
    observed = '23505',
    format('posicao duplicada devolve 23505, obtido %s', observed)
  );

  -- Quantidade zero.
  observed := 'nenhum erro';
  BEGIN
    INSERT INTO public.positions (user_id, ticker, quantity, average_price, acquisition_date)
    VALUES ('11111111-1111-4111-8111-111111111111', 'VALE3', 0, 1, '2026-03-01');
  EXCEPTION WHEN OTHERS THEN
    observed := SQLSTATE;
  END;
  PERFORM public.assert(
    observed = '23514',
    format('quantidade zero viola CHECK (23514), obtido %s', observed)
  );

  -- Ticker fora do catálogo: a FK é a garantia real por trás da mensagem
  -- "Ativo não encontrado".
  observed := 'nenhum erro';
  BEGIN
    INSERT INTO public.positions (user_id, ticker, quantity, average_price, acquisition_date)
    VALUES ('11111111-1111-4111-8111-111111111111', 'PETR99', 1, 1, '2026-03-01');
  EXCEPTION WHEN OTHERS THEN
    observed := SQLSTATE;
  END;
  PERFORM public.assert(
    observed = '23503',
    format('ticker fora do catalogo viola a FK (23503), obtido %s', observed)
  );
END $$;

RESET ROLE;
RESET request.jwt.claim.sub;

DROP FUNCTION public.assert(BOOLEAN, TEXT);

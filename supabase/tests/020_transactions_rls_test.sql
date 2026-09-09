-- Asserções de `public.transactions` e do recálculo de posição — Story 2.5 (backend)
--
-- Cobre as linhas da matriz de I/O da spec que são comportamento de BANCO e
-- não têm como ser testadas em unidade: isolamento por usuário, constraints, e
-- a aritmética do trigger `recalculate_position_on_transaction`.
--
-- Rodar com `psql -v ON_ERROR_STOP=1`: cada `assert` falso levanta exceção, o
-- psql aborta e o runner devolve status diferente de zero.
--
-- Toda asserção tem controle positivo ao lado. "B vê zero linhas" só prova
-- algo se "A vê a própria linha" também estiver verificado — senão a tabela
-- poderia estar simplesmente vazia. As asserções de posição APAGADA rodam na
-- sessão do próprio dono (RLS não esconde a linha de quem a possui) e são
-- fechadas por uma varredura final com visão de superusuário, que confere o
-- conjunto inteiro de `positions` — sob RLS, "não vejo a linha" e "a linha não
-- existe" seriam indistinguíveis para linha de terceiro.
--
-- Identidades próprias, distintas das de `010_positions_rls_test.sql`: os dois
-- arquivos rodam no MESMO banco, em sequência, e este não deve depender do
-- estado deixado por aquele nem colidir com ele.

\set TX_USER_A '33333333-3333-4333-8333-333333333333'
\set TX_USER_B '44444444-4444-4444-8444-444444444444'

-- ─────────────────────────────────────────────────────────────────
-- Utilitário de asserção (o 010 dropa o dele ao terminar)
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
-- estão vivos — e portanto o REVOKE da 007 sobre `transactions` foi
-- exercitado de verdade, não passou por vacuidade.
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE public.probe_default_privileges_007 (id INT);

DO $$
BEGIN
  PERFORM public.assert(
    has_table_privilege('anon', 'public.probe_default_privileges_007', 'SELECT'),
    'default privileges do stub estao ativos (anon herda SELECT em tabela nova)'
  );
END $$;

DROP TABLE public.probe_default_privileges_007;

-- ─────────────────────────────────────────────────────────────────
-- Estrutura: enum, coluna `seq`, índices, RLS e as quatro policies
-- ─────────────────────────────────────────────────────────────────

DO $$
BEGIN
  PERFORM public.assert(
    (SELECT count(*) = 5 FROM pg_enum e
       JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'transaction_type'),
    'enum transaction_type tem os cinco valores da arquitetura'
  );

  PERFORM public.assert(
    (SELECT array_agg(e.enumlabel::text ORDER BY e.enumsortorder)
             = ARRAY['buy', 'sell', 'dividend', 'jcp', 'bonus']
       FROM pg_enum e
       JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'transaction_type'),
    'valores do enum sao buy|sell|dividend|jcp|bonus'
  );

  -- `attidentity = 'a'` é GENERATED ALWAYS AS IDENTITY. É o mecanismo que dá
  -- ordem determinística ao recálculo — sem ele o desempate cairia no `id`
  -- UUID aleatório num INSERT em lote.
  PERFORM public.assert(
    (SELECT attidentity = 'a' FROM pg_attribute
      WHERE attrelid = 'public.transactions'::regclass AND attname = 'seq'),
    'transactions.seq e GENERATED ALWAYS AS IDENTITY'
  );

  PERFORM public.assert(
    (SELECT count(*) = 1 FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'transactions'
        AND indexname = 'transactions_user_id_ticker_seq_idx'),
    'indice (user_id, ticker, seq) existe para servir o loop do recalculo'
  );

  PERFORM public.assert(
    (SELECT count(*) = 3 FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'transactions'
        AND indexname LIKE 'transactions_%_idx'),
    'os tres indices no padrao <tabela>_<colunas>_idx existem'
  );

  PERFORM public.assert(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.transactions'::regclass),
    'RLS habilitada em public.transactions'
  );

  PERFORM public.assert(
    (SELECT count(*) = 4 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'transactions'),
    'quatro policies em public.transactions (uma por operacao)'
  );

  PERFORM public.assert(
    (SELECT count(*) = 2 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'transactions'
        AND with_check IS NOT NULL),
    'INSERT e UPDATE de transactions tem WITH CHECK'
  );
END $$;

-- ─────────────────────────────────────────────────────────────────
-- Estrutura: função de recálculo e trigger
-- ─────────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- `SECURITY DEFINER` aqui seria furo de RLS: a função é chamável, então sob
  -- DEFINER um usuário passaria o `user_id` de outro e apagaria a posição da
  -- vítima. A inércia da chamada alheia é provada mais abaixo.
  PERFORM public.assert(
    (SELECT NOT prosecdef FROM pg_proc
      WHERE oid = 'public.recalculate_position(uuid, text)'::regprocedure),
    'recalculate_position NAO usa SECURITY DEFINER (roda como o invocador)'
  );

  PERFORM public.assert(
    (SELECT NOT prosecdef FROM pg_proc
      WHERE oid = 'public.handle_transaction_recalculation()'::regprocedure),
    'a funcao do trigger NAO usa SECURITY DEFINER'
  );

  -- tgtype é bitmask: ROW=1, BEFORE=2, INSERT=4, DELETE=8, UPDATE=16.
  -- 1+4+8+16 = 29 é exatamente "AFTER INSERT OR UPDATE OR DELETE FOR EACH ROW".
  PERFORM public.assert(
    (SELECT tgtype = 29 FROM pg_trigger
      WHERE tgrelid = 'public.transactions'::regclass
        AND tgname = 'recalculate_position_on_transaction'),
    'trigger e AFTER INSERT OR UPDATE OR DELETE FOR EACH ROW (tgtype 29)'
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
      NOT has_table_privilege('anon', 'public.transactions', privilege),
      format('anon nao tem %s em public.transactions', privilege)
    );
  END LOOP;

  -- TRUNCATE não é interceptado por RLS (ver 004): o privilégio é a única
  -- barreira, então precisa estar ausente.
  PERFORM public.assert(
    NOT has_table_privilege('authenticated', 'public.transactions', 'TRUNCATE'),
    'authenticated nao tem TRUNCATE em public.transactions'
  );

  FOREACH privilege IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']
  LOOP
    PERFORM public.assert(
      has_table_privilege('authenticated', 'public.transactions', privilege),
      format('authenticated tem %s em public.transactions', privilege)
    );
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────
-- Fixtures: dois usuários próprios e os ativos usados por cada cenário
-- ─────────────────────────────────────────────────────────────────

-- A migration 002 cria a linha em public.users por trigger.
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  (:'TX_USER_A', 'tx-a@valora.test', '{"full_name": "Usuario Tx A"}'::jsonb),
  (:'TX_USER_B', 'tx-b@valora.test', '{"full_name": "Usuario Tx B"}'::jsonb);

-- `ON CONFLICT DO NOTHING`: PETR4 e VALE3 podem já existir, inseridos pelo
-- 010 no mesmo banco. Um ticker por cenário mantém os cenários independentes.
INSERT INTO public.assets (ticker, name, type, currency, quote_provider) VALUES
  ('PETR4',  'Petrobras PN',   'stock_br', 'BRL', 'brapi'),
  ('VALE3',  'Vale ON',        'stock_br', 'BRL', 'brapi'),
  ('ITUB4',  'Itau PN',        'stock_br', 'BRL', 'brapi'),
  ('BBAS3',  'Banco do Brasil','stock_br', 'BRL', 'brapi'),
  ('MGLU3',  'Magazine Luiza', 'stock_br', 'BRL', 'brapi'),
  ('WEGE3',  'WEG ON',         'stock_br', 'BRL', 'brapi'),
  ('ABEV3',  'Ambev ON',       'stock_br', 'BRL', 'brapi'),
  ('BBDC4',  'Bradesco PN',    'stock_br', 'BRL', 'brapi'),
  ('EGIE3',  'Engie ON',       'stock_br', 'BRL', 'brapi'),
  ('TAEE11', 'Taesa UNT',      'stock_br', 'BRL', 'brapi'),
  ('SANB11', 'Santander UNT',  'stock_br', 'BRL', 'brapi'),
  ('CMIG4',  'Cemig PN',       'stock_br', 'BRL', 'brapi')
ON CONFLICT (ticker) DO NOTHING;

DO $$
BEGIN
  PERFORM public.assert(
    (SELECT count(*) = 2 FROM public.users
      WHERE id IN ('33333333-3333-4333-8333-333333333333',
                   '44444444-4444-4444-8444-444444444444')),
    'trigger da migration 002 criou os dois perfis desta suite em public.users'
  );
END $$;

-- ═════════════════════════════════════════════════════════════════
-- RLS: isolamento entre A e B
-- ═════════════════════════════════════════════════════════════════

SET ROLE authenticated;
SET request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';

-- Caminho felizes do INSERT + WITH CHECK, e primeiro disparo do trigger.
INSERT INTO public.transactions (user_id, ticker, type, quantity, price, transaction_date)
VALUES (:'TX_USER_A', 'PETR4', 'buy', 100, 10.0000, '2026-01-10');

DO $$
BEGIN
  PERFORM public.assert(
    (SELECT count(*) = 1 FROM public.transactions),
    'A enxerga a propria transacao (controle positivo do SELECT)'
  );

  -- Controle positivo do recálculo sob a sessão do dono: o UPSERT em
  -- `positions` passou pelas policies da 006 sem SECURITY DEFINER.
  PERFORM public.assert(
    (SELECT quantity = 100 AND average_price = 10.0000
       FROM public.positions
      WHERE user_id = '33333333-3333-4333-8333-333333333333' AND ticker = 'PETR4'),
    'trigger materializou a posicao de A rodando como o proprio A (sem SECURITY DEFINER)'
  );
END $$;

-- WITH CHECK do INSERT: A não grava transação no nome de B — e portanto não
-- dispara o recálculo da posição de B.
DO $$
DECLARE
  observed TEXT := 'nenhum erro';
BEGIN
  BEGIN
    INSERT INTO public.transactions (user_id, ticker, type, quantity, price, transaction_date)
    VALUES ('44444444-4444-4444-8444-444444444444', 'VALE3', 'buy', 1, 1, '2026-01-10');
  EXCEPTION WHEN OTHERS THEN
    observed := SQLSTATE;
  END;

  PERFORM public.assert(
    observed = '42501',
    format('A nao insere transacao de B: esperado SQLSTATE 42501, obtido %s', observed)
  );
END $$;

RESET ROLE;
RESET request.jwt.claim.sub;

SET ROLE authenticated;
SET request.jwt.claim.sub = '44444444-4444-4444-8444-444444444444';

DO $$
DECLARE
  affected INT;
BEGIN
  -- Linha da matriz: zero linhas, sem erro.
  PERFORM public.assert(
    (SELECT count(*) = 0 FROM public.transactions),
    'B recebe zero linhas ao consultar transacoes (isolamento por usuario)'
  );

  PERFORM public.assert(
    (SELECT count(*) = 0 FROM public.transactions WHERE ticker = 'PETR4'),
    'B nao alcanca a transacao de A nem filtrando pelo ticker'
  );

  UPDATE public.transactions SET quantity = 999 WHERE ticker = 'PETR4';
  GET DIAGNOSTICS affected = ROW_COUNT;
  PERFORM public.assert(affected = 0, 'UPDATE de B nao atinge transacao alguma de A');

  DELETE FROM public.transactions WHERE ticker = 'PETR4';
  GET DIAGNOSTICS affected = ROW_COUNT;
  PERFORM public.assert(affected = 0, 'DELETE de B nao atinge transacao alguma de A');
END $$;

-- B grava a própria transação: prova que a policy filtra por dono, e não que
-- a escrita esteja quebrada para todos. Esta posição é a vítima do teste de
-- chamada alheia, mais abaixo.
INSERT INTO public.transactions (user_id, ticker, type, quantity, price, transaction_date)
VALUES (:'TX_USER_B', 'PETR4', 'buy', 200, 20.0000, '2026-01-20');

DO $$
BEGIN
  PERFORM public.assert(
    (SELECT count(*) = 1 FROM public.transactions),
    'B enxerga apenas a propria transacao depois de gravar'
  );

  PERFORM public.assert(
    (SELECT quantity = 200 AND average_price = 20.0000
       FROM public.positions
      WHERE user_id = '44444444-4444-4444-8444-444444444444' AND ticker = 'PETR4'),
    'B materializou a propria posicao de PETR4 (mesmo ticker de A, linha distinta)'
  );
END $$;

RESET ROLE;
RESET request.jwt.claim.sub;

-- Visão de dono (bypassa RLS): as duas linhas coexistem e a de A ficou intacta.
DO $$
BEGIN
  PERFORM public.assert(
    (SELECT count(*) = 2 FROM public.transactions WHERE ticker = 'PETR4'),
    'as transacoes de A e de B em PETR4 coexistem de fato na tabela'
  );

  PERFORM public.assert(
    (SELECT quantity = 100 FROM public.positions
      WHERE user_id = '33333333-3333-4333-8333-333333333333' AND ticker = 'PETR4'),
    'a posicao de A permaneceu intacta apos UPDATE e DELETE de B'
  );
END $$;

-- Sessão sem identidade (auth.uid() nulo) não alcança nada.
SET ROLE authenticated;

DO $$
BEGIN
  PERFORM public.assert(
    (SELECT count(*) = 0 FROM public.transactions),
    'sessao sem claim de usuario nao le transacao alguma'
  );
END $$;

RESET ROLE;

-- ═════════════════════════════════════════════════════════════════
-- Constraints de domínio da 007
-- ═════════════════════════════════════════════════════════════════

SET ROLE authenticated;
SET request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';

DO $$
DECLARE
  observed TEXT := 'nenhum erro';
BEGIN
  -- Ticker fora do catálogo: a FK é a garantia real por trás da mensagem
  -- "Ativo não encontrado" da importação.
  BEGIN
    INSERT INTO public.transactions (user_id, ticker, type, quantity, price, transaction_date)
    VALUES ('33333333-3333-4333-8333-333333333333', 'PETR99', 'buy', 1, 1, '2026-03-01');
  EXCEPTION WHEN OTHERS THEN
    observed := SQLSTATE;
  END;
  PERFORM public.assert(
    observed = '23503',
    format('ticker fora do catalogo viola a FK (23503), obtido %s', observed)
  );

  -- Quantidade zero não é evento — o sinal é o `type`, não a quantidade.
  observed := 'nenhum erro';
  BEGIN
    INSERT INTO public.transactions (user_id, ticker, type, quantity, price, transaction_date)
    VALUES ('33333333-3333-4333-8333-333333333333', 'VALE3', 'buy', 0, 1, '2026-03-01');
  EXCEPTION WHEN OTHERS THEN
    observed := SQLSTATE;
  END;
  PERFORM public.assert(
    observed = '23514',
    format('quantidade zero viola CHECK (23514), obtido %s', observed)
  );

  observed := 'nenhum erro';
  BEGIN
    INSERT INTO public.transactions (user_id, ticker, type, quantity, price, transaction_date)
    VALUES ('33333333-3333-4333-8333-333333333333', 'VALE3', 'buy', 1, -1, '2026-03-01');
  EXCEPTION WHEN OTHERS THEN
    observed := SQLSTATE;
  END;
  PERFORM public.assert(
    observed = '23514',
    format('preco negativo viola CHECK (23514), obtido %s', observed)
  );

  -- `seq` é a ordem de chegada e não pode ser escrita nem reescrita, senão a
  -- reprodutibilidade do preço médio deixa de ser garantida.
  observed := 'nenhum erro';
  BEGIN
    INSERT INTO public.transactions (user_id, ticker, type, quantity, price, transaction_date, seq)
    VALUES ('33333333-3333-4333-8333-333333333333', 'VALE3', 'buy', 1, 1, '2026-03-01', 1);
  EXCEPTION WHEN OTHERS THEN
    observed := SQLSTATE;
  END;
  PERFORM public.assert(
    observed = '428C9',
    format('INSERT com seq explicito e recusado com 428C9 (GENERATED ALWAYS), obtido %s', observed)
  );

  observed := 'nenhum erro';
  BEGIN
    UPDATE public.transactions SET seq = 999 WHERE ticker = 'PETR4';
  EXCEPTION WHEN OTHERS THEN
    observed := SQLSTATE;
  END;
  PERFORM public.assert(
    observed = '428C9',
    format('UPDATE de seq e recusado com 428C9 (ordem de chegada e imutavel), obtido %s', observed)
  );
END $$;

-- ═════════════════════════════════════════════════════════════════
-- Recálculo: golden progressivo (VALE3), um INSERT por passo
-- ═════════════════════════════════════════════════════════════════

INSERT INTO public.transactions (user_id, ticker, type, quantity, price, transaction_date)
VALUES (:'TX_USER_A', 'VALE3', 'buy', 100, 10.0000, '2026-01-05');

DO $$
BEGIN
  PERFORM public.assert(
    (SELECT quantity = 100 AND average_price = 10.0000 AND acquisition_date = '2026-01-05'
       FROM public.positions
      WHERE user_id = '33333333-3333-4333-8333-333333333333' AND ticker = 'VALE3'),
    'primeira compra: qty 100, avg 10,00, acquisition_date = data da compra'
  );
END $$;

INSERT INTO public.transactions (user_id, ticker, type, quantity, price, transaction_date)
VALUES (:'TX_USER_A', 'VALE3', 'buy', 100, 20.0000, '2026-02-05');

DO $$
BEGIN
  PERFORM public.assert(
    (SELECT quantity = 200 AND average_price = 15.0000
       FROM public.positions
      WHERE user_id = '33333333-3333-4333-8333-333333333333' AND ticker = 'VALE3'),
    'segunda compra pondera o preco medio: qty 200, avg 15,00'
  );

  PERFORM public.assert(
    (SELECT acquisition_date = '2026-01-05'
       FROM public.positions
      WHERE user_id = '33333333-3333-4333-8333-333333333333' AND ticker = 'VALE3'),
    'acquisition_date continua no MIN(transaction_date) das compras'
  );
END $$;

INSERT INTO public.transactions (user_id, ticker, type, quantity, price, transaction_date)
VALUES (:'TX_USER_A', 'VALE3', 'sell', 50, 30.0000, '2026-03-05');

DO $$
BEGIN
  -- Baixa a custo médio: a venda reduz a quantidade e NÃO move o preço médio.
  PERFORM public.assert(
    (SELECT quantity = 150 AND average_price = 15.0000
       FROM public.positions
      WHERE user_id = '33333333-3333-4333-8333-333333333333' AND ticker = 'VALE3'),
    'venda parcial baixa a custo medio: qty 150, avg 15,00 (inalterado)'
  );
END $$;

INSERT INTO public.transactions (user_id, ticker, type, quantity, price, transaction_date)
VALUES (:'TX_USER_A', 'VALE3', 'sell', 150, 5.0000, '2026-04-05');

DO $$
BEGIN
  -- Ausência da LINHA, não `NOT EXISTS (quantity <= 0)` — essa segunda forma
  -- é vacuamente verdadeira, porque o CHECK da 006 já proíbe quantity <= 0.
  PERFORM public.assert(
    NOT EXISTS (SELECT 1 FROM public.positions
                 WHERE user_id = '33333333-3333-4333-8333-333333333333'
                   AND ticker = 'VALE3'),
    'venda que zera APAGA a linha de positions (ausencia da linha)'
  );

  -- Controle: as quatro transações continuam lá; o que desapareceu é a posição.
  PERFORM public.assert(
    (SELECT count(*) = 4 FROM public.transactions
      WHERE user_id = '33333333-3333-4333-8333-333333333333' AND ticker = 'VALE3'),
    'as transacoes de VALE3 sobrevivem ao apagamento da posicao'
  );
END $$;

-- ═════════════════════════════════════════════════════════════════
-- Recálculo: golden em INSERT EM LOTE, TODAS NA MESMA DATA (ITUB4)
--
-- É o caminho de consumo real desta fatia — a importação CSV grava N linhas
-- num único statement, então todas compartilham `created_at = NOW()` e a
-- `transaction_date` do arquivo costuma repetir. Sem a coluna `seq`, o
-- desempate cairia no `id` UUID ALEATÓRIO e este resultado seria sorteado
-- (medido: 20,00 em 1 de 10 execuções). Com `seq`, a ordem do VALUES é a
-- ordem do recálculo, sempre.
-- ═════════════════════════════════════════════════════════════════

INSERT INTO public.transactions (user_id, ticker, type, quantity, price, transaction_date)
VALUES
  (:'TX_USER_A', 'ITUB4', 'buy',  100, 10.0000, '2026-05-01'),
  (:'TX_USER_A', 'ITUB4', 'sell',  50, 20.0000, '2026-05-01'),
  (:'TX_USER_A', 'ITUB4', 'buy',   50, 30.0000, '2026-05-01');

DO $$
BEGIN
  PERFORM public.assert(
    (SELECT quantity = 100 AND average_price = 20.0000
       FROM public.positions
      WHERE user_id = '33333333-3333-4333-8333-333333333333' AND ticker = 'ITUB4'),
    'lote de mesma data, ordem do VALUES: avg 20,00 (media movel), nao 16,67 (formula agregada)'
  );

  PERFORM public.assert(
    (SELECT array_agg(type::text ORDER BY seq) = ARRAY['buy', 'sell', 'buy']
       FROM public.transactions
      WHERE user_id = '33333333-3333-4333-8333-333333333333' AND ticker = 'ITUB4'),
    'seq preservou a ordem de chegada do lote (buy, sell, buy)'
  );
END $$;

-- Reimportar o mesmo conteúdo tem de dar o MESMO número: a determinismo é o
-- ponto. Segundo lote idêntico, em outro ticker, com a mesma ordem.
INSERT INTO public.transactions (user_id, ticker, type, quantity, price, transaction_date)
VALUES
  (:'TX_USER_A', 'BBDC4', 'buy',  100, 10.0000, '2026-05-01'),
  (:'TX_USER_A', 'BBDC4', 'sell',  50, 20.0000, '2026-05-01'),
  (:'TX_USER_A', 'BBDC4', 'buy',   50, 30.0000, '2026-05-01');

DO $$
BEGIN
  PERFORM public.assert(
    (SELECT count(*) = 2 AND count(DISTINCT average_price) = 1
       FROM public.positions
      WHERE user_id = '33333333-3333-4333-8333-333333333333'
        AND ticker IN ('ITUB4', 'BBDC4')),
    'lotes identicos produzem o mesmo preco medio (recalculo reproduzivel)'
  );
END $$;

-- ═════════════════════════════════════════════════════════════════
-- Recálculo: ordem CAUSAL — heap divergindo de `seq` (SANB11)
--
-- O teste do lote acima passaria mesmo sem `seq` no ORDER BY: um lote recém
-- inserido e nunca atualizado é varrido na ordem do heap, que coincide com a
-- ordem do VALUES. Aqui forçamos a divergência: um UPDATE na venda reescreve
-- a tupla e a joga para o FIM do heap. Um `ORDER BY transaction_date` sem
-- `seq` então veria (buy, buy, sell) → 16,67; só `ORDER BY transaction_date,
-- seq` preserva (buy, sell, buy) → 20,00. Se alguém remover `seq` do loop do
-- recálculo, ESTA asserção quebra (as outras não).
-- ═════════════════════════════════════════════════════════════════

INSERT INTO public.transactions (user_id, ticker, type, quantity, price, transaction_date)
VALUES
  (:'TX_USER_A', 'SANB11', 'buy',  100, 10.0000, '2026-05-01'),
  (:'TX_USER_A', 'SANB11', 'sell',  50, 20.0000, '2026-05-01'),
  (:'TX_USER_A', 'SANB11', 'buy',   50, 30.0000, '2026-05-01');

-- Reescreve a venda (valor idêntico): a nova tupla vai para a cauda do heap,
-- então a ordem física deixa de casar com a ordem de chegada.
UPDATE public.transactions
   SET price = 20.0000
 WHERE user_id = :'TX_USER_A' AND ticker = 'SANB11' AND type = 'sell';

DO $$
BEGIN
  PERFORM public.assert(
    (SELECT quantity = 100 AND average_price = 20.0000
       FROM public.positions
      WHERE user_id = '33333333-3333-4333-8333-333333333333' AND ticker = 'SANB11'),
    'ordem causal: com heap divergindo de seq, avg 20,00 so sai ordenando por seq'
  );
END $$;

-- ═════════════════════════════════════════════════════════════════
-- Recálculo: venda maior que a posição, venda POR ÚLTIMO (BBAS3)
-- ═════════════════════════════════════════════════════════════════

INSERT INTO public.transactions (user_id, ticker, type, quantity, price, transaction_date)
VALUES (:'TX_USER_A', 'BBAS3', 'buy', 100, 10.0000, '2026-01-01');

DO $$
BEGIN
  PERFORM public.assert(
    (SELECT quantity = 100 FROM public.positions
      WHERE user_id = '33333333-3333-4333-8333-333333333333' AND ticker = 'BBAS3'),
    'controle positivo: a posicao de BBAS3 existia antes da venda excedente'
  );
END $$;

INSERT INTO public.transactions (user_id, ticker, type, quantity, price, transaction_date)
VALUES (:'TX_USER_A', 'BBAS3', 'sell', 150, 12.0000, '2026-02-01');

DO $$
BEGIN
  PERFORM public.assert(
    NOT EXISTS (SELECT 1 FROM public.positions
                 WHERE user_id = '33333333-3333-4333-8333-333333333333'
                   AND ticker = 'BBAS3'),
    'venda maior que a posicao apaga a linha e nao estoura (quantidade liquida -50)'
  );
END $$;

-- ═════════════════════════════════════════════════════════════════
-- Recálculo: venda maior que a posição com a venda PRECEDENDO as compras
-- (MGLU3) — a ordem que a reordenação silenciosa produzia
-- ═════════════════════════════════════════════════════════════════

INSERT INTO public.transactions (user_id, ticker, type, quantity, price, transaction_date)
VALUES
  (:'TX_USER_A', 'MGLU3', 'sell', 50, 12.0000, '2026-06-01'),
  (:'TX_USER_A', 'MGLU3', 'buy',  30, 10.0000, '2026-06-01');

DO $$
BEGIN
  PERFORM public.assert(
    NOT EXISTS (SELECT 1 FROM public.positions
                 WHERE user_id = '33333333-3333-4333-8333-333333333333'
                   AND ticker = 'MGLU3'),
    'venda antes das compras, liquido negativo: posicao ausente, sem erro'
  );
END $$;

-- ═════════════════════════════════════════════════════════════════
-- Recálculo: venda antes das compras com líquido POSITIVO (WEGE3)
--
-- O caso exato que o clamp `v_quantity <= 0 -> 0` mascarava: com a venda
-- reordenada para o início, a posição saía com qty 150 (soma das compras) em
-- vez do líquido 100. Aqui a ordem é explícita e o líquido tem de ser exato.
-- ═════════════════════════════════════════════════════════════════

INSERT INTO public.transactions (user_id, ticker, type, quantity, price, transaction_date)
VALUES
  (:'TX_USER_A', 'WEGE3', 'sell',  50, 20.0000, '2026-07-01'),
  (:'TX_USER_A', 'WEGE3', 'buy',  100, 10.0000, '2026-07-01'),
  (:'TX_USER_A', 'WEGE3', 'buy',   50, 30.0000, '2026-07-01');

DO $$
BEGIN
  -- 100 = 100 + 50 - 50. Nunca 150.
  PERFORM public.assert(
    (SELECT quantity = 100 FROM public.positions
      WHERE user_id = '33333333-3333-4333-8333-333333333333' AND ticker = 'WEGE3'),
    'venda antes das compras nao superestima a posicao: qty liquida 100, nao 150'
  );

  -- Regra documentada na 007: a compra que ocorre com quantidade líquida
  -- negativa COBRE o descoberto e só o excedente forma custo — 50 ações a 10
  -- mais 50 a 30 dão 20,00. Sem essa regra o custo seria de ações que já não
  -- existem e o preço médio sairia inflado (25,00).
  PERFORM public.assert(
    (SELECT average_price = 20.0000 FROM public.positions
      WHERE user_id = '33333333-3333-4333-8333-333333333333' AND ticker = 'WEGE3'),
    'compra cobre o descoberto sem custo: avg 20,00'
  );
END $$;

-- ═════════════════════════════════════════════════════════════════
-- Recálculo em DELETE de transação (ABEV3)
-- ═════════════════════════════════════════════════════════════════

INSERT INTO public.transactions (user_id, ticker, type, quantity, price, transaction_date)
VALUES
  (:'TX_USER_A', 'ABEV3', 'buy', 100, 10.0000, '2026-01-02'),
  (:'TX_USER_A', 'ABEV3', 'buy', 100, 20.0000, '2026-02-02');

DO $$
BEGIN
  PERFORM public.assert(
    (SELECT quantity = 200 AND average_price = 15.0000
       FROM public.positions
      WHERE user_id = '33333333-3333-4333-8333-333333333333' AND ticker = 'ABEV3'),
    'controle positivo: ABEV3 com as duas compras da qty 200, avg 15,00'
  );
END $$;

DELETE FROM public.transactions
 WHERE user_id = :'TX_USER_A' AND ticker = 'ABEV3' AND price = 20.0000;

DO $$
BEGIN
  PERFORM public.assert(
    (SELECT quantity = 100 AND average_price = 10.0000
       FROM public.positions
      WHERE user_id = '33333333-3333-4333-8333-333333333333' AND ticker = 'ABEV3'),
    'remover uma compra recalcula a partir do que sobrou: qty 100, avg 10,00'
  );
END $$;

DELETE FROM public.transactions
 WHERE user_id = :'TX_USER_A' AND ticker = 'ABEV3';

DO $$
BEGIN
  PERFORM public.assert(
    NOT EXISTS (SELECT 1 FROM public.positions
                 WHERE user_id = '33333333-3333-4333-8333-333333333333'
                   AND ticker = 'ABEV3'),
    'remover a ultima transacao faz a posicao deixar de existir'
  );
END $$;

-- ═════════════════════════════════════════════════════════════════
-- Só provento, sem compra (EGIE3 recebe o dividendo)
-- ═════════════════════════════════════════════════════════════════

INSERT INTO public.transactions (user_id, ticker, type, quantity, price, transaction_date)
VALUES (:'TX_USER_A', 'EGIE3', 'dividend', 100, 0.5000, '2026-03-10');

DO $$
BEGIN
  PERFORM public.assert(
    NOT EXISTS (SELECT 1 FROM public.positions
                 WHERE user_id = '33333333-3333-4333-8333-333333333333'
                   AND ticker = 'EGIE3'),
    'dividendo sem nenhuma compra nao materializa posicao (nem linha invalida)'
  );

  PERFORM public.assert(
    (SELECT count(*) = 1 FROM public.transactions
      WHERE user_id = '33333333-3333-4333-8333-333333333333' AND ticker = 'EGIE3'),
    'controle positivo: o dividendo foi gravado, so nao virou posicao'
  );
END $$;

-- ═════════════════════════════════════════════════════════════════
-- `bonus`, `jcp` e `dividend` são inertes no recálculo (CMIG4)
--
-- Decisão desta fatia: só `buy`/`sell` movem quantidade e custo; os três
-- tipos de provento não. Sem estas asserções, um recálculo que passasse a
-- somar quantidade no `bonus` (ou custo no `dividend`) passaria despercebido.
-- ═════════════════════════════════════════════════════════════════

INSERT INTO public.transactions (user_id, ticker, type, quantity, price, transaction_date)
VALUES
  (:'TX_USER_A', 'CMIG4', 'buy',      100, 10.0000, '2026-04-01'),
  (:'TX_USER_A', 'CMIG4', 'bonus',     10,  0.0000, '2026-04-02'),
  (:'TX_USER_A', 'CMIG4', 'jcp',      100,  0.3000, '2026-04-03'),
  (:'TX_USER_A', 'CMIG4', 'dividend', 100,  0.5000, '2026-04-04');

DO $$
BEGIN
  -- Se `bonus` somasse quantidade seria 110; se `dividend`/`jcp` movessem
  -- custo, o avg deixaria de ser 10,00. Ambos inertes: 100 @ 10,00.
  PERFORM public.assert(
    (SELECT quantity = 100 AND average_price = 10.0000
       FROM public.positions
      WHERE user_id = '33333333-3333-4333-8333-333333333333' AND ticker = 'CMIG4'),
    'bonus/jcp/dividend sao inertes: qty 100, avg 10,00 (so a compra conta)'
  );
END $$;

-- ═════════════════════════════════════════════════════════════════
-- UPDATE que troca o par (user_id, ticker) recalcula OS DOIS pares
-- ═════════════════════════════════════════════════════════════════

INSERT INTO public.transactions (user_id, ticker, type, quantity, price, transaction_date)
VALUES (:'TX_USER_A', 'EGIE3', 'buy', 100, 10.0000, '2026-03-11');

DO $$
BEGIN
  PERFORM public.assert(
    (SELECT quantity = 100 FROM public.positions
      WHERE user_id = '33333333-3333-4333-8333-333333333333' AND ticker = 'EGIE3'),
    'controle positivo: a compra em EGIE3 materializou a posicao'
  );
END $$;

-- Corrigir o ticker de uma linha importada errada: o par ANTIGO tem de ser
-- recalculado também, senão a posição de origem fica congelada num número que
-- nenhuma transação sustenta.
UPDATE public.transactions
   SET ticker = 'TAEE11'
 WHERE user_id = :'TX_USER_A' AND ticker = 'EGIE3' AND type = 'buy';

DO $$
BEGIN
  PERFORM public.assert(
    NOT EXISTS (SELECT 1 FROM public.positions
                 WHERE user_id = '33333333-3333-4333-8333-333333333333'
                   AND ticker = 'EGIE3'),
    'UPDATE de ticker recalcula o par ANTIGO: posicao de EGIE3 deixa de existir'
  );

  PERFORM public.assert(
    (SELECT quantity = 100 AND average_price = 10.0000 AND acquisition_date = '2026-03-11'
       FROM public.positions
      WHERE user_id = '33333333-3333-4333-8333-333333333333' AND ticker = 'TAEE11'),
    'UPDATE de ticker recalcula o par NOVO: posicao de TAEE11 materializada'
  );
END $$;

-- ═════════════════════════════════════════════════════════════════
-- Chamada direta com `user_id` alheio é INERTE
--
-- A função é chamável por qualquer `authenticated` — é justamente por isso
-- que ela não pode ser SECURITY DEFINER. Sob INVOKER, A não vê as transações
-- de B (RLS de transactions) e o DELETE/UPSERT em `positions` é filtrado
-- pelas policies da 006: nada acontece com a posição da vítima.
-- ═════════════════════════════════════════════════════════════════

DO $$
BEGIN
  PERFORM public.recalculate_position(
    '44444444-4444-4444-8444-444444444444', 'PETR4');
END $$;

RESET ROLE;
RESET request.jwt.claim.sub;

-- A asserção roda com visão de dono DE PROPÓSITO: sob a sessão de A, a
-- posição de B é invisível por RLS, e "não vejo" não prova "não foi apagada".
DO $$
BEGIN
  PERFORM public.assert(
    (SELECT quantity = 200 AND average_price = 20.0000
       FROM public.positions
      WHERE user_id = '44444444-4444-4444-8444-444444444444' AND ticker = 'PETR4'),
    'A chamando recalculate_position com o user_id de B nao altera a posicao de B'
  );
END $$;

-- ═════════════════════════════════════════════════════════════════
-- Varredura final com visão de dono: o estado COMPLETO de positions
--
-- Fecha o flanco que as asserções por cenário deixam aberto: lidas sob a
-- sessão de A, elas provariam "A não vê a linha", não "a linha não existe".
-- Aqui, sem RLS, o conjunto inteiro é conferido de uma vez.
-- ═════════════════════════════════════════════════════════════════

DO $$
BEGIN
  PERFORM public.assert(
    (SELECT array_agg(ticker ORDER BY ticker)
             = ARRAY['BBDC4', 'CMIG4', 'ITUB4', 'PETR4', 'SANB11', 'TAEE11', 'WEGE3']
       FROM public.positions
      WHERE user_id = '33333333-3333-4333-8333-333333333333'),
    'estado final de A: exatamente os sete tickers com quantidade liquida positiva'
  );

  -- Não-vácuo: além de existirem, os valores derivados batem. SANB11 (lote de
  -- mesma data com heap reordenado) e CMIG4 (proventos inertes) são os dois
  -- casos que este arquivo endureceu.
  PERFORM public.assert(
    (SELECT quantity = 100 AND average_price = 20.0000 FROM public.positions
      WHERE user_id = '33333333-3333-4333-8333-333333333333' AND ticker = 'SANB11')
    AND
    (SELECT quantity = 100 AND average_price = 10.0000 FROM public.positions
      WHERE user_id = '33333333-3333-4333-8333-333333333333' AND ticker = 'CMIG4'),
    'estado final de A: SANB11 100@20,00 e CMIG4 100@10,00 conferem'
  );

  PERFORM public.assert(
    (SELECT count(*) = 1 FROM public.positions
      WHERE user_id = '44444444-4444-4444-8444-444444444444'),
    'estado final de B: apenas a propria posicao de PETR4'
  );
END $$;

DROP FUNCTION public.assert(BOOLEAN, TEXT);

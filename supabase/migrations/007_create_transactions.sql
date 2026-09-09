-- Story 2.5 (backend): Schema de Transações e Recálculo de Posição
--
-- ─── O QUE ESTA MIGRATION ENTREGA ──────────────────────────────────────
--
-- O enum `transaction_type`, a tabela `transactions` e o recálculo
-- server-side de `positions` (`public.recalculate_position()` + trigger em
-- INSERT/UPDATE/DELETE) — o bloco que a 006 diferiu por não haver, até aqui,
-- fonte alguma de transações (ver `deferred-work.md`, entrada da Story 2.2).
--
-- A fonte é a importação CSV da Story 2.5, cuja UI vem na fatia seguinte.
-- Esta migration é só a fundação de banco, provada isoladamente por
-- `supabase/tests/020_transactions_rls_test.sql`.
--
-- ─── PREÇO MÉDIO É MÉDIA MÓVEL PONDERADA, NÃO FÓRMULA AGREGADA ─────────
--
-- O recálculo PERCORRE as transações do par `(user_id, ticker)` em ordem e
-- reconstrói quantidade e custo, com baixa a custo médio na venda:
--
--     buy  100 @ 10  -> qty 100, avg 10,00
--     buy  100 @ 20  -> qty 200, avg 15,00
--     sell  50 @ 30  -> qty 150, avg 15,00   (venda não muda o preço médio)
--     sell 150 @  5  -> posição APAGADA (quantidade líquida 0)
--
-- A fórmula agregada de `stories-detailed-DEPRECATED.md` (soma de custos
-- dividida pela soma de quantidades, sobre todas as linhas) é insensível à
-- ordem e devolve 16,67 na sequência compra 100@10 -> venda 50@20 ->
-- compra 50@30, onde a média móvel devolve 20,00. 20,00 é o número que o
-- investidor espera e o que a arquitetura (AR-6) especifica.
--
-- ─── ORDEM DETERMINÍSTICA: `seq`, NUNCA `created_at`/`id` ──────────────
--
-- Se o preço médio é sensível à ordem, a ordem precisa ser estável e
-- reproduzível. `created_at DEFAULT NOW()` é o timestamp do STATEMENT: na
-- importação CSV — o caminho de consumo desta fatia — as N linhas do lote
-- entram num único INSERT e compartilham `created_at`, e o desempate cairia
-- no `id`, um UUID ALEATÓRIO. Medido: a própria sequência acima, inserida em
-- lote e com a mesma `transaction_date`, produziu 20,00 em 1 de 10
-- execuções. Reimportar o mesmo CSV daria preços médios diferentes.
--
-- Daí a coluna `seq` (`GENERATED ALWAYS AS IDENTITY`): ordem de chegada real,
-- monotônica, imutável (`ALWAYS` recusa valor explícito no INSERT e no
-- UPDATE). O loop ordena por `(transaction_date, seq)` e o índice
-- `transactions_user_id_ticker_seq_idx` serve exatamente esse acesso.
--
-- ─── TRIGGER SEM `SECURITY DEFINER` (DELIBERADO) ───────────────────────
--
-- `recalculate_position()` roda com os direitos do INVOCADOR. Ela escreve em
-- `positions` do mesmo `user_id` das transações, e as policies da 006 já
-- permitem isso ao dono (a inserção manual da Story 2.2 depende do mesmo
-- grant). `SECURITY DEFINER` só furaria RLS: a função é chamável, então sob
-- DEFINER qualquer usuário passaria o `user_id` de outro e apagaria a posição
-- da vítima. Sob INVOKER a chamada com `user_id` alheio é inerte — não vê
-- transação nenhuma e o DELETE/UPSERT em `positions` é filtrado por RLS.
-- Coberto por asserção em `020_transactions_rls_test.sql`.
--
-- Sem `SET search_path` de propósito: todo objeto é qualificado por schema
-- (`public.`/`auth.`), que é a garantia efetiva, e é o house-style das
-- migrations anteriores.
--
-- ─── DIVERGÊNCIAS DELIBERADAS COM A ARQUITETURA ────────────────────────
--
-- ARCHITECTURE-SPINE.md (L392–413) é a autoridade das colunas. Desvios:
--
--   1. Coluna `seq` a mais, ausente na arquitetura — é o que torna o preço
--      médio determinístico no INSERT em lote (ver acima). Sem ela o schema
--      da arquitetura não sustenta o próprio AR-6.
--   2. FK de `ticker` para `public.assets(ticker)`, ausente na arquitetura,
--      como a 006 fez em `positions`: ticker fora do catálogo não vira
--      transação (SQLSTATE 23503). ON DELETE RESTRICT — ativo delistado não
--      apaga silenciosamente o histórico do usuário.
--   3. Quatro policies por operação em vez de uma `FOR ALL`, e nomes de
--      índice no padrão do repositório (`<tabela>_<colunas>_idx`), não
--      `idx_*`. `FOR ALL` sem `WITH CHECK` explícito é fácil de ler errado.
--   4. `brokerage_fee` e `tax` são `NOT NULL DEFAULT 0` (a arquitetura só
--      põe `DEFAULT 0`). NULL em campo de dinheiro somado é armadilha; a 006
--      endureceu do mesmo jeito os `created_at`/`updated_at`.
--   5. `brokerage_fee` e `tax` são ARMAZENADOS mas NÃO entram no preço médio.
--      É o que os números congelados na spec exigem (compra 100 @ 10 tem
--      preço médio 10,00, não 10,00 + rateio de corretagem). Custo de
--      aquisição com taxas é insumo de imposto/rentabilidade (Épico 4), e
--      incorporá-lo aqui mudaria silenciosamente o AC desta fatia.
--
-- ─── FORA DE ESCOPO, EXPLICITAMENTE ────────────────────────────────────
--
-- `dividend`, `jcp` e `bonus` são gravados mas NÃO movem quantidade nem
-- custo neste recálculo: proventos são do Épico 3, e a matriz desta spec
-- exige que um `dividend` sem nenhuma compra não materialize posição alguma.
-- `bonus` (bonificação em ações) de fato aumentaria a quantidade a custo
-- zero — tratá-lo é trabalho do épico de proventos, junto com split e
-- amortização, que o enum fixado pela arquitetura nem contempla. Do ponto de
-- vista de hoje, nenhuma tela cria transação desses tipos.
--
-- Concorrência multi-escritor no mesmo par `(user_id, ticker)` não é
-- serializada (nenhum `pg_advisory_xact_lock`): sob READ COMMITTED dois
-- writes simultâneos podem se basear em snapshots defasados. Fora do
-- cenário do MVP (um usuário importando o próprio CSV serialmente) e
-- registrado em `deferred-work.md`.

BEGIN;

-- ─────────────────────────────────────────────────────────────────
-- Enum de tipo de transação
-- ─────────────────────────────────────────────────────────────────

-- Os cinco valores fixados pela arquitetura (L392) e pelo AC da importação
-- CSV. Só `buy` e `sell` movem posição; os outros três são histórico de
-- provento, consumido pelo Épico 3.
CREATE TYPE public.transaction_type AS ENUM (
  'buy',       -- compra
  'sell',      -- venda
  'dividend',  -- dividendo
  'jcp',       -- juros sobre capital próprio
  'bonus'      -- bonificação
);

-- ─────────────────────────────────────────────────────────────────
-- transactions — histórico de eventos do usuário
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Ordem de chegada. É a chave de desempate do recálculo: `created_at` é do
  -- statement (empata no lote da importação) e `id` é aleatório.
  -- `GENERATED ALWAYS` proíbe valor explícito no INSERT e no UPDATE, o que
  -- torna a coluna imutável — a ordem gravada não pode ser reescrita.
  seq BIGINT GENERATED ALWAYS AS IDENTITY,
  -- Alvo é `public.users(id)`, que referencia `auth.users(id)` (001): é esse
  -- UUID que `auth.uid()` devolve.
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL REFERENCES public.assets(ticker) ON DELETE RESTRICT,
  type public.transaction_type NOT NULL,
  -- Quantidade em NUMERIC(18, 8): cripto é fracionária. Sempre positiva — o
  -- sinal é o `type`, não a quantidade. Quantidade zero não é evento.
  quantity NUMERIC(18, 8) NOT NULL,
  -- Dinheiro em NUMERIC(18, 4), como `positions` e `price_history`. Preço na
  -- moeda de cotação do ativo (`assets.currency`), não necessariamente BRL:
  -- conversão para BRL é da camada de exibição (Stories 2.3/2.4).
  price NUMERIC(18, 4) NOT NULL,
  brokerage_fee NUMERIC(18, 4) NOT NULL DEFAULT 0,
  tax NUMERIC(18, 4) NOT NULL DEFAULT 0,
  transaction_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT transactions_quantity_positiva      CHECK (quantity > 0),
  CONSTRAINT transactions_price_nao_negativo     CHECK (price >= 0),
  CONSTRAINT transactions_brokerage_fee_nao_negativa CHECK (brokerage_fee >= 0),
  CONSTRAINT transactions_tax_nao_negativo       CHECK (tax >= 0)
  -- Sem `CHECK (transaction_date <= CURRENT_DATE)`, pelo mesmo motivo da 006:
  -- `CURRENT_DATE` é STABLE, não IMMUTABLE, e o Postgres recusa a constraint.
  -- Data no futuro é recusada na validação da importação.
);

-- Consulta dominante: "as transações deste usuário neste ticker" (extrato do
-- ativo, alerta de posição sem transações, recálculo). Nome no padrão do
-- repositório; a arquitetura chamaria `idx_transactions_user_ticker`.
CREATE INDEX transactions_user_id_ticker_idx ON public.transactions(user_id, ticker);

-- Serve o loop do recálculo, que lê um par por vez ordenado por chegada.
-- Medido com EXPLAIN: o plano usa este índice para localizar o par e ainda
-- coloca um `Sort` por (transaction_date, seq) em cima — a chave líder do
-- ORDER BY é a DATA, não `seq`, então o índice não entrega a ordem pronta.
-- Um índice (user_id, ticker, transaction_date, seq) eliminaria esse Sort;
-- fica como está de propósito, porque o par tem no máximo 1000 linhas no MVP
-- (limite da importação) e o ganho não paga um quarto índice na tabela mais
-- escrita do épico. O que este índice garante é que `seq` esteja disponível
-- no próprio índice, sem heap fetch por linha só para desempatar.
CREATE INDEX transactions_user_id_ticker_seq_idx ON public.transactions(user_id, ticker, seq);

-- Extrato cronológico global do usuário (Épico 3/4 lê por período).
CREATE INDEX transactions_transaction_date_idx ON public.transactions(transaction_date DESC);

-- ─────────────────────────────────────────────────────────────────
-- RLS: cada usuário só alcança as próprias linhas
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Transacoes legiveis pelo proprio usuario"
  ON public.transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- WITH CHECK barra gravar transação no nome de outro usuário (42501) — e,
-- por consequência, barra disparar o recálculo da posição de terceiro.
CREATE POLICY "Transacoes inseriveis pelo proprio usuario"
  ON public.transactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Transacoes editaveis pelo proprio usuario"
  ON public.transactions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Transacoes removiveis pelo proprio usuario"
  ON public.transactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────
-- Permissões
-- ─────────────────────────────────────────────────────────────────

-- Os default privileges do schema `public` concedem escrita a `anon` e
-- `authenticated` em toda tabela nova (a 004 só retirou TRUNCATE dos
-- defaults). RLS filtra INSERT/UPDATE/DELETE, mas o grant não deve existir
-- para quem não tem uso legítimo: `anon` não recebe nada, porque toda rota
-- do app é protegida (Story 1.4) e não há transação pré-login.
REVOKE ALL ON public.transactions FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;

-- ─────────────────────────────────────────────────────────────────
-- recalculate_position — reconstrói `positions` a partir de `transactions`
-- ─────────────────────────────────────────────────────────────────

-- Idempotente por construção: não aplica deltas, reconstrói o par inteiro a
-- partir das transações visíveis. Rodar duas vezes dá o mesmo resultado, o
-- que é o que faz o trigger poder disparar por linha num INSERT em lote.
--
-- LANGUAGE plpgsql e SEM `SECURITY DEFINER` — ver cabeçalho.
CREATE OR REPLACE FUNCTION public.recalculate_position(
  p_user_id UUID,
  p_ticker  TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_tx               RECORD;
  -- Mesma precisão da coluna de destino: o que couber aqui cabe lá.
  v_quantity         NUMERIC(18, 8) := 0;
  -- Custo total sem typmod DE PROPÓSITO: quantidade(8 casas) × preço(4 casas)
  -- passa de 4 casas decimais, e arredondar a cada passo acumularia erro no
  -- preço médio. O arredondamento acontece uma única vez, no fim.
  v_cost             NUMERIC := 0;
  v_average_price    NUMERIC(18, 4);
  v_acquisition_date DATE;
BEGIN
  -- ORDER BY (transaction_date, seq): a data é a ordem do investidor, `seq` é
  -- o desempate determinístico dentro do mesmo dia. `created_at` empataria no
  -- lote da importação e `id` é aleatório — ver cabeçalho.
  FOR v_tx IN
    SELECT t.type, t.quantity, t.price
      FROM public.transactions t
     WHERE t.user_id = p_user_id
       AND t.ticker  = p_ticker
     ORDER BY t.transaction_date, t.seq
  LOOP
    IF v_tx.type = 'buy' THEN
      IF v_quantity < 0 THEN
        -- Quantidade líquida negativa significa histórico incompleto (venda
        -- sem a compra correspondente no CSV). A compra primeiro COBRE o
        -- descoberto; só o excedente acima de zero forma custo, senão o
        -- preço médio ficaria inflado por ações que já não existem.
        v_cost := v_cost + GREATEST(v_tx.quantity + v_quantity, 0) * v_tx.price;
      ELSE
        v_cost := v_cost + v_tx.quantity * v_tx.price;
      END IF;

      v_quantity := v_quantity + v_tx.quantity;

    ELSIF v_tx.type = 'sell' THEN
      IF v_quantity > 0 THEN
        -- Baixa a CUSTO MÉDIO: retira do custo exatamente
        -- `preço médio × quantidade vendida`, então o preço médio dos que
        -- restam não muda. `LEAST` cobre a venda maior que a posição.
        v_cost := v_cost - (v_cost / v_quantity) * LEAST(v_tx.quantity, v_quantity);
      END IF;

      -- SEM clamp em zero: a quantidade líquida pode ficar negativa e precisa
      -- ficar. Zerá-la aqui mascararia o excedente e, se uma compra viesse
      -- depois, a posição sairia SUPERESTIMADA (na sequência
      -- venda 50 -> compra 100 -> compra 50, o clamp dá 150 em vez de 100).
      v_quantity := v_quantity - v_tx.quantity;

      IF v_quantity <= 0 THEN
        -- Posição zerada ou descoberta não tem base de custo. Atribuir 0
        -- explicitamente também evita o resíduo da divisão NUMERIC acima.
        v_cost := 0;
      END IF;
    END IF;

    -- `dividend`, `jcp` e `bonus` não movem quantidade nem custo — ver
    -- "FORA DE ESCOPO" no cabeçalho.
  END LOOP;

  IF v_quantity <= 0 THEN
    -- Venda que zera (ou que passa) apaga a posição, em vez de gravar
    -- quantidade zero/negativa: é o que mantém coerente o
    -- `CHECK (quantity > 0)` da 006. Também é o caminho de "todas as
    -- transações do par foram removidas".
    DELETE FROM public.positions
     WHERE user_id = p_user_id
       AND ticker  = p_ticker;

    RETURN;
  END IF;

  -- `positions.acquisition_date` é NOT NULL e o upsert não tem default para
  -- ela: deriva-se de MIN(transaction_date) das COMPRAS. MIN sobre todas as
  -- compras, e não sobre as compras depois do último zeramento — a data de
  -- aquisição não reinicia numa recompra.
  SELECT MIN(t.transaction_date)
    INTO v_acquisition_date
    FROM public.transactions t
   WHERE t.user_id = p_user_id
     AND t.ticker  = p_ticker
     AND t.type    = 'buy';

  IF v_acquisition_date IS NULL THEN
    -- Defensivo: quantidade positiva sem nenhuma compra é impossível hoje
    -- (só `buy` soma quantidade), mas materializar posição sem data de
    -- aquisição violaria a constraint. Sem compra, não há posição por preço.
    DELETE FROM public.positions
     WHERE user_id = p_user_id
       AND ticker  = p_ticker;

    RETURN;
  END IF;

  v_average_price := ROUND(v_cost / v_quantity, 4);

  INSERT INTO public.positions (user_id, ticker, quantity, average_price, acquisition_date)
  VALUES (p_user_id, p_ticker, v_quantity, v_average_price, v_acquisition_date)
  ON CONFLICT (user_id, ticker) DO UPDATE
    SET quantity         = EXCLUDED.quantity,
        average_price    = EXCLUDED.average_price,
        acquisition_date = EXCLUDED.acquisition_date;
  -- `updated_at` fica com o trigger `set_positions_updated_at` da 006.
END $$;

COMMENT ON FUNCTION public.recalculate_position(UUID, TEXT) IS
  'Reconstrói public.positions para (user_id, ticker) a partir de public.transactions: média móvel ponderada com baixa a custo médio, ordenada por (transaction_date, seq). Quantidade líquida <= 0 apaga a posição. Roda com direitos do invocador — RLS é a barreira.';

-- ─────────────────────────────────────────────────────────────────
-- Trigger de recálculo em INSERT / UPDATE / DELETE
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_transaction_recalculation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Um UPDATE pode MUDAR o par: corrigir o ticker de uma linha importada
  -- errada esvazia a posição do ticker antigo e materializa a do novo. Sem
  -- este recálculo do par ANTIGO, a posição de origem ficaria congelada com
  -- um número que nenhuma transação sustenta.
  IF TG_OP = 'UPDATE'
     AND ROW(OLD.user_id, OLD.ticker) IS DISTINCT FROM ROW(NEW.user_id, NEW.ticker) THEN
    PERFORM public.recalculate_position(OLD.user_id, OLD.ticker);
  END IF;

  IF TG_OP = 'DELETE' THEN
    -- Remover transação recalcula: a posição pode voltar a não existir.
    PERFORM public.recalculate_position(OLD.user_id, OLD.ticker);
  ELSE
    PERFORM public.recalculate_position(NEW.user_id, NEW.ticker);
  END IF;

  -- AFTER trigger ignora o retorno, mas `COALESCE(NEW, OLD)` mantém a função
  -- correta se um dia for reusada como BEFORE: no DELETE, NEW é NULL.
  RETURN COALESCE(NEW, OLD);
END $$;

-- AFTER, não BEFORE: o recálculo precisa ler a linha já gravada. FOR EACH ROW
-- porque a linha é o que identifica o par a recalcular. Num INSERT em lote a
-- função roda uma vez por linha sobre o mesmo par — desperdício aceitável, já
-- que ela é idempotente e o lote do MVP tem no máximo 1000 linhas.
DROP TRIGGER IF EXISTS recalculate_position_on_transaction ON public.transactions;
CREATE TRIGGER recalculate_position_on_transaction
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_transaction_recalculation();

COMMIT;

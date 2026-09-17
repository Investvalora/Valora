-- Migration 019: Protege positions contra escrita direta por authenticated
--
-- ─── PROBLEMA ──────────────────────────────────────────────────────────────
--
-- Antes desta migration, o frontend podia inserir/atualizar/deletar linhas em
-- `positions` diretamente (via positionService.addPosition). Isso criava
-- posições sem lançamento correspondente em `transactions`, quebrando a tela
-- de Lançamentos e tornando o histórico irreconstruível.
--
-- ─── SOLUÇÃO ───────────────────────────────────────────────────────────────
--
-- 1. `recalculate_position` passa a SECURITY DEFINER, rodando como `postgres`
--    (dono da função). Assim ela escreve em `positions` mesmo após as policies
--    de INSERT/UPDATE/DELETE serem restritivas para `authenticated`.
--
-- 2. Novas RLS policies bloqueiam INSERT, UPDATE e DELETE diretos em
--    `positions` para `authenticated`. O único caminho de escrita legítimo
--    para usuários é inserir uma transação em `transactions`, que dispara o
--    trigger que chama `recalculate_position` (sob SECURITY DEFINER).
--
-- 3. SELECT permanece inalterado — os usuários continuam lendo as próprias
--    posições via a policy existente da migration 006.
--
-- ─── ROLES AFETADOS ────────────────────────────────────────────────────────
--
-- `postgres` e `service_role`: mantêm escrita irrestrita (não são `authenticated`
-- e não passam por RLS por padrão).
-- `authenticated`: perde INSERT/UPDATE/DELETE direto. Escreve apenas via
-- `transactions` + trigger.
--
-- ─── SEGURANÇA DO SECURITY DEFINER ─────────────────────────────────────────
--
-- A função não expõe dados de outros usuários: ela recebe (user_id, ticker)
-- explicitamente e filtra `WHERE user_id = p_user_id AND ticker = p_ticker`.
-- Ela também é chamada apenas pelo trigger `recalculate_position_on_transaction`,
-- que é AFTER INSERT/UPDATE/DELETE em `transactions` — cujas RLS policies já
-- garantem que `auth.uid() = user_id`. Assim, um usuário autenticado só pode
-- indiretamente acionar o recálculo das próprias posições.

BEGIN;

-- ─── 1. Torna recalculate_position SECURITY DEFINER ────────────────────────
-- Mantém exatamente o mesmo corpo; apenas adiciona SECURITY DEFINER e
-- SET search_path para defesa adicional.

CREATE OR REPLACE FUNCTION public.recalculate_position(
  p_user_id UUID,
  p_ticker  TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_tx               RECORD;
  v_quantity         NUMERIC(18, 8) := 0;
  v_cost             NUMERIC := 0;
  v_average_price    NUMERIC(18, 4);
  v_acquisition_date DATE;
BEGIN
  FOR v_tx IN
    SELECT t.type, t.quantity, t.price
      FROM public.transactions t
     WHERE t.user_id = p_user_id
       AND t.ticker  = p_ticker
     ORDER BY t.transaction_date, t.seq
  LOOP
    IF v_tx.type = 'buy' THEN
      IF v_quantity < 0 THEN
        v_cost := v_cost + GREATEST(v_tx.quantity + v_quantity, 0) * v_tx.price;
      ELSE
        v_cost := v_cost + v_tx.quantity * v_tx.price;
      END IF;
      v_quantity := v_quantity + v_tx.quantity;

    ELSIF v_tx.type = 'sell' THEN
      IF v_quantity > 0 THEN
        v_cost := v_cost - (v_cost / v_quantity) * LEAST(v_tx.quantity, v_quantity);
      END IF;
      v_quantity := v_quantity - v_tx.quantity;
      IF v_quantity <= 0 THEN
        v_cost := 0;
      END IF;
    END IF;
  END LOOP;

  IF v_quantity <= 0 THEN
    DELETE FROM public.positions
     WHERE user_id = p_user_id
       AND ticker  = p_ticker;
    RETURN;
  END IF;

  SELECT MIN(t.transaction_date)
    INTO v_acquisition_date
    FROM public.transactions t
   WHERE t.user_id = p_user_id
     AND t.ticker  = p_ticker
     AND t.type    = 'buy';

  IF v_acquisition_date IS NULL THEN
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
END $$;

COMMENT ON FUNCTION public.recalculate_position(UUID, TEXT) IS
  'Reconstrói public.positions para (user_id, ticker) a partir de public.transactions. SECURITY DEFINER: roda como postgres para poder escrever em positions mesmo com RLS restritivo para authenticated. Chamada apenas pelo trigger recalculate_position_on_transaction.';

-- ─── 2. Revoga escrita direta de authenticated em positions ─────────────────

REVOKE INSERT, UPDATE, DELETE ON public.positions FROM authenticated;

-- Mantém SELECT (usuários ainda precisam ler as próprias posições)
-- GRANT SELECT já existe da migration 006 — não precisa repetir.

-- Garante que postgres e service_role mantêm acesso total (idempotente)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.positions TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.positions TO service_role;

COMMIT;

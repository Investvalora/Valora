-- Carteiras independentes por usuário. Os registros anteriores passam a
-- pertencer à carteira padrão, sem alterar quantidades ou histórico.
BEGIN;

CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 60),
  color TEXT NOT NULL DEFAULT 'gold'
    CHECK (color IN ('gold', 'green', 'blue', 'gray')),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, user_id)
);

CREATE UNIQUE INDEX wallets_one_default_per_user_idx
  ON public.wallets (user_id) WHERE is_default;

CREATE INDEX wallets_user_id_created_at_idx
  ON public.wallets (user_id, created_at);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário lê as próprias carteiras"
  ON public.wallets FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Usuário cria as próprias carteiras"
  ON public.wallets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND NOT is_default);

CREATE POLICY "Usuário atualiza as próprias carteiras"
  ON public.wallets FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

REVOKE ALL ON public.wallets FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE (name, color) ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;

-- O perfil é criado pelo trigger da migration 002. Criar a carteira aqui
-- garante que um usuário novo sempre tenha uma carteira utilizável.
CREATE FUNCTION public.create_default_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallets (user_id, name, is_default)
  VALUES (NEW.id, 'Minha Carteira', true);
  RETURN NEW;
END $$;

CREATE TRIGGER create_default_wallet_on_user
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.create_default_wallet();

REVOKE ALL ON FUNCTION public.create_default_wallet()
  FROM PUBLIC, anon, authenticated;

INSERT INTO public.wallets (user_id, name, is_default)
SELECT u.id, 'Minha Carteira', true
FROM public.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.wallets w WHERE w.user_id = u.id
);

ALTER TABLE public.transactions ADD COLUMN wallet_id UUID;
ALTER TABLE public.positions ADD COLUMN wallet_id UUID;
ALTER TABLE public.fixed_income_positions ADD COLUMN wallet_id UUID;

-- O UPDATE de backfill não pode disparar o recálculo antigo, que ainda
-- conhece apenas (user_id, ticker) e apagaria posições manuais sem transação.
ALTER TABLE public.transactions
  DISABLE TRIGGER recalculate_position_on_transaction;

UPDATE public.transactions t
SET wallet_id = w.id
FROM public.wallets w
WHERE w.user_id = t.user_id AND w.is_default;

UPDATE public.positions p
SET wallet_id = w.id
FROM public.wallets w
WHERE w.user_id = p.user_id AND w.is_default;

UPDATE public.fixed_income_positions f
SET wallet_id = w.id
FROM public.wallets w
WHERE w.user_id = f.user_id AND w.is_default;

ALTER TABLE public.transactions
  ENABLE TRIGGER recalculate_position_on_transaction;

-- Compatibilidade com escritas antigas: quando a aplicação não especifica
-- carteira, a linha é atribuída à carteira padrão do próprio usuário.
CREATE FUNCTION public.assign_default_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.wallet_id IS NULL THEN
    SELECT id INTO NEW.wallet_id
    FROM public.wallets
    WHERE user_id = NEW.user_id AND is_default;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER assign_transaction_wallet
  BEFORE INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.assign_default_wallet();

CREATE TRIGGER assign_fixed_income_wallet
  BEFORE INSERT ON public.fixed_income_positions
  FOR EACH ROW EXECUTE FUNCTION public.assign_default_wallet();

ALTER TABLE public.transactions ALTER COLUMN wallet_id SET NOT NULL;
ALTER TABLE public.positions ALTER COLUMN wallet_id SET NOT NULL;
ALTER TABLE public.fixed_income_positions ALTER COLUMN wallet_id SET NOT NULL;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_wallet_owner_fk
  FOREIGN KEY (wallet_id, user_id) REFERENCES public.wallets(id, user_id);

ALTER TABLE public.positions
  ADD CONSTRAINT positions_wallet_owner_fk
  FOREIGN KEY (wallet_id, user_id) REFERENCES public.wallets(id, user_id);

ALTER TABLE public.fixed_income_positions
  ADD CONSTRAINT fixed_income_wallet_owner_fk
  FOREIGN KEY (wallet_id, user_id) REFERENCES public.wallets(id, user_id);

DROP INDEX public.positions_user_id_ticker_idx;
CREATE UNIQUE INDEX positions_wallet_ticker_idx
  ON public.positions (wallet_id, ticker);

CREATE INDEX transactions_wallet_ticker_date_idx
  ON public.transactions (wallet_id, ticker, transaction_date, seq);

CREATE INDEX fixed_income_wallet_idx
  ON public.fixed_income_positions (wallet_id) WHERE active;

-- A posição é reconstruída apenas com as transações da mesma carteira.
CREATE FUNCTION public.recalculate_wallet_position(
  p_user_id UUID,
  p_wallet_id UUID,
  p_ticker TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_tx RECORD;
  v_quantity NUMERIC(18, 8) := 0;
  v_cost NUMERIC := 0;
  v_acquisition_date DATE;
BEGIN
  FOR v_tx IN
    SELECT type, quantity, price
    FROM public.transactions
    WHERE user_id = p_user_id
      AND wallet_id = p_wallet_id
      AND ticker = p_ticker
    ORDER BY transaction_date, seq
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
      AND wallet_id = p_wallet_id
      AND ticker = p_ticker;
    RETURN;
  END IF;

  SELECT min(transaction_date)
  INTO v_acquisition_date
  FROM public.transactions
  WHERE user_id = p_user_id
    AND wallet_id = p_wallet_id
    AND ticker = p_ticker
    AND type = 'buy';

  INSERT INTO public.positions (
    user_id, wallet_id, ticker, quantity, average_price, acquisition_date
  )
  VALUES (
    p_user_id,
    p_wallet_id,
    p_ticker,
    v_quantity,
    round(v_cost / v_quantity, 4),
    v_acquisition_date
  )
  ON CONFLICT (wallet_id, ticker) DO UPDATE
  SET quantity = EXCLUDED.quantity,
      average_price = EXCLUDED.average_price,
      acquisition_date = EXCLUDED.acquisition_date;
END $$;

REVOKE ALL ON FUNCTION public.recalculate_wallet_position(UUID, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_transaction_recalculation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND ROW(OLD.user_id, OLD.wallet_id, OLD.ticker)
       IS DISTINCT FROM ROW(NEW.user_id, NEW.wallet_id, NEW.ticker) THEN
    PERFORM public.recalculate_wallet_position(
      OLD.user_id, OLD.wallet_id, OLD.ticker
    );
  END IF;

  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_wallet_position(
      OLD.user_id, OLD.wallet_id, OLD.ticker
    );
  ELSE
    PERFORM public.recalculate_wallet_position(
      NEW.user_id, NEW.wallet_id, NEW.ticker
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END $$;

REVOKE ALL ON FUNCTION public.handle_transaction_recalculation()
  FROM PUBLIC, anon, authenticated;

-- A função antiga aceitava apenas usuário e ticker, podendo combinar
-- transações de carteiras distintas. Nenhum cliente precisa invocá-la.
DROP FUNCTION public.recalculate_position(UUID, TEXT);

COMMIT;

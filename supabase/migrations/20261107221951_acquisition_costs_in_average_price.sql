-- Acquisition cost includes purchase expenses in the asset currency.
-- Sale expenses affect realized proceeds, not remaining unit cost.
CREATE OR REPLACE FUNCTION public.recalculate_wallet_position(
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
    SELECT type, quantity, price, brokerage_fee, tax
    FROM public.transactions
    WHERE user_id = p_user_id
      AND wallet_id = p_wallet_id
      AND ticker = p_ticker
    ORDER BY transaction_date, seq
  LOOP
    IF v_tx.type = 'buy' THEN
      IF v_quantity < 0 THEN
        v_cost := v_cost + GREATEST(v_tx.quantity + v_quantity, 0) * (v_tx.price + (v_tx.brokerage_fee + v_tx.tax) / v_tx.quantity);
      ELSE
        v_cost := v_cost + v_tx.quantity * v_tx.price + v_tx.brokerage_fee + v_tx.tax;
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


-- Rebuild existing derived positions only. Journals and opening positions remain intact.
DO $rebuild$
DECLARE target record;
BEGIN
 FOR target IN
  SELECT DISTINCT t.user_id,t.wallet_id,t.ticker
  FROM public.transactions t JOIN public.positions p
   ON p.user_id=t.user_id AND p.wallet_id=t.wallet_id AND p.ticker=t.ticker
  WHERE t.type='buy' AND t.brokerage_fee+t.tax>0
 LOOP
  PERFORM public.recalculate_wallet_position(target.user_id,target.wallet_id,target.ticker);
 END LOOP;
END $rebuild$;

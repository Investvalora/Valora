-- Serialize journal mutations with edits/deletion of the same wallet.
CREATE FUNCTION public.lock_transaction_wallet() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF TG_OP='UPDATE' AND ROW(NEW.id,NEW.user_id,NEW.wallet_id,NEW.ticker,NEW.seq)
      IS DISTINCT FROM ROW(OLD.id,OLD.user_id,OLD.wallet_id,OLD.ticker,OLD.seq) THEN
    RAISE EXCEPTION 'Transaction identity cannot change' USING ERRCODE='22023';
  END IF;
  PERFORM 1 FROM public.wallets
  WHERE id=COALESCE(NEW.wallet_id,OLD.wallet_id) AND user_id=COALESCE(NEW.user_id,OLD.user_id) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet unavailable' USING ERRCODE='42501'; END IF;
  RETURN COALESCE(NEW,OLD);
END $$;
REVOKE ALL ON FUNCTION public.lock_transaction_wallet() FROM PUBLIC,anon,authenticated;
-- Runs after default-wallet assignment, before journal recalculation.
CREATE TRIGGER lock_transaction_wallet BEFORE INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.lock_transaction_wallet();

CREATE FUNCTION public.validate_edited_transaction_history() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF OLD.type NOT IN ('buy','sell') OR NEW.type NOT IN ('buy','sell') THEN
    RAISE EXCEPTION 'Only purchases and sales may be edited' USING ERRCODE='22023';
  END IF;
  IF NEW.quantity::text='NaN' OR NEW.price::text='NaN'
    OR NEW.brokerage_fee::text='NaN' OR NEW.tax::text='NaN' THEN
    RAISE EXCEPTION 'Invalid numeric value' USING ERRCODE='22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM (
      SELECT sum(CASE WHEN type='buy' THEN quantity ELSE -quantity END)
        OVER(ORDER BY transaction_date,seq ROWS UNBOUNDED PRECEDING) AS balance
      FROM public.transactions WHERE user_id=NEW.user_id AND wallet_id=NEW.wallet_id
        AND ticker=NEW.ticker AND type IN ('buy','sell')
    ) history WHERE balance<0
  ) THEN
    RAISE EXCEPTION 'Edit would leave a sale without sufficient historical balance' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.validate_edited_transaction_history() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER validate_edited_transaction_history AFTER UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.validate_edited_transaction_history();

CREATE FUNCTION public.edit_owned_transaction(
  p_id uuid,p_expected jsonb,p_type text,p_date date,p_quantity numeric,p_price numeric,p_brokerage_fee numeric,p_tax numeric
) RETURNS public.transactions LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_row public.transactions;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  IF p_quantity<>round(p_quantity,8) OR p_price<>round(p_price,4)
    OR p_brokerage_fee<>round(p_brokerage_fee,4) OR p_tax<>round(p_tax,4) THEN
    RAISE EXCEPTION 'Values exceed journal precision' USING ERRCODE='22023';
  END IF;
  -- Optimistic comparison is checked by UPDATE after any concurrent writer.
  UPDATE public.transactions t SET type=p_type::public.transaction_type,transaction_date=p_date,
    quantity=p_quantity,price=p_price,brokerage_fee=p_brokerage_fee,tax=p_tax
  WHERE t.id=p_id AND t.user_id=auth.uid()
    AND jsonb_build_object('type',t.type,'transaction_date',t.transaction_date,
      'quantity',t.quantity,'price',t.price,'brokerage_fee',t.brokerage_fee,'tax',t.tax)=p_expected
  RETURNING t.* INTO v_row;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction changed or unavailable; reload before editing' USING ERRCODE='40001';
  END IF;
  RETURN v_row;
END $$;
REVOKE ALL ON FUNCTION public.edit_owned_transaction(uuid,jsonb,text,date,numeric,numeric,numeric,numeric) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.edit_owned_transaction(uuid,jsonb,text,date,numeric,numeric,numeric,numeric) TO authenticated;

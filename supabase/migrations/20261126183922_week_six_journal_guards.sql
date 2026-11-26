-- Historical journal integrity, including backdated inserts/imports and deletions.
-- Existing wallet lock serializes journal changes; defer validation until the
-- whole batch has arrived so CSV row order does not change the result.
CREATE FUNCTION public.validate_complete_transaction_history() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE owner_id uuid := COALESCE(NEW.user_id, OLD.user_id);
 wallet uuid := COALESCE(NEW.wallet_id, OLD.wallet_id);
 symbol text := COALESCE(NEW.ticker, OLD.ticker);
BEGIN
 IF EXISTS (
  SELECT 1 FROM (
   SELECT sum(CASE WHEN type='buy' THEN quantity ELSE -quantity END)
    OVER (ORDER BY transaction_date,seq ROWS UNBOUNDED PRECEDING) AS balance
   FROM public.transactions WHERE user_id=owner_id AND wallet_id=wallet
    AND ticker=symbol AND type IN ('buy','sell')
  ) journal WHERE balance<0
 ) THEN RAISE EXCEPTION 'Saldo histórico insuficiente: a venda exige uma compra anterior na mesma carteira.' USING ERRCODE='23514'; END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.validate_complete_transaction_history() FROM PUBLIC,anon,authenticated;
CREATE CONSTRAINT TRIGGER complete_transaction_history
AFTER INSERT OR DELETE ON public.transactions DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.validate_complete_transaction_history();

-- Preserve existing records; validate only new/renamed wallets, per owner.
CREATE FUNCTION public.validate_wallet_name() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE normalized text := lower(regexp_replace(btrim(NEW.name),'[[:space:]]+',' ','g'));
BEGIN
 IF TG_OP='UPDATE' AND NEW.name IS NOT DISTINCT FROM OLD.name THEN RETURN NEW; END IF;
 IF char_length(btrim(NEW.name)) NOT BETWEEN 1 AND 60 OR NEW.name ~ '[[:cntrl:]]' OR NEW.name !~ '[[:alnum:]]' THEN
  RAISE EXCEPTION 'Use de 1 a 60 caracteres e inclua letras ou números no nome da carteira.' USING ERRCODE='23514';
 END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(NEW.user_id::text,0));
 IF EXISTS (SELECT 1 FROM public.wallets w WHERE w.user_id=NEW.user_id AND w.id IS DISTINCT FROM NEW.id
  AND lower(regexp_replace(btrim(w.name),'[[:space:]]+',' ','g'))=normalized) THEN
  RAISE EXCEPTION 'Já existe uma carteira com esse nome. Escolha outro nome.' USING ERRCODE='23505';
 END IF;
 NEW.name:=btrim(NEW.name);
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.validate_wallet_name() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER validate_wallet_name BEFORE INSERT OR UPDATE OF name ON public.wallets
FOR EACH ROW EXECUTE FUNCTION public.validate_wallet_name();

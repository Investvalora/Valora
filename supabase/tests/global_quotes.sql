BEGIN;
INSERT INTO public.assets(ticker,name,type,currency,quote_provider,provider_symbol) VALUES('ZZGLOB','Global fixture','stock_us','USD','finnhub','ZZGLOB');
SET LOCAL ROLE service_role;
DO $$ DECLARE d date:=(now() AT TIME ZONE 'UTC')::date-1; BEGIN
PERFORM public.store_global_quote(jsonb_build_object('ticker','ZZGLOB','source','finnhub','date',d,'close',10,'open',9,'high',11,'low',8,'volume',100,'market_time',d+time '15:00'));
IF (SELECT open FROM public.price_history WHERE ticker='ZZGLOB')<>9 THEN RAISE EXCEPTION 'OHLC lost'; END IF;
IF public.store_global_quote(jsonb_build_object('ticker','ZZGLOB','source','finnhub','date',d,'close',8,'market_time',d+time '14:00')) THEN RAISE EXCEPTION 'stale overwrite'; END IF;
IF NOT public.store_global_quote(jsonb_build_object('ticker','ZZGLOB','source','finnhub','date',d,'close',11,'market_time',d+time '16:00')) THEN RAISE EXCEPTION 'newer rejected'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
IF has_function_privilege('authenticated','public.store_global_quote(jsonb)','execute') OR has_function_privilege('anon','public.store_global_quote(jsonb)','execute') THEN RAISE EXCEPTION 'client grant'; END IF;
END $$;
ROLLBACK;
SELECT 'PASS global quotes; rolled back' result;

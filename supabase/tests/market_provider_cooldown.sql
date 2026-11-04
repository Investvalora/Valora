BEGIN;
INSERT INTO public.assets(ticker,name,type,currency,quote_provider,provider_symbol) VALUES('ZZFALL11','Quote fixture','fii','BRL','brapi','ZZFALL11');
SET LOCAL ROLE service_role;
INSERT INTO public.market_provider_state(provider,blocked_until,reason) VALUES('brapi:'||repeat('a',64),now()+interval '1 hour','test');
DO $$ DECLARE d date:=(now() AT TIME ZONE 'UTC')::date-1; BEGIN
 IF NOT public.store_market_quote('ZZFALL11',d,10,'yahoo',d+time '15:00') THEN RAISE EXCEPTION 'FAIL insert'; END IF;
 IF public.store_market_quote('ZZFALL11',d,8,'brapi',d+time '14:00') THEN RAISE EXCEPTION 'FAIL stale overwrite'; END IF;
 IF NOT public.store_market_quote('ZZFALL11',d,11,'brapi',d+time '16:00') THEN RAISE EXCEPTION 'FAIL fresher same-day'; END IF;
 IF public.store_market_quote('ZZFALL11',d-1,5,'yahoo',(d-1)+time '17:00') THEN RAISE EXCEPTION 'FAIL older date'; END IF;
 UPDATE public.price_history SET source='b3_cotahist' WHERE ticker='ZZFALL11';
 IF public.store_market_quote('ZZFALL11',d,12,'yahoo',d+time '17:00') THEN RAISE EXCEPTION 'FAIL official overwrite'; END IF;
 IF (SELECT close FROM public.price_history WHERE ticker='ZZFALL11')<>11 THEN RAISE EXCEPTION 'FAIL changed value'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF has_table_privilege('authenticated','public.market_provider_state','select') OR has_table_privilege('anon','public.market_provider_state','select') THEN RAISE EXCEPTION 'FAIL client cooldown access'; END IF;
 IF has_function_privilege('authenticated','public.store_market_quote(text,date,numeric,text,timestamptz)','execute') OR has_function_privilege('anon','public.store_market_quote(text,date,numeric,text,timestamptz)','execute') THEN RAISE EXCEPTION 'FAIL client ingestion privilege'; END IF;
END $$;
ROLLBACK;
SELECT 'PASS quote chronology, official preservation, provider state and client privilege isolation; rolled back' AS result;

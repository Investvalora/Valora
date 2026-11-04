-- Provider timestamps and separate schedules; credentials remain in Vault.
CREATE FUNCTION public.store_global_quote(p_quote jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
 t text:=p_quote->>'ticker';
 s text:=p_quote->>'source';
 stamp timestamptz:=(p_quote->>'market_time')::timestamptz;
 d date:=(p_quote->>'date')::date;
 price numeric:=(p_quote->>'close')::numeric;
 latest public.price_history;
BEGIN
 IF t IS NULL OR s IS NULL OR s NOT IN ('finnhub','coingecko','awesomeapi') OR stamp IS NULL OR d IS NULL
 OR price IS NULL OR price<=0 OR price::text IN ('NaN','Infinity','-Infinity')
 OR (stamp AT TIME ZONE 'UTC')::date<>d OR stamp>now()+interval '5 minutes' THEN
 RAISE EXCEPTION 'Invalid global quote' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(t,0));
 SELECT * INTO latest FROM public.price_history WHERE ticker=t ORDER BY date DESC LIMIT 1;
 IF FOUND AND (latest.date>d OR (latest.date=d AND latest.source='b3_cotahist')) THEN RETURN false; END IF;
 INSERT INTO public.price_history(ticker,date,close,source,market_time)
 VALUES(t,d,price,s,stamp)
 ON CONFLICT(ticker,date) DO UPDATE SET close=excluded.close,source=excluded.source,market_time=excluded.market_time
 WHERE price_history.source<>'b3_cotahist' AND
 (price_history.market_time IS NULL OR price_history.market_time<excluded.market_time);
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.store_global_quote(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.store_global_quote(jsonb) TO service_role;

DO $migration$
DECLARE job record;
BEGIN
 FOR job IN SELECT jobid FROM cron.job WHERE jobname LIKE 'sync-global-assets-%'
 OR jobname IN ('sync-crypto-continuous','sync-macro-rates-diario','sync-macro-rates-retry','recalculate-fixed-income-daily') LOOP
 PERFORM cron.unschedule(job.jobid);
 END LOOP;
END $migration$;
-- Broad UTC window covers US daylight-saving changes; provider date is preserved on holidays.
SELECT cron.schedule('sync-global-assets-market','*/5 13-21 * * 1-5',$job$
 SELECT net.http_post(
 url:=(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='project_url' LIMIT 1)||'/functions/v1/sync-global-assets',
 headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='service_role_key' LIMIT 1)),
 body:='{"providers":["finnhub","awesomeapi"]}'::jsonb,timeout_milliseconds:=120000);
$job$);
-- One batch per ten minutes, all days, with no duplicate crypto call in the market job.
SELECT cron.schedule('sync-crypto-continuous','*/10 * * * *',$job$
 SELECT net.http_post(
 url:=(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='project_url' LIMIT 1)||'/functions/v1/sync-global-assets',
 headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='service_role_key' LIMIT 1)),
 body:='{"providers":["coingecko"]}'::jsonb,timeout_milliseconds:=120000);
$job$);
-- Recalculate only after successful rate ingestion, with a second pass for late releases.
SELECT cron.schedule('sync-macro-rates-diario','0 20 * * 1-5',$job$
 SELECT net.http_post(
 url:=(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='project_url' LIMIT 1)||'/functions/v1/sync-macro-rates',
 headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='service_role_key' LIMIT 1)),
 body:='{"recalculate":true}'::jsonb,timeout_milliseconds:=180000);
$job$);
SELECT cron.schedule('sync-macro-rates-retry','0 23 * * 1-5',$job$
 SELECT net.http_post(
 url:=(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='project_url' LIMIT 1)||'/functions/v1/sync-macro-rates',
 headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='service_role_key' LIMIT 1)),
 body:='{"recalculate":true}'::jsonb,timeout_milliseconds:=180000);
$job$);

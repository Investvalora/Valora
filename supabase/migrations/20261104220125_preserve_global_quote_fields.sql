CREATE OR REPLACE FUNCTION public.store_global_quote(p_quote jsonb)
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
 INSERT INTO public.price_history(ticker,date,close,source,market_time,open,high,low,adjusted_close,volume)
 VALUES(t,d,price,s,stamp,coalesce((p_quote->>'open')::numeric,price),coalesce((p_quote->>'high')::numeric,price),coalesce((p_quote->>'low')::numeric,price),price,(p_quote->>'volume')::numeric)
 ON CONFLICT(ticker,date) DO UPDATE SET close=excluded.close,source=excluded.source,market_time=excluded.market_time,open=excluded.open,high=excluded.high,low=excluded.low,adjusted_close=excluded.adjusted_close,volume=excluded.volume
 WHERE price_history.source<>'b3_cotahist' AND
 (price_history.market_time IS NULL OR price_history.market_time<excluded.market_time);
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.store_global_quote(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.store_global_quote(jsonb) TO service_role;

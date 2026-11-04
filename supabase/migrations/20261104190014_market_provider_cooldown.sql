CREATE TABLE public.market_provider_state (
  provider text PRIMARY KEY CHECK (provider ~ '^brapi:[0-9a-f]{64}$'),
  blocked_until timestamptz NOT NULL,
  reason text NOT NULL
);
ALTER TABLE public.market_provider_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.market_provider_state FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.market_provider_state TO service_role;

ALTER TABLE public.price_history ADD COLUMN market_time timestamptz;
CREATE FUNCTION public.store_market_quote(p_ticker text,p_date date,p_close numeric,p_source text,p_market_time timestamptz)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE latest public.price_history;
BEGIN
  IF p_ticker IS NULL OR p_date IS NULL OR p_close IS NULL OR p_market_time IS NULL
    OR p_close<=0 OR p_close::text IN ('NaN','Infinity','-Infinity')
    OR p_source IS NULL OR p_source NOT IN ('brapi','yahoo')
    OR (p_market_time AT TIME ZONE 'UTC')::date<>p_date
    OR p_market_time>now()+interval '5 minutes' THEN
    RAISE EXCEPTION 'Invalid market quote' USING ERRCODE='22023';
  END IF;
  -- Serialize this ingestion path per ticker, including simultaneous jobs.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_ticker,0));
  SELECT * INTO latest FROM public.price_history WHERE ticker=p_ticker ORDER BY date DESC LIMIT 1;
  IF FOUND AND (latest.date>p_date OR (latest.date=p_date AND latest.source='b3_cotahist')) THEN RETURN false; END IF;
  INSERT INTO public.price_history(ticker,date,close,source,market_time)
  VALUES(p_ticker,p_date,p_close,p_source,p_market_time)
  ON CONFLICT(ticker,date) DO UPDATE SET close=EXCLUDED.close,source=EXCLUDED.source,market_time=EXCLUDED.market_time
  WHERE price_history.source<>'b3_cotahist'
    AND COALESCE(price_history.market_time,price_history.updated_at)<EXCLUDED.market_time;
  RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.store_market_quote(text,date,numeric,text,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.store_market_quote(text,date,numeric,text,timestamptz) TO service_role;

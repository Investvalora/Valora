-- Run only after the complete migration chain on an empty local Supabase.
DO $test$
BEGIN
  IF NOT ('etf_br' = ANY(enum_range(NULL::public.asset_type)::text[]))
     OR NOT ('etf_us' = ANY(enum_range(NULL::public.asset_type)::text[])) THEN
    RAISE EXCEPTION 'ETF catalog types missing after migration replay';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname='sync-yahoo-fundamentals-diario') THEN
    RAISE EXCEPTION 'Yahoo fundamentals schedule missing';
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='sync-bolsai-fundamentals-diario' AND active) THEN
    RAISE EXCEPTION 'Superseded Bolsai schedule remains active';
  END IF;
END
$test$;

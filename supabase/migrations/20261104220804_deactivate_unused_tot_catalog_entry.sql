-- Quarantine the unused legacy catalog entry; never rename it to TOTS3 or delete history.
UPDATE public.assets a SET active=false
WHERE a.ticker='TOT' AND a.name='Lionshares U.S. Equity Total Return ETF'
 AND a.type='etf_us' AND a.currency='USD' AND a.provider_symbol='TOT'
 AND NOT EXISTS(SELECT 1 FROM public.positions p WHERE p.ticker=a.ticker)
 AND NOT EXISTS(SELECT 1 FROM public.transactions t WHERE t.ticker=a.ticker)
 AND NOT EXISTS(SELECT 1 FROM public.alerts t WHERE t.ticker=a.ticker)
 AND NOT EXISTS(SELECT 1 FROM public.insights t WHERE t.ticker=a.ticker)
 AND NOT EXISTS(SELECT 1 FROM public.asset_favorites t WHERE t.ticker=a.ticker)
 AND NOT EXISTS(SELECT 1 FROM public.wallet_income t WHERE t.ticker=a.ticker);

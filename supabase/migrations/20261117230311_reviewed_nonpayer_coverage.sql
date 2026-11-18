-- TIC common shares: the reviewed 10-K states no cash dividends are anticipated.
-- Preferred-share dividends paid in common stock are not common cash dividends.
-- Fixed review timestamps prevent a replay from silently renewing this evidence.
insert into public.issuer_dividend_policies(ticker,policy,source_url,observed_at,valid_until)
select ticker,'no_cash_dividends',
 'https://www.sec.gov/Archives/edgar/data/2032966/000162828026017015/tic-20251231.htm',
 '2026-11-17T23:03:00Z'::timestamptz,'2026-12-17T23:03:00Z'::timestamptz
from public.assets where ticker='TIC' and type='stock_us' and currency='USD'
on conflict do nothing;

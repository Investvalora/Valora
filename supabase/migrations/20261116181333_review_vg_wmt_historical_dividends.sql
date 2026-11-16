-- Exact primary facts; ex dates must still be independently observed.
insert into public.cash_issuer_reviews(ticker,ex_date,declaration_date,record_date,payment_date,value_per_share,source_url,ex_source_url,review_note) values
('VG','2025-12-15','2025-12-01','2025-12-15','2025-12-31',0.017,'https://ventureglobal.com/2025/12/01/venture-global-inc-announces-record-date-for-cash-dividend-3/','https://www.alphavantage.co/documentation/#dividends','Issuer confirms exact USD amount and calendar; both vendors independently observe ex. Marketstack rounds to cents.'),
('VG','2026-03-16','2026-03-03','2026-03-16','2026-03-31',0.018,'https://investors.ventureglobal.com/news/news-details/2026/Venture-Global-Inc--Announces-Record-Date-for-Cash-Dividend/default.aspx','https://www.alphavantage.co/documentation/#dividends','Issuer confirms exact USD amount and calendar; both vendors independently observe ex. Marketstack rounds to cents.'),
('WMT','2025-12-12','2025-02-20','2025-12-12','2026-01-05',0.235,'https://corporate.walmart.com/content/corporate/en_us/news/2025/02/20/walmart-raises-annual-dividend-13-percent-to-0-94-per-share-marking-52nd-consecutive-year-of-dividen-increases.html','https://www.alphavantage.co/documentation/#dividends','Historical fourth installment declared in 2025. Separate from the four installments declared in 2026. Marketstack rounds to cents.');

do $$ declare reviewed record;begin
 for reviewed in select ticker,ex_date from public.cash_issuer_reviews
  where ticker='VG' and ex_date in('2025-12-15','2026-03-16') or ticker='WMT' and ex_date='2025-12-12'
 loop perform public.apply_cash_issuer_review(reviewed.ticker,reviewed.ex_date);end loop;
end $$;

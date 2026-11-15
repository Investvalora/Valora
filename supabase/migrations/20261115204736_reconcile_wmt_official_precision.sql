-- Walmart official amount/date review; preserve every prior row and vendor snapshot.
insert into public.cash_issuer_reviews(ticker,ex_date,declaration_date,record_date,payment_date,value_per_share,source_url,ex_source_url,review_note) values
('WMT','2026-03-20','2026-02-19','2026-03-20','2026-04-06',0.2475,'https://corporate.walmart.com/news/2026/02/19/walmart-raises-annual-dividend-to-0-99-per-share-marking-53rd-consecutive-year-of-dividend-increases','https://www.alphavantage.co/documentation/#dividends','Official four quarterly installments; ex independently observed by Alpha/Nasdaq. Only legacy Yahoo rounding 0.248 is eligible for repair.'),
('WMT','2026-05-08','2026-02-19','2026-05-08','2026-05-26',0.2475,'https://corporate.walmart.com/news/2026/02/19/walmart-raises-annual-dividend-to-0-99-per-share-marking-53rd-consecutive-year-of-dividend-increases','https://www.alphavantage.co/documentation/#dividends','Official four quarterly installments; ex independently observed by Alpha/Nasdaq. Only legacy Yahoo rounding 0.248 is eligible for repair.'),
('WMT','2026-08-21','2026-02-19','2026-08-21','2026-09-08',0.2475,'https://corporate.walmart.com/news/2026/02/19/walmart-raises-annual-dividend-to-0-99-per-share-marking-53rd-consecutive-year-of-dividend-increases','https://www.alphavantage.co/documentation/#dividends','Official four quarterly installments; ex independently observed by Alpha/Nasdaq. Only legacy Yahoo rounding 0.248 is eligible for repair.'),
('WMT','2026-12-11','2026-02-19','2026-12-11','2027-01-04',0.2475,'https://corporate.walmart.com/news/2026/02/19/walmart-raises-annual-dividend-to-0-99-per-share-marking-53rd-consecutive-year-of-dividend-increases','https://www.alphavantage.co/documentation/#dividends','Official four quarterly installments; ex independently observed by Alpha/Nasdaq. Only legacy Yahoo rounding 0.248 is eligible for repair.');

create or replace function public.apply_cash_issuer_review(p_ticker text,p_ex date) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare r public.cash_issuer_reviews;old public.dividends;prior public.issuer_dividend_reconciliations;n integer;
begin
 select * into r from public.cash_issuer_reviews where ticker=p_ticker and ex_date=p_ex;
 if not found then raise exception 'Unreviewed issuer event';end if;
 if not exists(select 1 from public.assets where ticker=p_ticker and active and type='stock_us' and currency='USD') then return jsonb_build_object('saved',0,'waiting','asset');end if;
 -- Independent date evidence must agree on ex/record/payment/amount. A
 -- declaration-only discrepancy is retained in its original vendor snapshot.
 if not exists(select 1 from public.supplemental_dividend_observations o where o.ticker=p_ticker and o.ex_date=p_ex and o.record_date=r.record_date and o.payment_date=r.payment_date and o.value_per_share=r.value_per_share and o.currency='USD' and o.distribution='recurring')
 and not exists(select 1 from public.dividend_provider_events o where o.ticker=p_ticker and o.ex_date=p_ex and o.record_date=r.record_date and o.payment_date=r.payment_date and o.value_per_share=r.value_per_share)
 then return jsonb_build_object('saved',0,'waiting','independent_ex');end if;
 if exists(select 1 from public.supplemental_dividend_observations o where o.ticker=p_ticker and o.payment_date=r.payment_date and o.value_per_share=r.value_per_share and o.currency='USD' and o.distribution='recurring' and o.ex_date<>p_ex)
 or exists(select 1 from public.dividend_provider_events o where o.ticker=p_ticker and o.payment_date=r.payment_date and o.value_per_share=r.value_per_share and o.ex_date<>p_ex) then raise exception 'Conflicting independent ex';end if;
 perform pg_advisory_xact_lock(hashtextextended('dividend-provider-ticker:'||p_ticker,0));
 select * into prior from public.issuer_dividend_reconciliations where ticker=p_ticker and ex_date=p_ex;
 if found and (prior.declaration_date<>r.declaration_date or prior.record_date<>r.record_date or prior.payment_date<>r.payment_date or prior.value_per_share<>r.value_per_share) then raise exception 'Conflicting prior issuer review';end if;
 select * into old from public.dividends where ticker=p_ticker and ex_date=p_ex and type='dividend' for update;
 if found and (old.value_per_share<>r.value_per_share and not(p_ticker='WMT' and old.source='yahoo' and r.value_per_share=0.2475 and old.value_per_share=round(r.value_per_share,3)) or (old.record_date is not null and old.record_date<>r.record_date) or (old.payment_date is not null and old.payment_date<>r.payment_date and not(p_ticker='DIS' and old.source='yahoo' and old.payment_date='2025-12-29'))) then raise exception 'Unreviewed public conflict';end if;
 if exists(select 1 from public.dividends where ticker=p_ticker and type='dividend' and payment_date=r.payment_date and ex_date<>p_ex) then raise exception 'Ambiguous payment';end if;
 insert into public.issuer_dividend_reconciliations(ticker,ex_date,declaration_date,record_date,payment_date,value_per_share,source_url,prior_row)
 values(p_ticker,p_ex,r.declaration_date,r.record_date,r.payment_date,r.value_per_share,r.source_url,to_jsonb(old)) on conflict do nothing;
 insert into public.dividends(ticker,ex_date,record_date,payment_date,value_per_share,type,source,source_url)
 values(p_ticker,p_ex,r.record_date,r.payment_date,r.value_per_share,'dividend','issuer_primary',r.source_url)
 on conflict(ticker,ex_date,type) do update set value_per_share=excluded.value_per_share,record_date=excluded.record_date,payment_date=excluded.payment_date,source=excluded.source,source_url=excluded.source_url;
 -- Review exact quarantined observations only. Never erase or rewrite them.
 insert into public.dividend_provider_adjudications(provider,ticker,ex_date,declaration_date,record_date,payment_date,observed_value,primary_value,primary_source_url,disposition)
 select c.provider,c.ticker,c.ex_date,c.declaration_date,c.record_date,c.payment_date,c.observed_value,r.value_per_share,r.source_url,
  case when c.observed_value=r.value_per_share then 'confirmed' else 'rejected' end
 from public.dividend_provider_conflicts c where c.ticker=p_ticker and c.ex_date=p_ex and c.declaration_date=r.declaration_date and c.record_date=r.record_date and c.payment_date=r.payment_date on conflict do nothing;
 update public.dividend_provider_conflicts c set issuer_reviewed_at=now() where c.ticker=p_ticker and c.ex_date=p_ex and c.declaration_date=r.declaration_date and c.record_date=r.record_date and c.payment_date=r.payment_date
 and exists(select 1 from public.dividend_provider_adjudications a where a.provider=c.provider and a.ticker=c.ticker and a.ex_date=c.ex_date and a.observed_value=c.observed_value and a.primary_value=r.value_per_share and a.primary_source_url=r.source_url);
 get diagnostics n=row_count;
 return jsonb_build_object('saved',1,'reviewed_conflicts',n,'received_income_created',0);
end $$;
revoke all on function public.apply_cash_issuer_review(text,date) from public,anon,authenticated;
grant execute on function public.apply_cash_issuer_review(text,date) to service_role;

do $$ declare r record;begin for r in select ticker,ex_date from public.cash_issuer_reviews where ticker='WMT' order by ex_date loop perform public.apply_cash_issuer_review(r.ticker,r.ex_date);end loop;end $$;

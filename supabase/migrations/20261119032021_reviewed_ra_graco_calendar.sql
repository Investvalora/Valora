-- Reviewed issuer/exchange ex dates must not require a second vendor when the
-- primary source explicitly states ex. This trust applies only to curated rows;
-- incoming provider payloads cannot set this flag or rewrite source evidence.
alter table public.cash_issuer_reviews
 add column ex_evidence_basis text not null default 'independent_vendor'
  check(ex_evidence_basis in('independent_vendor','issuer_explicit','exchange_explicit')),
 add column ex_evidence_snapshot jsonb,
 add constraint reviewed_explicit_ex_evidence check (
  ex_evidence_basis='independent_vendor' or
  (ex_evidence_snapshot is not null and jsonb_typeof(ex_evidence_snapshot)='object'
   and ex_evidence_snapshot @> jsonb_build_object('ex_date',ex_date::text,'record_date',record_date::text,'payment_date',payment_date::text,'value_per_share',value_per_share)
   and ((ex_evidence_basis='issuer_explicit' and ex_source_url=source_url and source_url like 'https://%')
    or (ex_evidence_basis='exchange_explicit' and ex_source_url='https://api.nasdaq.com/api/quote/'||ticker||'/dividends?assetclass=stocks')))
 );

insert into public.cash_issuer_reviews(ticker,ex_date,declaration_date,record_date,payment_date,value_per_share,source_url,ex_source_url,review_note,ex_evidence_basis,ex_evidence_snapshot)
select 'RA',ex_date,'2026-09-25',ex_date,payment_date,0.1180,link,link,
 'Issuer Q4 announcement explicitly lists separate ex/record/payment columns. December was missing; October and November values are unchanged. Distribution may include return of capital; this is not a personal net receipt.',
 'issuer_explicit',jsonb_build_object('ex_date',ex_date::text,'record_date',ex_date::text,'payment_date',payment_date::text,'value_per_share',0.1180,'reviewed_excerpt','Q4 2026 distribution schedule: October 9/23; November 12/27; December 10/24; USD 0.1180 each')
from (values ('2026-10-09'::date,'2026-10-23'::date),('2026-11-12'::date,'2026-11-27'::date),('2026-12-10'::date,'2026-12-24'::date)) v(ex_date,payment_date)
cross join (select 'https://www.globenewswire.com/news-release/2026/09/25/3369341/0/en/brookfield-real-assets-income-fund-inc-declares-q4-2026-distribution-schedule.html'::text as link) source;

insert into public.cash_issuer_reviews(ticker,ex_date,declaration_date,record_date,payment_date,value_per_share,source_url,ex_source_url,review_note) values
('GGG','2026-10-19','2026-09-11','2026-10-19','2026-11-04',0.295,'https://investors.graco.com/news-releases/news-release-details/graco-announces-regular-quarterly-dividend-51','https://investors.graco.com/stock-information/dividend-history','Issuer announcement confirms 29.5 cents; issuer-hosted history and Alpha independently identify the ex date. Marketstack rounded cents remain separate observations.');

insert into public.cash_issuer_reviews(ticker,ex_date,declaration_date,record_date,payment_date,value_per_share,source_url,ex_source_url,review_note,ex_evidence_basis,ex_evidence_snapshot) values
('GOOG','2026-12-07','2026-10-28','2026-12-07','2026-12-14',0.22,'https://www.sec.gov/Archives/edgar/data/1652044/000165204426000080/googexhibit991q32026.htm','https://api.nasdaq.com/api/quote/GOOG/dividends?assetclass=stocks','SEC announcement covers Class A/B/C common shares. Ex independently read from GOOG Nasdaq, not copied from GOOGL or inferred from record. Nasdaq declaration 27/10 differs from official 28/10 and remains in the reviewed excerpt. Excludes mandatory convertible preferred shares.','exchange_explicit',
'{"ex_date":"2026-12-07","record_date":"2026-12-07","payment_date":"2026-12-14","value_per_share":0.22,"identity":{"symbol":"GOOG","stockType":"Class C Capital Stock","isNasdaqListed":true,"assetClass":"STOCKS"},"reviewed_excerpt":{"exOrEffDate":"12/07/2026","type":"Cash","amount":"$0.22","declarationDate":"10/27/2026","recordDate":"12/07/2026","paymentDate":"12/14/2026","currency":"USD"}}'::jsonb);
create or replace function public.apply_cash_issuer_review(p_ticker text,p_ex date) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare r public.cash_issuer_reviews;old public.dividends;prior public.issuer_dividend_reconciliations;n integer;
begin
 select * into r from public.cash_issuer_reviews where ticker=p_ticker and ex_date=p_ex;
 if not found then raise exception 'Unreviewed issuer event';end if;
 if not exists(select 1 from public.assets where ticker=p_ticker and active and type='stock_us' and currency='USD') then return jsonb_build_object('saved',0,'waiting','asset');end if;
 -- Independent date evidence must agree on ex/record/payment/amount. A
 -- declaration-only discrepancy is retained in its original vendor snapshot.
 if r.ex_evidence_basis='independent_vendor' and not exists(select 1 from public.supplemental_dividend_observations o where o.ticker=p_ticker and o.ex_date=p_ex and o.record_date=r.record_date and o.payment_date=r.payment_date and o.value_per_share=r.value_per_share and o.currency='USD' and o.distribution='recurring')
 and not exists(select 1 from public.dividend_provider_events o where o.ticker=p_ticker and o.ex_date=p_ex and o.record_date=r.record_date and o.payment_date=r.payment_date and o.value_per_share=r.value_per_share)
 then return jsonb_build_object('saved',0,'waiting','independent_ex');end if;
 if exists(select 1 from public.supplemental_dividend_observations o where o.ticker=p_ticker and o.payment_date=r.payment_date and o.value_per_share=r.value_per_share and o.currency='USD' and o.distribution='recurring' and o.ex_date<>p_ex)
 or exists(select 1 from public.dividend_provider_events o where o.ticker=p_ticker and o.payment_date=r.payment_date and o.value_per_share=r.value_per_share and o.ex_date<>p_ex) then raise exception 'Conflicting independent ex';end if;
 perform pg_advisory_xact_lock(hashtextextended('dividend-provider-ticker:'||p_ticker,0));
 select * into prior from public.issuer_dividend_reconciliations where ticker=p_ticker and ex_date=p_ex;
 if found and (prior.declaration_date<>r.declaration_date or prior.record_date<>r.record_date or prior.payment_date<>r.payment_date or prior.value_per_share<>r.value_per_share) then raise exception 'Conflicting prior issuer review';end if;
 select * into old from public.dividends where ticker=p_ticker and ex_date=p_ex and type='dividend' for update;
 if found and (old.value_per_share<>r.value_per_share and not(((p_ticker='WMT' and r.value_per_share=0.2475) or p_ticker='PG') and old.source='yahoo' and old.value_per_share=round(r.value_per_share,3)) or (old.record_date is not null and old.record_date<>r.record_date) or (old.payment_date is not null and old.payment_date<>r.payment_date and not(p_ticker='DIS' and old.source='yahoo' and old.payment_date='2025-12-29'))) then raise exception 'Unreviewed public conflict';end if;
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
-- Only these reviewed events are promoted. Original vendor values and private
-- financial records remain untouched; matching conflicts may be adjudicated.
-- No nonpayer policy is inferred for BB/PERT.
do $$ declare r record;begin
 for r in select ticker,ex_date from public.cash_issuer_reviews where
 (ticker='RA' and ex_date in('2026-10-09','2026-11-12','2026-12-10')) or
 (ticker='GGG' and ex_date='2026-10-19') or (ticker='GOOG' and ex_date='2026-12-07') loop
  perform public.apply_cash_issuer_review(r.ticker,r.ex_date);
 end loop;
end $$;

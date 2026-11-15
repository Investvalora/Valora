-- Keep complete Nasdaq rows without declaring a partially documented calendar complete.
create function public.finish_partial_international_announcements(p_ticker text,p_claim_token uuid,p_events jsonb,p_missing integer)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare previous_success timestamptz;r jsonb;
begin
 if p_missing is null or p_missing<1 or p_missing>1000 or p_ticker in('JPM','MA') then raise exception 'Invalid partial Nasdaq result';end if;
 select last_success_at into previous_success from public.international_announcement_tasks where ticker=p_ticker for update;
 r:=public.finish_international_announcements(p_ticker,p_claim_token,p_events,null);
 if r->>'error' is null then
  update public.international_announcement_tasks set last_error='nasdaq_partial_coverage',last_success_at=previous_success where ticker=p_ticker;
  r:=r||jsonb_build_object('error','nasdaq_partial_coverage');
 end if;
 return r||jsonb_build_object('missing',p_missing);
end $$;
revoke all on function public.finish_partial_international_announcements(text,uuid,jsonb,integer) from public,anon,authenticated;
grant execute on function public.finish_partial_international_announcements(text,uuid,jsonb,integer) to service_role;

-- Reviewed official facts, separate from immutable vendor evidence. This is a
-- bounded remediation of known events, not a claim of automatic RI discovery.
alter table public.dividend_provider_conflicts add column issuer_reviewed_at timestamptz;
grant update(issuer_reviewed_at) on public.dividend_provider_conflicts to service_role;
create table public.cash_issuer_reviews(
 ticker text not null,ex_date date not null,declaration_date date not null,record_date date not null,payment_date date not null,
 value_per_share numeric(20,8) not null check(value_per_share>0),source_url text not null,ex_source_url text not null,
 review_note text not null,reviewed_at timestamptz not null default now(),primary key(ticker,ex_date),
 check(declaration_date<=ex_date and ex_date<=record_date and record_date<=payment_date)
);
alter table public.cash_issuer_reviews enable row level security;
revoke all on public.cash_issuer_reviews from public,anon,authenticated;
grant select on public.cash_issuer_reviews to service_role;
insert into public.cash_issuer_reviews(ticker,ex_date,declaration_date,record_date,payment_date,value_per_share,source_url,ex_source_url,review_note) values
 ('GOOGL','2026-12-07','2026-10-28','2026-12-07','2026-12-14',0.22,'https://abc.xyz/investor/faqs-and-general-information/','https://massive.com/docs/rest/stocks/corporate-actions/dividends','Common Class A/B/C; excludes preferred dividend. Massive declaration 27/10 differs from official 28/10; retain vendor snapshot.'),
 ('KO','2026-12-01','2026-10-15','2026-12-01','2026-12-15',0.53,'https://www.coca-colacompany.com/media-center/coca-cola-declares-quarterly-dividend','https://massive.com/docs/rest/stocks/corporate-actions/dividends','Official 53 cents per common share; ex independently observed, never inferred from record.'),
 ('MCD','2026-12-01','2026-09-17','2026-12-01','2026-12-15',1.93,'https://mcdonalds.mediaroom.com/2026-09-17-McDONALDS-MARKS-50-CONSECUTIVE-YEARS-OF-DIVIDEND-INCREASES%2C-JOINING-THE-RANKS-OF-DIVIDEND-KINGS','https://massive.com/docs/rest/stocks/corporate-actions/dividends','Official common-stock quarterly dividend; ex independently observed.'),
 ('DIS','2025-12-15','2025-11-13','2025-12-15','2026-01-15',0.75,'https://thewaltdisneycompany.com/press-releases/the-walt-disney-company-reports-fourth-quarter-and-full-year-earnings-for-fiscal-2025/','https://www.alphavantage.co/documentation/#dividends','First of two separate 0.75 installments; legacy Yahoo payment 29/12 is incorrect. Do not combine installments.'),
 ('GGG','2026-07-20','2026-06-12','2026-07-20','2026-08-05',0.295,'https://investors.graco.com/stock-information/dividend-history','https://investors.graco.com/stock-information/dividend-history','Official table explicitly provides ex date and 0.295; Marketstack 0.30 is rounded, not additional income.');

create function public.apply_cash_issuer_review(p_ticker text,p_ex date) returns jsonb
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
 if found and (old.value_per_share<>r.value_per_share or (old.record_date is not null and old.record_date<>r.record_date) or (old.payment_date is not null and old.payment_date<>r.payment_date and not(p_ticker='DIS' and old.source='yahoo' and old.payment_date='2025-12-29'))) then raise exception 'Unreviewed public conflict';end if;
 if exists(select 1 from public.dividends where ticker=p_ticker and type='dividend' and payment_date=r.payment_date and ex_date<>p_ex) then raise exception 'Ambiguous payment';end if;
 insert into public.issuer_dividend_reconciliations(ticker,ex_date,declaration_date,record_date,payment_date,value_per_share,source_url,prior_row)
 values(p_ticker,p_ex,r.declaration_date,r.record_date,r.payment_date,r.value_per_share,r.source_url,to_jsonb(old)) on conflict do nothing;
 insert into public.dividends(ticker,ex_date,record_date,payment_date,value_per_share,type,source,source_url)
 values(p_ticker,p_ex,r.record_date,r.payment_date,r.value_per_share,'dividend','issuer_primary',r.source_url)
 on conflict(ticker,ex_date,type) do update set record_date=excluded.record_date,payment_date=excluded.payment_date,source=excluded.source,source_url=excluded.source_url;
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
-- Fresh replay has no vendor evidence, so it safely waits. Hosted production
-- has the observations from the bounded first pass; no user records are touched.
do $$ declare r record;begin for r in select ticker,ex_date from public.cash_issuer_reviews order by ticker loop perform public.apply_cash_issuer_review(r.ticker,r.ex_date);end loop;end $$;

-- A declaration-only difference is not an economic/date-eligibility conflict.
-- Keep it visible without rewriting either the official date or vendor snapshot.
create or replace view public.supplemental_dividend_evidence with(security_invoker=true) as
select o.*,
 case when exists(select 1 from public.supplemental_dividend_observations r where r.provider=o.provider and r.ticker=o.ticker and r.event_id=o.event_id and r.snapshot_hash<>o.snapshot_hash) then 'revision_review'
 when o.ex_date is null or o.record_date is null or o.payment_date is null or o.declaration_date is null or o.currency is null then 'incomplete'
 when o.distribution<>'recurring' then 'distribution_review'
 when exists(select 1 from public.issuer_dividend_reconciliations r where r.ticker=o.ticker and r.ex_date=o.ex_date and r.record_date=o.record_date and r.payment_date=o.payment_date and r.declaration_date=o.declaration_date and r.value_per_share=o.value_per_share and o.currency='USD') then 'official_confirmed'
 when exists(select 1 from public.issuer_dividend_reconciliations r where r.ticker=o.ticker and r.ex_date=o.ex_date and r.record_date=o.record_date and r.payment_date=o.payment_date and r.declaration_date<>o.declaration_date and r.value_per_share=o.value_per_share and o.currency='USD') then 'official_metadata_difference'
 when exists(select 1 from public.issuer_dividend_reconciliations r where r.ticker=o.ticker and (r.ex_date=o.ex_date or r.payment_date=o.payment_date)) then 'official_conflict'
 else 'reported_unconfirmed' end as evidence_status
from public.supplemental_dividend_observations o;

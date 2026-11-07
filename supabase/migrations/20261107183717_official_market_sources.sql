-- Public market data only. No personal holdings, transactions or receipts.
create table public.asset_market_identifiers (
 ticker text primary key references public.assets(ticker) on delete cascade,
 isin text not null check (isin ~ '^BR[A-Z0-9]{9}[0-9]$'),
 source text not null default 'b3_cotahist' check(source='b3_cotahist'),
 updated_at timestamptz not null default now()
);
create index asset_market_identifiers_isin on public.asset_market_identifiers(isin);
create table public.cvm_fii_reports (
 cnpj text not null check(cnpj ~ '^[0-9]{14}$'),
 isin text not null check(isin ~ '^BR[A-Z0-9]{9}[0-9]$'),
 reference_date date not null,
 delivered_at date not null check(delivered_at >= reference_date),
 version integer not null check(version > 0),
 vpa numeric not null check(vpa > 0 and vpa::text not in ('NaN','Infinity','-Infinity')),
 source_url text not null check(source_url ~ '^https://dados[.]cvm[.]gov[.]br/dados/FII/DOC/INF_MENSAL/DADOS/inf_mensal_fii_[0-9]{4}[.]zip$'),
 updated_at timestamptz not null default now(),
 primary key(cnpj,reference_date,version)
);
create index cvm_fii_reports_isin_reference on public.cvm_fii_reports(isin,reference_date desc,version desc);
alter table public.asset_market_identifiers enable row level security;
alter table public.cvm_fii_reports enable row level security;
revoke all on public.asset_market_identifiers,public.cvm_fii_reports from public,anon,authenticated;
grant select on public.asset_market_identifiers,public.cvm_fii_reports to authenticated;
grant select,insert,update on public.asset_market_identifiers,public.cvm_fii_reports to service_role;
create policy market_identifiers_read on public.asset_market_identifiers for select to authenticated using(true);
create policy cvm_reports_read on public.cvm_fii_reports for select to authenticated using(true);
alter table public.fundamentals add column cvm_reference_date date;

-- Service-only, INVOKER: preserve every existing non-null indicator.
-- The report's delivery date prevents future information leaking into backtests.
create function public.apply_cvm_fii_fallback() returns integer
language plpgsql security invoker set search_path=public,pg_temp as $$
declare affected integer;
begin
 with reports as (
  select distinct on(a.ticker) a.ticker,r.vpa,r.reference_date
  from public.assets a
  join public.asset_market_identifiers i on i.ticker=a.ticker
  join public.cvm_fii_reports r on r.isin=i.isin
  where a.active and a.type='fii' and r.delivered_at<=current_date
   and r.reference_date >= current_date-interval '6 months'
  order by a.ticker,r.reference_date desc,r.version desc,r.delivered_at desc
 ), enriched as (
  insert into public.fundamentals(ticker,reference_date,vpa,pvp,source,cvm_reference_date,pl,roe,dy,debt_equity,net_margin,lpa,payout_ratio)
  select r.ticker,current_date,r.vpa,coalesce(f.pvp,p.close/r.vpa),coalesce(f.source,'cvm'),r.reference_date,f.pl,f.roe,f.dy,f.debt_equity,f.net_margin,f.lpa,f.payout_ratio
  from reports r
  left join lateral(select * from public.fundamentals where ticker=r.ticker order by reference_date desc limit 1) f on true
  left join lateral(select close from public.price_history where ticker=r.ticker and date<=current_date order by date desc limit 1) p on true
  where f.vpa is null
  on conflict(ticker,reference_date) do update
  set vpa=excluded.vpa,pvp=coalesce(fundamentals.pvp,excluded.pvp),cvm_reference_date=excluded.cvm_reference_date
  where fundamentals.vpa is null
  returning 1
 ) select count(*) into affected from enriched;
 return affected;
end $$;
revoke all on function public.apply_cvm_fii_fallback() from public,anon,authenticated;
grant execute on function public.apply_cvm_fii_fallback() to service_role;

-- Enabled with deployment of sync-cvm-fii; no credentials embedded in SQL.
select cron.schedule('sync-cvm-fii-daily','30 23 * * 1-5',$job$
 select net.http_post(
  url:=(select decrypted_secret from vault.decrypted_secrets where name='project_url' limit 1)||'/functions/v1/sync-cvm-fii',
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='service_role_key' limit 1)),
  body:='{}'::jsonb,timeout_milliseconds:=180000);
$job$);

create table public.b3_dividend_tasks (
 ticker text primary key references public.assets(ticker) on delete cascade,
 next_sync_at timestamptz not null default now(),last_success_at timestamptz,last_error text
);
create table public.b3_cash_announcements (
 ticker text not null references public.assets(ticker) on delete cascade,
 isin text not null, type text not null check(type in('dividend','jcp')),
 record_date date not null,payment_date date not null check(payment_date>=record_date),approval_date date not null,
 value_per_share numeric not null check(value_per_share>0 and value_per_share::text not in('NaN','Infinity','-Infinity')),
 source_url text not null,
 primary key(ticker,record_date,payment_date,approval_date,type,value_per_share)
);
alter table public.b3_dividend_tasks enable row level security;
alter table public.b3_cash_announcements enable row level security;
revoke all on public.b3_dividend_tasks,public.b3_cash_announcements from public,anon,authenticated;
grant select,insert,update on public.b3_dividend_tasks,public.b3_cash_announcements to service_role;
grant select on public.b3_cash_announcements to authenticated;
create policy b3_announcements_read on public.b3_cash_announcements for select to authenticated using(true);
create function public.claim_b3_dividend_assets() returns table(ticker text,isin text,issuing_company text)
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 insert into public.b3_dividend_tasks(ticker) select a.ticker from public.assets a
 join public.asset_market_identifiers i using(ticker)
 where a.active and a.type='stock_br' on conflict do nothing;
 return query with claimed as (
  update public.b3_dividend_tasks t set next_sync_at=now()+interval '10 minutes'
  where t.ticker in(select j.ticker from public.b3_dividend_tasks j join public.assets a on a.ticker=j.ticker
    where j.next_sync_at<=now() and a.active and a.type='stock_br'
    order by j.next_sync_at,j.ticker for update of j skip locked limit 3) returning t.ticker
 ) select c.ticker,i.isin,left(coalesce(a.provider_symbol,a.ticker),4)
 from claimed c join public.assets a on a.ticker=c.ticker join public.asset_market_identifiers i on i.ticker=c.ticker;
end $$;
create function public.store_b3_announcements(p_events jsonb) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare saved integer; enriched integer;
begin
 if jsonb_typeof(p_events)<>'array' or jsonb_array_length(p_events)>1000 then raise exception 'Invalid B3 events';end if;
 insert into public.b3_cash_announcements(ticker,isin,type,record_date,payment_date,approval_date,value_per_share,source_url)
 select e.ticker,e.isin,e.type,e.record_date,e.payment_date,e.approval_date,e.value_per_share,e.source_url
 from jsonb_to_recordset(p_events) e(ticker text,isin text,type text,record_date date,payment_date date,approval_date date,value_per_share numeric,source_url text)
 join public.asset_market_identifiers i on i.ticker=e.ticker and i.isin=e.isin
 join public.assets a on a.ticker=e.ticker and a.type='stock_br' and a.active
 on conflict do nothing;
 get diagnostics saved=row_count;
 -- Multiple installments cannot be collapsed into the legacy one-row event.
 -- Enrich only one unambiguous announcement matching an existing ex-date/value.
 with unique_events as (
  select ticker,record_date,type,min(payment_date) payment_date,min(value_per_share) value_per_share,min(source_url) source_url
  from public.b3_cash_announcements group by ticker,record_date,type having count(*)=1
 ) update public.dividends d set payment_date=e.payment_date,record_date=e.record_date,source='b3',source_url=e.source_url
 from unique_events e where d.ticker=e.ticker and d.type=e.type and d.source='yahoo' and d.payment_date is null
  and abs(d.value_per_share-e.value_per_share)<=0.000001
  and d.ex_date>e.record_date and d.ex_date<=e.record_date+7
  and d.ex_date=(select min(h.date) from public.price_history h where h.source='b3_cotahist' and h.date>e.record_date)
  and exists(select 1 from public.price_history h where h.source='b3_cotahist' and h.date=e.record_date);
 get diagnostics enriched=row_count;
 return jsonb_build_object('saved',saved,'enriched',enriched);
end $$;
revoke all on function public.claim_b3_dividend_assets(),public.store_b3_announcements(jsonb) from public,anon,authenticated;
grant execute on function public.claim_b3_dividend_assets(),public.store_b3_announcements(jsonb) to service_role;
select cron.schedule('sync-b3-dividends','2-59/5 * * * *',$job$
 select net.http_post(
  url:=(select decrypted_secret from vault.decrypted_secrets where name='project_url' limit 1)||'/functions/v1/sync-b3-dividends',
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='service_role_key' limit 1)),
  body:='{}'::jsonb,timeout_milliseconds:=120000);
$job$);

create table public.issuer_dividend_sources (
 ticker text primary key references public.assets(ticker) on delete cascade,
 provider text not null default 'ishares' check(provider='ishares'),
 source_url text not null check(source_url ~ '^https://www[.]ishares[.]com/us/products/[0-9]+/[a-z0-9-]+$'),
 next_sync_at timestamptz not null default now(),
 last_attempt_at timestamptz,last_success_at timestamptz,last_error text
);
alter table public.dividends add column record_date date, add column source_url text;
alter table public.issuer_dividend_sources enable row level security;
revoke all on public.issuer_dividend_sources from public,anon,authenticated;
grant select,insert,update on public.issuer_dividend_sources to service_role;
-- Discovery uses the provider's public directory, not a portfolio ticker list.

create function public.claim_issuer_sources() returns setof public.issuer_dividend_sources
language sql security invoker set search_path=public,pg_temp as $$
 update public.issuer_dividend_sources set next_sync_at=now()+interval '10 minutes'
 where ticker in(select s.ticker from public.issuer_dividend_sources s join public.assets a using(ticker)
  where s.next_sync_at<=now() and a.active and a.currency='USD' and a.type='etf_us'
  order by s.next_sync_at,s.ticker for update of s skip locked limit 3)
 returning *;
$$;
create function public.store_issuer_distributions(p_ticker text,p_events jsonb) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare e jsonb; n integer; saved integer:=0; conflicts integer:=0;
begin
 if not exists(select 1 from public.issuer_dividend_sources s join public.assets a using(ticker)
   where a.ticker=p_ticker and a.currency='USD' and a.type='etf_us' and a.active)
   or jsonb_typeof(p_events)<>'array' or jsonb_array_length(p_events)>1000 then raise exception 'Invalid issuer events';end if;
 for e in select value from jsonb_array_elements(p_events) loop
  if e->>'ticker' is distinct from p_ticker or e->>'type' is distinct from 'dividend'
    or (e->>'value_per_share')::numeric<=0 or (e->>'payment_date')::date<(e->>'ex_date')::date
    or e->>'ex_date' is null or e->>'payment_date' is null then raise exception 'Invalid issuer event';end if;
  insert into public.dividends(ticker,ex_date,payment_date,value_per_share,type,source,record_date,source_url)
  values(p_ticker,(e->>'ex_date')::date,(e->>'payment_date')::date,(e->>'value_per_share')::numeric,'dividend','ishares',(e->>'record_date')::date,(select source_url from public.issuer_dividend_sources where ticker=p_ticker))
  on conflict(ticker,ex_date,type) do update set payment_date=excluded.payment_date,value_per_share=excluded.value_per_share,source='ishares',record_date=excluded.record_date,source_url=excluded.source_url
  where (dividends.source='yahoo' and dividends.payment_date is null)
    or (dividends.source='ishares' and dividends.payment_date=excluded.payment_date and dividends.value_per_share=excluded.value_per_share);
  get diagnostics n=row_count;
  if n=0 then conflicts:=conflicts+1;else saved:=saved+n;end if;
 end loop;
 return jsonb_build_object('saved',saved,'conflicts',conflicts);
end $$;
revoke all on function public.claim_issuer_sources(),public.store_issuer_distributions(text,jsonb) from public,anon,authenticated;
grant execute on function public.claim_issuer_sources(),public.store_issuer_distributions(text,jsonb) to service_role;
-- Public announcements confirmed by another source must survive Yahoo refresh.
create function public.store_yahoo_dividend_events(p_events jsonb) returns integer
language plpgsql security invoker set search_path=public,pg_temp as $$
declare saved integer;
begin
 if jsonb_typeof(p_events)<>'array' or jsonb_array_length(p_events)>200 then raise exception 'Invalid Yahoo events';end if;
 with stored as (
  insert into public.dividends(ticker,ex_date,value_per_share,type,source)
  select e.ticker,e.ex_date,e.value_per_share,e.type,'yahoo'
  from jsonb_to_recordset(p_events) as e(ticker text,ex_date date,value_per_share numeric,type text)
  on conflict(ticker,ex_date,type) do update set value_per_share=excluded.value_per_share
  where dividends.source='yahoo' and dividends.payment_date is null
  returning 1
 ) select count(*) into saved from stored;
 return saved;
end $$;
revoke all on function public.store_yahoo_dividend_events(jsonb) from public,anon,authenticated;
grant execute on function public.store_yahoo_dividend_events(jsonb) to service_role;
select cron.schedule('sync-issuer-dividends','*/5 * * * *',$job$
 select net.http_post(
  url:=(select decrypted_secret from vault.decrypted_secrets where name='project_url' limit 1)||'/functions/v1/sync-issuer-dividends',
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='service_role_key' limit 1)),
  body:='{}'::jsonb,timeout_milliseconds:=120000);
$job$);
select cron.schedule('discover-issuer-dividend-sources','45 21 * * *',$job$
 select net.http_post(
  url:=(select decrypted_secret from vault.decrypted_secrets where name='project_url' limit 1)||'/functions/v1/sync-issuer-dividends',
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='service_role_key' limit 1)),
  body:='{"discover":true}'::jsonb,timeout_milliseconds:=60000);
$job$);

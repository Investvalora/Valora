-- Official FNET observations are not ex-dates or personal cash receipts.
create table public.fnet_payment_notices (
 ticker text not null references public.assets(ticker) on delete cascade,
 source_url text not null check(source_url ~ '^https://fnet[.]bmfbovespa[.]com[.]br/fnet/publico/exibirDocumento[?]cvm=true&id=[0-9]+$'),
 cnpj text not null check(cnpj ~ '^[0-9]{14}$'),isin text not null check(isin ~ '^BR[A-Z0-9]{9}[0-9]$'),
 record_date date not null,payment_date date not null check(payment_date>=record_date),
 value_per_share numeric not null check(value_per_share>0 and value_per_share::text not in('NaN','Infinity','-Infinity')),
 observed_at timestamptz not null default now(),primary key(ticker,source_url)
);
alter table public.fnet_payment_notices enable row level security;
revoke all on public.fnet_payment_notices from public,anon,authenticated;
grant select on public.fnet_payment_notices to authenticated;
create policy fnet_notices_read on public.fnet_payment_notices for select to authenticated using(true);
grant select,insert on public.fnet_payment_notices to service_role;
create index fnet_notices_payment on public.fnet_payment_notices(ticker,payment_date);
-- Only the newest available reference period identifies the current fund. Two
-- CNPJs in that period still block discovery; stale history cannot veto forever.
create or replace function public.claim_dividend_payment_sources() returns setof public.dividend_payment_sources
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 -- Discover by authoritative ISIN/CNPJ identity, not by a portfolio ticker list.
 insert into public.dividend_payment_sources(ticker,provider,cnpj,isin)
 select a.ticker,'fnet',min(r.cnpj),i.isin
 from public.assets a join public.asset_market_identifiers i using(ticker)
 join public.cvm_fii_reports r on r.isin=i.isin
 where a.active and a.type='fii' and a.currency='BRL' and r.delivered_at<=current_date
 and r.reference_date<=current_date
 and r.reference_date=(select max(latest.reference_date) from public.cvm_fii_reports latest
   where latest.isin=i.isin and latest.delivered_at<=current_date and latest.reference_date<=current_date)
 group by a.ticker,i.isin having count(distinct r.cnpj)=1
 on conflict(ticker) do nothing;
 insert into public.dividend_payment_sources(ticker,provider)
 select ticker,'mastercard' from public.assets where ticker='MA' and active and currency='USD' and type='stock_us'
 on conflict(ticker) do nothing;
 return query update public.dividend_payment_sources s set next_sync_at=now()+interval '10 minutes'
 where s.ticker in(select j.ticker from public.dividend_payment_sources j join public.assets a using(ticker)
   where j.next_sync_at<=now() and a.active order by j.next_sync_at,j.ticker for update of j skip locked limit 2)
 returning s.*;
end $$;

create or replace function public.store_confirmed_dividend_payments(p_ticker text,p_events jsonb) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare provider_name text;e jsonb; matched uuid; candidates integer;enriched integer:=0;conflicts integer:=0;pending_ex integer:=0;
 rec date;pay date;amount numeric;source_name text;source_link text;affected integer;
begin
 select s.provider into provider_name from public.dividend_payment_sources s join public.assets a using(ticker)
 where s.ticker=p_ticker and a.active and ((s.provider='fnet' and a.type='fii' and a.currency='BRL') or(s.provider='mastercard' and a.type='stock_us' and a.currency='USD'));
 if provider_name is null or jsonb_typeof(p_events) is distinct from 'array' or jsonb_array_length(p_events)>100 then raise exception 'Invalid payment events';end if;
 for e in select value from jsonb_array_elements(p_events) loop
  rec:=(e->>'record_date')::date;pay:=(e->>'payment_date')::date;amount:=(e->>'value_per_share')::numeric;source_link:=e->>'source_url';
  if rec is null or pay is null or pay<rec or amount is null or amount<=0 or amount::text in('NaN','Infinity','-Infinity') or source_link is null then raise exception 'Invalid payment event';end if;
  if provider_name='fnet' then
   if source_link !~ '^https://fnet[.]bmfbovespa[.]com[.]br/fnet/publico/exibirDocumento[?]cvm=true&id=[0-9]+$' then raise exception 'Invalid payment source';end if;
   source_name:='fnet';
   perform pg_advisory_xact_lock(hashtextextended('fnet-notice:'||p_ticker||':'||source_link,0));
   -- Keep the original document even when no independent ex-date exists.
   -- A changed document body cannot silently rewrite a prior observation.
   if exists(select 1 from public.fnet_payment_notices n where n.ticker=p_ticker and n.source_url=source_link
      and (n.record_date<>rec or n.payment_date<>pay or n.value_per_share<>amount)) then
     conflicts:=conflicts+1;continue;
   end if;
   insert into public.fnet_payment_notices(ticker,source_url,cnpj,isin,record_date,payment_date,value_per_share)
   select p_ticker,source_link,s.cnpj,s.isin,rec,pay,amount from public.dividend_payment_sources s where s.ticker=p_ticker
   on conflict(ticker,source_url) do nothing;
  else
   if source_link<>'https://investor.mastercard.com/stock-information/dividend-history/default.aspx' then raise exception 'Invalid payment source';end if;
   source_name:='mastercard_ri';
  end if;
  -- Existing Yahoo ex-date is preserved. A record date is never invented as ex.
  select count(*),(array_agg(d.id))[1] into candidates,matched from public.dividends d
  where d.ticker=p_ticker and d.source not in ('seed','synthetic') and d.type='dividend' and abs(d.value_per_share-amount)<=0.000001
    and ((provider_name='fnet' and d.ex_date>rec and d.ex_date<=rec+7)
      or(provider_name='mastercard' and d.ex_date<=rec and d.ex_date>=rec-7)
      -- National Day of Mourning: exchange ex-dates moved to Jan 10 while
      -- the banking settlement/record date remained Jan 9. Do not move ex-date.
      -- https://www.nasdaqtrader.com/TraderNews.aspx?id=ECA2024-632
      or(provider_name='mastercard' and p_ticker='MA'
         and rec=date '2025-01-09' and d.ex_date=date '2025-01-10'));
  if candidates=0 and provider_name='fnet' then pending_ex:=pending_ex+1;continue;end if;
  if candidates<>1 then conflicts:=conflicts+1;continue;end if;
  update public.dividends d set record_date=rec,payment_date=pay,source=source_name,source_url=source_link
  where d.id=matched and ((d.source='yahoo' and d.payment_date is null)
    or(d.source=source_name and d.payment_date=pay and d.record_date=rec));
  get diagnostics affected=row_count;
  if affected=1 then enriched:=enriched+1;else conflicts:=conflicts+1;end if;
 end loop;
 return jsonb_build_object('enriched',enriched,'conflicts',conflicts,'pending_ex',pending_ex);
end $$;

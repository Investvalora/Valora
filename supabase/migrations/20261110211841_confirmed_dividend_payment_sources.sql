-- Public payment dates only. Never write wallet_income or infer personal taxes.
create table public.dividend_payment_sources (
 ticker text primary key references public.assets(ticker) on delete cascade,
 provider text not null check(provider in ('fnet','mastercard')),
 cnpj text,isin text,
 next_sync_at timestamptz not null default now(),last_success_at timestamptz,last_error text,
 check((provider='fnet' and cnpj ~ '^[0-9]{14}$' and isin ~ '^BR[A-Z0-9]{9}[0-9]$' and cnpj is not null and isin is not null)
    or (provider='mastercard' and ticker='MA' and cnpj is null and isin is null))
);
alter table public.dividend_payment_sources enable row level security;
revoke all on public.dividend_payment_sources from public,anon,authenticated;
grant select,insert,update on public.dividend_payment_sources to service_role;
create index dividend_payment_sources_due on public.dividend_payment_sources(next_sync_at,ticker);

create function public.claim_dividend_payment_sources() returns setof public.dividend_payment_sources
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 -- Discover by authoritative ISIN/CNPJ identity, not by a portfolio ticker list.
 insert into public.dividend_payment_sources(ticker,provider,cnpj,isin)
 select a.ticker,'fnet',min(r.cnpj),i.isin
 from public.assets a join public.asset_market_identifiers i using(ticker)
 join public.cvm_fii_reports r on r.isin=i.isin
 where a.active and a.type='fii' and r.delivered_at<=current_date
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

create function public.store_confirmed_dividend_payments(p_ticker text,p_events jsonb) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare provider_name text;e jsonb; matched uuid; candidates integer;enriched integer:=0;conflicts integer:=0;
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
  else
   if source_link<>'https://investor.mastercard.com/stock-information/dividend-history/default.aspx' then raise exception 'Invalid payment source';end if;
   source_name:='mastercard_ri';
  end if;
  -- Existing Yahoo ex-date is preserved. A record date is never invented as ex.
  select count(*),(array_agg(d.id))[1] into candidates,matched from public.dividends d
  where d.ticker=p_ticker and d.type='dividend' and abs(d.value_per_share-amount)<=0.000001
    and ((provider_name='fnet' and d.ex_date>rec and d.ex_date<=rec+7)
      or(provider_name='mastercard' and d.ex_date<=rec and d.ex_date>=rec-7));
  if candidates<>1 then conflicts:=conflicts+1;continue;end if;
  update public.dividends d set record_date=rec,payment_date=pay,source=source_name,source_url=source_link
  where d.id=matched and ((d.source='yahoo' and d.payment_date is null)
    or(d.source=source_name and d.payment_date=pay and d.record_date=rec));
  get diagnostics affected=row_count;
  if affected=1 then enriched:=enriched+1;else conflicts:=conflicts+1;end if;
 end loop;
 return jsonb_build_object('enriched',enriched,'conflicts',conflicts);
end $$;
revoke all on function public.claim_dividend_payment_sources(),public.store_confirmed_dividend_payments(text,jsonb) from public,anon,authenticated;
grant execute on function public.claim_dividend_payment_sources(),public.store_confirmed_dividend_payments(text,jsonb) to service_role;

-- Deploy the function before applying this migration (see rollout document).
select cron.schedule('sync-dividend-payments','3-59/5 * * * *',$job$
 select net.http_post(
  url:=(select decrypted_secret from vault.decrypted_secrets where name='project_url' limit 1)||'/functions/v1/sync-dividend-payments',
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='service_role_key' limit 1)),
  body:='{}'::jsonb,timeout_milliseconds:=180000);
$job$);

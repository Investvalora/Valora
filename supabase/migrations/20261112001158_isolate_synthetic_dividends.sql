-- Keep simulated rows for audit/local fixtures, but never expose as real market events.
create policy dividends_real_events_only on public.dividends as restrictive
for select to authenticated using (source not in ('seed','synthetic'));

create or replace function public.store_international_announcements(p_ticker text,p_events jsonb) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare e jsonb; ex date;rec date;pay date;declared date;amount numeric;existing public.dividends;
 saved integer:=0;conflicts integer:=0;affected integer;candidates integer;source_name text;source_link text;
begin
 if not exists(select 1 from public.international_announcement_tasks t join public.assets a using(ticker)
  where t.ticker=p_ticker and a.active and a.type='stock_us' and a.currency='USD')
  or jsonb_typeof(p_events) is distinct from 'array' or jsonb_array_length(p_events)>100 then raise exception 'Invalid announcement task';end if;
 -- Serialize this provider's submissions for the same ticker.
 perform 1 from public.international_announcement_tasks where ticker=p_ticker for update;
 for e in select value from jsonb_array_elements(p_events) loop
  ex:=null; rec:=(e->>'record_date')::date;pay:=(e->>'payment_date')::date;
  declared:=(e->>'declaration_date')::date;amount:=(e->>'value_per_share')::numeric;
  source_name:='nasdaq';source_link:='https://www.nasdaq.com/market-activity/stocks/'||lower(p_ticker)||'/dividend-history';
  if p_ticker='JPM' then
   source_name:='jpmorgan_ri';source_link:=e->>'source_url';
   if source_link is null or source_link !~ '^https://www[.]jpmorganchase[.]com/ir/news/20[0-9]{2}/jpmc-declares-(increased-)?common-stock-dividend(-[a-z0-9-]+)?$' then raise exception 'Invalid issuer source';end if;
   -- Preserve independently recorded ex-date; never assume record=ex.
   select count(*),min(d.ex_date) into candidates,ex from public.dividends d
    where d.ticker=p_ticker and d.type='dividend' and d.value_per_share=amount and d.source not in ('seed','synthetic') and d.ex_date between rec-7 and rec;
   if candidates<>1 then conflicts:=conflicts+1;continue;end if;
  else ex:=(e->>'ex_date')::date;end if;
  if ex is null or rec is null or pay is null or declared is null or amount is null
   or amount<=0 or amount>=1e12 or amount::text in ('NaN','Infinity','-Infinity') or amount<>trunc(amount,6)
   or declared>current_date or declared>ex or rec<ex or pay<rec or pay-ex>366
   or ex<current_date-366 or ex>current_date+366 then raise exception 'Invalid announcement'; end if;
  -- Same payment on a different ex-date must be reconciled, never duplicated.
  if exists(select 1 from public.dividends d where d.ticker=p_ticker and d.type='dividend'
    and d.source not in ('seed','synthetic') and d.payment_date=pay and d.ex_date<>ex and abs(d.ex_date-ex)<=7) then
   conflicts:=conflicts+1;continue;
  end if;
  select * into existing from public.dividends where ticker=p_ticker and ex_date=ex and type='dividend' for update;
  if found then
   if existing.source in ('seed','synthetic') then
    update public.dividends set value_per_share=amount,payment_date=pay,record_date=rec,source=source_name,source_url=source_link where id=existing.id;
    saved:=saved+1;continue;
   end if;
   if existing.value_per_share<>amount or (existing.payment_date is not null and existing.payment_date<>pay)
     or (existing.record_date is not null and existing.record_date<>rec) then
    conflicts:=conflicts+1;continue;
   end if;
   -- Keep primary issuer sources and already confirmed dates unchanged.
   if existing.source='yahoo' and existing.payment_date is null then
    update public.dividends set payment_date=pay,record_date=rec,source=source_name,source_url=source_link
    where id=existing.id; saved:=saved+1;
   end if;
   continue;
  end if;
  insert into public.dividends(ticker,ex_date,record_date,payment_date,value_per_share,type,source,source_url)
   values(p_ticker,ex,rec,pay,amount,'dividend',source_name,source_link)
   on conflict(ticker,ex_date,type) do nothing;
  get diagnostics affected=row_count;
  if affected=1 then saved:=saved+1;else conflicts:=conflicts+1;end if;
 end loop;
 return jsonb_build_object('saved',saved,'conflicts',conflicts);
end $$;


create or replace function public.store_confirmed_dividend_payments(p_ticker text,p_events jsonb) returns jsonb
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
  where d.ticker=p_ticker and d.source not in ('seed','synthetic') and d.type='dividend' and abs(d.value_per_share-amount)<=0.000001
    and ((provider_name='fnet' and d.ex_date>rec and d.ex_date<=rec+7)
      or(provider_name='mastercard' and d.ex_date<=rec and d.ex_date>=rec-7)
      -- National Day of Mourning: exchange ex-dates moved to Jan 10 while
      -- the banking settlement/record date remained Jan 9. Do not move ex-date.
      -- https://www.nasdaqtrader.com/TraderNews.aspx?id=ECA2024-632
      or(provider_name='mastercard' and p_ticker='MA'
         and rec=date '2025-01-09' and d.ex_date=date '2025-01-10'));
  if candidates<>1 then conflicts:=conflicts+1;continue;end if;
  update public.dividends d set record_date=rec,payment_date=pay,source=source_name,source_url=source_link
  where d.id=matched and ((d.source='yahoo' and d.payment_date is null)
    or(d.source=source_name and d.payment_date=pay and d.record_date=rec));
  get diagnostics affected=row_count;
  if affected=1 then enriched:=enriched+1;else conflicts:=conflicts+1;end if;
 end loop;
 return jsonb_build_object('enriched',enriched,'conflicts',conflicts);
end $$;

create or replace function public.store_yahoo_dividend_events(p_events jsonb) returns integer
language plpgsql security invoker set search_path=public,pg_temp as $$
declare saved integer;
begin
 if jsonb_typeof(p_events)<>'array' or jsonb_array_length(p_events)>200 then raise exception 'Invalid Yahoo events';end if;
 with stored as (
  insert into public.dividends(ticker,ex_date,value_per_share,type,source)
  select e.ticker,e.ex_date,e.value_per_share,e.type,'yahoo'
  from jsonb_to_recordset(p_events) as e(ticker text,ex_date date,value_per_share numeric,type text)
  on conflict(ticker,ex_date,type) do update set value_per_share=excluded.value_per_share,source='yahoo',
   payment_date=case when dividends.source in ('seed','synthetic') then null else dividends.payment_date end,
   record_date=case when dividends.source in ('seed','synthetic') then null else dividends.record_date end,
   source_url=case when dividends.source in ('seed','synthetic') then null else dividends.source_url end
  where dividends.source in ('seed','synthetic') or (dividends.source='yahoo' and dividends.payment_date is null)
  returning 1
 ) select count(*) into saved from stored;
 return saved;
end $$;
revoke all on function public.store_yahoo_dividend_events(jsonb) from public,anon,authenticated;
grant execute on function public.store_yahoo_dividend_events(jsonb) to service_role;

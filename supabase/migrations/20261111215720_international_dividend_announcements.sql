-- Additional public gross announcements; never creates personal receipts.
create table public.international_announcement_tasks (
 ticker text primary key references public.assets(ticker) on delete cascade,
 next_sync_at timestamptz not null default now(), last_attempt_at timestamptz,
 last_success_at timestamptz, last_error text
);
alter table public.international_announcement_tasks enable row level security;
revoke all on public.international_announcement_tasks from public,anon,authenticated;
grant select,insert,update on public.international_announcement_tasks to service_role;
create index international_announcement_due on public.international_announcement_tasks(next_sync_at,ticker);
create function public.claim_international_announcements() returns setof public.international_announcement_tasks
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 insert into public.international_announcement_tasks(ticker)
 select ticker from public.assets where active and type='stock_us' and currency='USD' and ticker ~ '^[A-Z][A-Z0-9.-]{0,9}$'
 on conflict(ticker) do nothing;
 return query update public.international_announcement_tasks j set next_sync_at=now()+interval '10 minutes'
 where j.ticker in (select s.ticker from public.international_announcement_tasks s join public.assets a using(ticker)
  where a.active and a.type='stock_us' and a.currency='USD' and s.next_sync_at<=now()
  order by s.next_sync_at,s.ticker for update of s skip locked limit 2)
 returning j.*;
end $$;
create function public.store_international_announcements(p_ticker text,p_events jsonb) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare e jsonb; ex date;rec date;pay date;declared date;amount numeric;existing public.dividends;
 saved integer:=0;conflicts integer:=0;affected integer;
begin
 if not exists(select 1 from public.international_announcement_tasks t join public.assets a using(ticker)
  where t.ticker=p_ticker and a.active and a.type='stock_us' and a.currency='USD')
  or jsonb_typeof(p_events) is distinct from 'array' or jsonb_array_length(p_events)>100 then raise exception 'Invalid announcement task';end if;
 -- Serialize this provider's submissions for the same ticker.
 perform 1 from public.international_announcement_tasks where ticker=p_ticker for update;
 for e in select value from jsonb_array_elements(p_events) loop
  ex:=(e->>'ex_date')::date; rec:=(e->>'record_date')::date;pay:=(e->>'payment_date')::date;
  declared:=(e->>'declaration_date')::date;amount:=(e->>'value_per_share')::numeric;
  if ex is null or rec is null or pay is null or declared is null or amount is null
   or amount<=0 or amount>=1e12 or amount::text in ('NaN','Infinity','-Infinity') or amount<>trunc(amount,6)
   or declared>current_date or declared>ex or rec<ex or pay<rec or pay-ex>366
   or ex<current_date-366 or ex>current_date+366 then raise exception 'Invalid announcement'; end if;
  -- Same payment on a different ex-date must be reconciled, never duplicated.
  if exists(select 1 from public.dividends d where d.ticker=p_ticker and d.type='dividend'
    and d.payment_date=pay and d.ex_date<>ex and abs(d.ex_date-ex)<=7) then
   conflicts:=conflicts+1;continue;
  end if;
  select * into existing from public.dividends where ticker=p_ticker and ex_date=ex and type='dividend' for update;
  if found then
   if existing.value_per_share<>amount or (existing.payment_date is not null and existing.payment_date<>pay)
     or (existing.record_date is not null and existing.record_date<>rec) then
    conflicts:=conflicts+1;continue;
   end if;
   -- Keep primary issuer sources and already confirmed dates unchanged.
   if existing.source='yahoo' and existing.payment_date is null then
    update public.dividends set payment_date=pay,record_date=rec,source='nasdaq',
     source_url='https://www.nasdaq.com/market-activity/stocks/'||lower(p_ticker)||'/dividend-history'
    where id=existing.id; saved:=saved+1;
   end if;
   continue;
  end if;
  insert into public.dividends(ticker,ex_date,record_date,payment_date,value_per_share,type,source,source_url)
   values(p_ticker,ex,rec,pay,amount,'dividend','nasdaq','https://www.nasdaq.com/market-activity/stocks/'||lower(p_ticker)||'/dividend-history')
   on conflict(ticker,ex_date,type) do nothing;
  get diagnostics affected=row_count;
  if affected=1 then saved:=saved+1;else conflicts:=conflicts+1;end if;
 end loop;
 return jsonb_build_object('saved',saved,'conflicts',conflicts);
end $$;
revoke all on function public.claim_international_announcements(), public.store_international_announcements(text,jsonb) from public,anon,authenticated;
grant execute on function public.claim_international_announcements(), public.store_international_announcements(text,jsonb) to service_role;
-- Deploy function before enabling this bounded queue (2 assets, <=4 source requests/run).
select cron.schedule('sync-international-announcements','4-59/5 * * * *',$job$
 select net.http_post(
 url:=(select decrypted_secret from vault.decrypted_secrets where name='project_url' limit 1)||'/functions/v1/sync-international-announcements',
 headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='service_role_key' limit 1)),
 body:='{}'::jsonb,timeout_milliseconds:=180000);
$job$);

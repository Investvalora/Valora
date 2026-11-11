-- Official JPM announcements enrich independently dated events; no guessed ex-date or personal receipts.
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
    where d.ticker=p_ticker and d.type='dividend' and d.value_per_share=amount and d.ex_date between rec-7 and rec;
   if candidates<>1 then conflicts:=conflicts+1;continue;end if;
  else ex:=(e->>'ex_date')::date;end if;
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

create or replace function public.finish_international_announcements(p_ticker text,p_claim_token uuid,p_events jsonb,p_error text)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare task public.international_announcement_tasks;result jsonb:=jsonb_build_object('saved',0,'conflicts',0); failure text:=p_error;delay_hours integer;
begin
 select * into task from public.international_announcement_tasks where ticker=p_ticker for update;
 if not found or p_claim_token is null or task.claim_token is distinct from p_claim_token or task.next_sync_at<=now() then raise exception 'Collector lease unavailable';end if;
 if jsonb_typeof(p_events) is distinct from 'array' or jsonb_array_length(p_events)>100
  or (p_error is not null and (p_error !~ '^(nasdaq|jpm)_[a-z0-9_]{1,60}$' or jsonb_array_length(p_events)<>0)) then raise exception 'Invalid collector result';end if;
 if failure is null then
  result:=public.store_international_announcements(p_ticker,p_events);
  if (result->>'conflicts')::integer>0 then failure:=case when p_ticker='JPM' then 'jpm_ex_date_or_event_conflict' else 'nasdaq_event_conflict' end;end if;
 end if;
 delay_hours:=case when failure is null then 12 when failure in ('nasdaq_identity_unsupported','nasdaq_unavailable') then 24 else 2 end;
 update public.international_announcement_tasks set claim_token=null,last_attempt_at=now(),last_error=failure,
  last_success_at=case when failure is null then now() else last_success_at end,
  next_sync_at=now()+make_interval(hours=>delay_hours) where ticker=p_ticker;
 return result||jsonb_build_object('error',failure);
end $$;

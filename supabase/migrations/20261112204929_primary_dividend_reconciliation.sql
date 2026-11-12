-- Public issuer evidence is separate from personal receipts and vendor observations.
alter table public.dividends alter column value_per_share type numeric(20,8);
alter table public.sec_dividend_announcements alter column value_per_share type numeric(20,8);
create table public.issuer_dividend_reconciliations (
 ticker text not null references public.assets(ticker),ex_date date not null,
 declaration_date date not null,record_date date not null,payment_date date not null,
 value_per_share numeric(20,8) not null check(value_per_share>0),source_url text not null,
 prior_row jsonb,observed_at timestamptz not null default now(),primary key(ticker,ex_date)
);
alter table public.issuer_dividend_reconciliations enable row level security;
revoke all on public.issuer_dividend_reconciliations from public,anon,authenticated;
grant select,insert on public.issuer_dividend_reconciliations to service_role;

create function public.reconcile_issuer_dividend(p_ticker text,e jsonb) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare ex date;declared date;rec date;pay date;amount numeric;link text;old public.dividends;prior public.issuer_dividend_reconciliations;n integer;
begin
 ex:=(e->>'ex_date')::date;declared:=(e->>'declaration_date')::date;rec:=(e->>'record_date')::date;pay:=(e->>'payment_date')::date;amount:=(e->>'value_per_share')::numeric;link:=e->>'source_url';
 if not exists(select 1 from public.assets where ticker=p_ticker and active and type='stock_us' and currency='USD')
 or declared is null or rec is null or pay is null or amount is null or amount<=0 or amount>=1e12 or amount::text in('NaN','Infinity','-Infinity') or amount<>trunc(amount,8)
 or declared>current_date or declared>rec or rec>pay or pay-rec>366 or rec<current_date-366 then raise exception 'Invalid issuer event';end if;
 -- SEC identity and event must have already passed the existing leased collector.
 if not coalesce(((p_ticker='PRT' and link ~ '^https://permrock[.]com/wp-content/uploads/20[0-9]{2}/[0-9]{2}/[A-Za-z0-9-]+[.]pdf$'
   and e->>'ex_date_source_url'='https://permrock.com/cash-distributions/' and ex=rec
   and link like '%/uploads/'||to_char(declared,'YYYY/MM')||'/%')
  or (p_ticker='META' and link ~ '^https://www[.]nasdaq[.]com/press-release/meta-announces-quarterly-cash-dividend-20[0-9]{2}-[0-9]{2}-[0-9]{2}$' and right(link,10)=declared::text)
  or exists(select 1 from public.sec_dividend_announcements s where s.ticker=p_ticker and s.distribution='regular' and s.source_url=link
    and s.declaration_date=declared and s.record_date=rec and s.payment_date=pay and s.value_per_share=amount)),false) then raise exception 'Unverified issuer source';end if;
 perform pg_advisory_xact_lock(hashtextextended('dividend-provider-ticker:'||p_ticker,0));
 if p_ticker<>'PRT' and ex is not null then raise exception 'Unverified issuer ex';end if;
 -- Missing ex is reconciled against one independent existing event, never copied from record.
 if ex is null then
  select count(*),min(d.ex_date) into n,ex from public.dividends d where d.ticker=p_ticker and d.type='dividend' and d.source not in('seed','synthetic')
   and d.value_per_share=amount and d.ex_date between declared and rec and (d.payment_date is null or d.payment_date=pay);
  if n<>1 then return jsonb_build_object('saved',0,'conflicts',0,'coverage_gap',true);end if;
 end if;
 if ex<declared or ex>rec then raise exception 'Invalid issuer ex';end if;
 select * into prior from public.issuer_dividend_reconciliations where ticker=p_ticker and ex_date=ex;
 if found and (prior.declaration_date<>declared or prior.record_date<>rec or prior.payment_date<>pay or prior.value_per_share<>amount) then
  return jsonb_build_object('saved',0,'conflicts',1);end if;
 select * into old from public.dividends where ticker=p_ticker and ex_date=ex and type='dividend' for update;
 if found then
  if (old.record_date is not null and old.record_date<>rec) or (old.payment_date is not null and old.payment_date<>pay)
   or (old.value_per_share<>amount and not(coalesce(old.source,'')='yahoo' and old.value_per_share=round(amount,3))) then return jsonb_build_object('saved',0,'conflicts',1);end if;
 else
  if exists(select 1 from public.dividends where ticker=p_ticker and type='dividend' and payment_date=pay and ex_date<>ex) then return jsonb_build_object('saved',0,'conflicts',1);end if;
 end if;
 insert into public.issuer_dividend_reconciliations(ticker,ex_date,declaration_date,record_date,payment_date,value_per_share,source_url,prior_row)
 values(p_ticker,ex,declared,rec,pay,amount,link,to_jsonb(old)) on conflict do nothing;
 insert into public.dividends(ticker,ex_date,record_date,payment_date,value_per_share,type,source,source_url)
 values(p_ticker,ex,rec,pay,amount,'dividend','issuer_primary',link)
 on conflict(ticker,ex_date,type) do update set record_date=excluded.record_date,payment_date=excluded.payment_date,
  value_per_share=excluded.value_per_share,source=excluded.source,source_url=excluded.source_url;
 return jsonb_build_object('saved',1,'conflicts',0);
end $$;

create function public.finish_primary_dividends(p_ticker text,p_claim_token uuid,p_events jsonb,p_error text) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare task public.international_announcement_tasks;e jsonb;r jsonb;saved integer:=0;conflicts integer:=0;gaps integer:=0;failure text:=p_error;
begin
 select * into task from public.international_announcement_tasks where ticker=p_ticker for update;
 if p_ticker not in('PRT','META') or not found or p_claim_token is null or task.claim_token is distinct from p_claim_token or task.next_sync_at<=now() then raise exception 'Issuer lease unavailable';end if;
 if jsonb_typeof(p_events) is distinct from 'array' or jsonb_array_length(p_events)>14
 or (p_error is not null and (p_error !~ '^issuer_[a-z_]{1,60}$' or jsonb_array_length(p_events)<>0))
 or (p_error is null and jsonb_array_length(p_events)=0) then raise exception 'Invalid issuer result';end if;
 if failure is null then
  for e in select value from jsonb_array_elements(p_events) loop
   r:=public.reconcile_issuer_dividend(p_ticker,e);saved:=saved+(r->>'saved')::integer;conflicts:=conflicts+(r->>'conflicts')::integer;
   if coalesce((r->>'coverage_gap')::boolean,false) then gaps:=gaps+1;end if;
  end loop;
  if conflicts>0 then failure:='issuer_event_conflict';elsif gaps>0 then failure:='issuer_ex_unconfirmed';end if;
 end if;
 update public.international_announcement_tasks set claim_token=null,last_attempt_at=now(),last_error=failure,
  last_success_at=case when failure is null then now() else last_success_at end,next_sync_at=now()+interval '24 hours' where ticker=p_ticker;
 return jsonb_build_object('saved',saved,'conflicts',conflicts,'coverage_gaps',gaps,'error',failure,'received_income_created',0);
end $$;

-- Keep raw observations. A primary-confirmed rounding loss is explicit partial coverage.
alter function public.finish_dividend_provider(text,text,uuid,jsonb,text) rename to finish_dividend_provider_observations;
create function public.finish_dividend_provider(p_provider text,p_ticker text,p_claim_token uuid,p_events jsonb,p_error text) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare e jsonb;p public.issuer_dividend_reconciliations;t public.dividend_provider_tasks;r jsonb;filtered jsonb:='[]';limited integer:=0;amount numeric;
begin
 select * into t from public.dividend_provider_tasks where provider=p_provider and ticker=p_ticker for update;
 if not found or p_claim_token is null or t.claim_token is distinct from p_claim_token or t.next_sync_at<=now() then raise exception 'Provider lease unavailable';end if;
 if jsonb_typeof(p_events) is distinct from 'array' or jsonb_array_length(p_events)>100 then raise exception 'Invalid provider result';end if;
 if p_error is null then
  for e in select value from jsonb_array_elements(p_events) loop
   amount:=(e->>'value_per_share')::numeric;
   select * into p from public.issuer_dividend_reconciliations where ticker=p_ticker and ex_date=(e->>'ex_date')::date
    and declaration_date=(e->>'declaration_date')::date and record_date=(e->>'record_date')::date and payment_date=(e->>'payment_date')::date;
   if found and amount>0 and amount<>p.value_per_share and amount=round(p.value_per_share,scale(amount)) and scale(amount)<8 then
    -- Existing vendor snapshots remain immutable; do not erase a separate source change.
    if exists(select 1 from public.dividend_provider_events d where d.provider=p_provider and d.ticker=p_ticker and d.ex_date=p.ex_date
      and (d.value_per_share<>amount or d.declaration_date<>p.declaration_date or d.record_date<>p.record_date or d.payment_date<>p.payment_date)) then
     filtered:=filtered||jsonb_build_array(e);continue;
    end if;
    insert into public.dividend_provider_events(provider,ticker,ex_date,declaration_date,record_date,payment_date,value_per_share)
     values(p_provider,p_ticker,p.ex_date,p.declaration_date,p.record_date,p.payment_date,amount) on conflict do nothing;
    limited:=limited+1;
   else filtered:=filtered||jsonb_build_array(e);end if;
  end loop;
 else filtered:=p_events;end if;
 r:=public.finish_dividend_provider_observations(p_provider,p_ticker,p_claim_token,filtered,
  case when p_error is null and limited>0 and jsonb_array_length(filtered)=0 then 'provider_precision_limited' else p_error end);
 if limited>0 and (r->>'error' is null or r->>'error'='provider_precision_limited') then
  update public.dividend_provider_tasks set last_error='provider_precision_limited',last_success_at=t.last_success_at where provider=p_provider and ticker=p_ticker;
  r:=r||jsonb_build_object('error','provider_precision_limited','precision_limited',limited);
 end if;
 return r;
end $$;

revoke all on function public.reconcile_issuer_dividend(text,jsonb),public.finish_primary_dividends(text,uuid,jsonb,text),public.finish_dividend_provider(text,text,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.reconcile_issuer_dividend(text,jsonb),public.finish_primary_dividends(text,uuid,jsonb,text),public.finish_dividend_provider(text,text,uuid,jsonb,text) to service_role;

-- A dated primary policy is not a permanent ticker blacklist; expires automatically.
create table public.issuer_dividend_policies (
 ticker text primary key references public.assets(ticker),policy text not null check(policy='no_cash_dividends'),
 source_url text not null,observed_at timestamptz not null,valid_until timestamptz not null,
 check(valid_until>observed_at and valid_until<=observed_at+interval '30 days')
);
alter table public.issuer_dividend_policies enable row level security;
revoke all on public.issuer_dividend_policies from public,anon,authenticated;
grant select,insert,update on public.issuer_dividend_policies to service_role;
-- Verified from Amazon's official FAQ on this date; replaying later cannot renew it.
insert into public.issuer_dividend_policies select ticker,'no_cash_dividends','https://ir.aboutamazon.com/faqs/default.aspx','2026-11-12T20:46:00Z'::timestamptz,'2026-12-12T20:46:00Z'::timestamptz
 from public.assets where ticker='AMZN' on conflict do nothing;

create function public.issuer_nonpayer_confirmed(p_ticker text) returns boolean
language sql security invoker set search_path=public,pg_temp as $$
 select exists(select 1 from public.issuer_dividend_policies p where p.ticker=p_ticker and p.valid_until>now()
  and not exists(select 1 from public.dividends d where d.ticker=p_ticker and d.ex_date>=p.observed_at::date and d.source not in('seed','synthetic'))
  and not exists(select 1 from public.sec_dividend_announcements s where s.ticker=p_ticker and s.declaration_date>=p.observed_at::date));
$$;
revoke all on function public.issuer_nonpayer_confirmed(text) from public,anon,authenticated;
grant execute on function public.issuer_nonpayer_confirmed(text) to service_role;

alter function public.international_queue_health() rename to international_queue_health_snapshot;
create function public.international_queue_health() returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare result jsonb;q jsonb;queues jsonb:='[]';stats jsonb;used integer;cap integer;
begin
 result:=public.international_queue_health_snapshot();
 for q in select value from jsonb_array_elements(result->'queues') loop
  if q->>'queue' in('alpha_vantage','marketstack') then
   select jsonb_build_object('never_attempted',count(*) filter(where last_attempt_at is null),
    'coverage_gaps',count(*) filter(where last_error in('provider_calendar_unavailable','provider_precision_limited','provider_precision_unavailable') and not public.issuer_nonpayer_confirmed(t.ticker)),
    'confirmed_no_dividends',count(*) filter(where public.issuer_nonpayer_confirmed(t.ticker)),
    'oldest_unattempted',min(next_sync_at) filter(where last_attempt_at is null)) into stats from public.dividend_provider_tasks t where provider=q->>'queue';
   select coalesce(sum(requests),0) into used from public.dividend_provider_usage where provider=q->>'queue' and usage_day=current_date;
   cap:=case when q->>'queue'='alpha_vantage' then 20 else 16 end;
   q:=q||stats||jsonb_build_object('global_daily_remaining',greatest(0,cap-used),'budget_exhausted',used>=cap,
    'stale',coalesce((q->>'stale')::boolean,false) and used<cap);
  end if;
  queues:=queues||jsonb_build_array(q);
 end loop;
 return result||jsonb_build_object('queues',queues);
end $$;
revoke all on function public.international_queue_health() from public,anon,authenticated;
grant execute on function public.international_queue_health() to service_role;
-- The independent fallback may poll more often, but atomic quotas still bound HTTP.
select cron.alter_job(job_id:=jobid,schedule:='11,31,51 * * * *') from cron.job where jobname='international-provider-fallback';

-- Finish the first catalog pass before repeating assets; age eventually overrides holding priority.
create or replace function public.claim_dividend_provider(p_provider text) returns setof public.dividend_provider_tasks
language plpgsql security invoker set search_path=public,pg_temp as $$
declare task public.dividend_provider_tasks;used_day integer;used_month integer;
begin
 if p_provider is null or p_provider not in ('alpha_vantage','marketstack') then raise exception 'Invalid provider';end if;
 perform pg_advisory_xact_lock(hashtextextended('dividend-provider:'||p_provider,0));
 select coalesce(sum(requests),0),coalesce(sum(requests) filter(where usage_day=current_date),0) into used_month,used_day
 from public.dividend_provider_usage where provider=p_provider and usage_day>=date_trunc('month',current_date)::date;
 -- Leave headroom below the free plan (25/day and 100/month); no retries consume unreserved quota.
 if (p_provider='alpha_vantage' and used_day>=20) or (p_provider='marketstack' and used_day>=16) then return;end if;
 insert into public.dividend_provider_tasks(provider,ticker)
 select p_provider,ticker from public.assets where active and type='stock_us' and currency='USD' and ticker ~ '^[A-Z][A-Z0-9.-]{0,9}$'
 on conflict do nothing;
 select t.* into task from public.dividend_provider_tasks t join public.assets a using(ticker)
 where t.provider=p_provider and t.next_sync_at<=now() and a.active and a.type='stock_us' and a.currency='USD'
 and not public.issuer_nonpayer_confirmed(t.ticker)
 order by (t.last_attempt_at is null) desc,
 (t.last_attempt_at<now()-interval '4 days') desc nulls last,exists(select 1 from public.positions p where p.ticker=t.ticker and p.quantity>0) desc,
 exists(select 1 from public.dividends d where d.ticker=t.ticker and d.source not in ('seed','synthetic') and d.ex_date>=current_date-366 and d.payment_date is null) desc,
 exists(select 1 from public.sec_dividend_announcements s where s.ticker=t.ticker and s.confirmed_ex_date is null and s.payment_date>=current_date) desc,
 t.next_sync_at,t.ticker for update of t skip locked limit 1;
 if not found then return;end if;
 update public.dividend_provider_tasks set claim_token=gen_random_uuid(),next_sync_at=now()+interval '10 minutes' where provider=p_provider and ticker=task.ticker returning * into task;
 insert into public.dividend_provider_usage(provider,usage_day,requests) values(p_provider,current_date,1)
 on conflict(provider,usage_day) do update set requests=dividend_provider_usage.requests+1;
 return next task;
end $$;

-- 47 assets cannot refresh every day with a 20/day budget; a 72h cycle fits.
create or replace function public.finish_dividend_provider_observations(p_provider text,p_ticker text,p_claim_token uuid,p_events jsonb,p_error text) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare task public.dividend_provider_tasks;e jsonb;ex date;declared date;rec date;pay date;amount numeric;
 old public.dividend_provider_events;conflicts integer:=0;observations integer:=0;reconciled integer:=0;n integer;failure text:=p_error;
begin
 select * into task from public.dividend_provider_tasks where provider=p_provider and ticker=p_ticker for update;
 if not found or p_claim_token is null or task.claim_token is distinct from p_claim_token or task.next_sync_at<=now() then raise exception 'Provider lease unavailable';end if;
 if jsonb_typeof(p_events) is distinct from 'array' or jsonb_array_length(p_events)>100
 or (p_error is not null and (p_error !~ '^provider_[a-z_]{1,60}$' or jsonb_array_length(p_events)<>0)) then raise exception 'Invalid provider result';end if;
 if p_error is null then
  if jsonb_array_length(p_events)=0 then raise exception 'Empty provider calendar';end if;
  if not exists(select 1 from public.assets where ticker=p_ticker and active and type='stock_us' and currency='USD') then raise exception 'Invalid provider asset';end if;
  perform pg_advisory_xact_lock(hashtextextended('dividend-provider-ticker:'||p_ticker,0));
  for e in select value from jsonb_array_elements(p_events) loop
   ex:=(e->>'ex_date')::date;declared:=(e->>'declaration_date')::date;rec:=(e->>'record_date')::date;pay:=(e->>'payment_date')::date;amount:=(e->>'value_per_share')::numeric;
   if ex is null or declared is null or rec is null or pay is null or amount is null or amount<=0 or amount>=1e12 or amount::text in ('NaN','Infinity','-Infinity') or amount<>trunc(amount,8)
    or declared>current_date or declared>ex or ex>rec or rec>pay or pay-ex>366 or ex<current_date-366 or ex>current_date+366 then raise exception 'Invalid provider event';end if;
   select * into old from public.dividend_provider_events where provider=p_provider and ticker=p_ticker and ex_date=ex;
   if found and (old.declaration_date<>declared or old.record_date<>rec or old.payment_date<>pay or old.value_per_share<>amount) then conflicts:=conflicts+1;continue;end if;
   -- Disagreement between vendors is visible, never last-writer-wins.
   if exists(select 1 from public.dividend_provider_events d where d.ticker=p_ticker and d.provider<>p_provider and
    ((d.ex_date=ex and (d.declaration_date<>declared or d.record_date<>rec or d.payment_date<>pay or d.value_per_share<>amount)) or
     (d.payment_date=pay and d.value_per_share=amount and d.ex_date<>ex))
    and not exists(select 1 from public.issuer_dividend_reconciliations primary_event
     where primary_event.ticker=p_ticker and primary_event.ex_date=ex
      and primary_event.declaration_date=declared and primary_event.record_date=rec and primary_event.payment_date=pay
      and primary_event.value_per_share=amount and d.ex_date=ex and d.declaration_date=declared
      and d.record_date=rec and d.payment_date=pay and d.value_per_share>0
      and scale(trim_scale(d.value_per_share))<8
      and d.value_per_share=round(amount,scale(trim_scale(d.value_per_share))))) then conflicts:=conflicts+1;continue;end if;
   insert into public.dividend_provider_events(provider,ticker,ex_date,declaration_date,record_date,payment_date,value_per_share)
    values(p_provider,p_ticker,ex,declared,rec,pay,amount) on conflict do nothing;
   get diagnostics n=row_count;observations:=observations+n;
   if exists(select 1 from public.sec_dividend_announcements s where s.ticker=p_ticker and s.declaration_date=declared and s.record_date=rec and s.payment_date=pay and s.value_per_share=amount and s.confirmed_ex_date is not null and s.confirmed_ex_date<>ex) then conflicts:=conflicts+1;continue;end if;
   update public.sec_dividend_announcements s set confirmed_ex_date=ex,ex_date_provider=p_provider
    where s.ticker=p_ticker and s.declaration_date=declared and s.record_date=rec and s.payment_date=pay and s.value_per_share=amount and s.confirmed_ex_date is null;
   get diagnostics n=row_count;reconciled:=reconciled+n;
   -- Only complete existing public records. Unclassified or special events never enter the recurring DY/Bazin table.
   if exists(select 1 from public.sec_dividend_announcements s where s.ticker=p_ticker and s.payment_date=pay and s.distribution='special') then continue;end if;
   if exists(select 1 from public.dividends d where d.ticker=p_ticker and d.type='dividend' and d.source not in('seed','synthetic') and
    ((d.ex_date=ex and (d.value_per_share<>amount or (d.record_date is not null and d.record_date<>rec) or (d.payment_date is not null and d.payment_date<>pay))) or
     (d.payment_date=pay and d.ex_date<>ex))) then conflicts:=conflicts+1;continue;end if;
   update public.dividends d set record_date=rec,payment_date=pay,source=p_provider,
    source_url=case when p_provider='alpha_vantage' then 'https://www.alphavantage.co/documentation/#dividends' else 'https://marketstack.com/documentation' end
    where d.ticker=p_ticker and d.type='dividend' and d.source='yahoo' and d.ex_date=ex and d.value_per_share=amount and (d.payment_date is null or d.record_date is null);
  end loop;
  if conflicts>0 then failure:='provider_event_conflict';end if;
 end if;
 update public.dividend_provider_tasks set claim_token=null,last_attempt_at=now(),last_error=failure,
 last_success_at=case when failure is null then now() else last_success_at end,
 next_sync_at=case when failure='provider_keys_unavailable' then date_trunc('day',now())+interval '1 day'
 else now()+case when p_provider='marketstack' then interval '7 days' else interval '72 hours' end end where provider=p_provider and ticker=p_ticker;
 return jsonb_build_object('observations',observations,'reconciled',reconciled,'conflicts',conflicts,'error',failure,'received_income_created',0);
end $$;

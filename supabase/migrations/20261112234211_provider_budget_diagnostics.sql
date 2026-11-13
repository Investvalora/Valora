-- Backend-only aggregate budget state; never stores keys or their fingerprints.
create table public.dividend_provider_budget_status (
 provider text primary key check(provider='marketstack'),checked_at timestamptz not null,
 usage_day date not null,configured_keys integer not null check(configured_keys between 1 and 8),
 available_keys integer not null check(available_keys between 0 and configured_keys),
 remaining_requests integer not null check(remaining_requests between 0 and 16),next_retry_at timestamptz
);
alter table public.dividend_provider_budget_status enable row level security;
revoke all on public.dividend_provider_budget_status from public,anon,authenticated;
grant select,insert,update on public.dividend_provider_budget_status to service_role;

create or replace function public.marketstack_budget_available(p_key_ids text[]) returns boolean
language plpgsql security invoker set search_path=public,pg_temp as $$
declare available integer;remaining integer;next_retry timestamptz;
begin
 if p_key_ids is null or cardinality(p_key_ids) not between 1 and 8
 or exists(select 1 from unnest(p_key_ids) k where k is null or k !~ '^[a-f0-9]{64}$')
 or (select count(distinct k) from unnest(p_key_ids) k)<>cardinality(p_key_ids) then raise exception 'Invalid key identifiers';end if;
 with budgets as (
  select id,coalesce((select sum(requests) from public.marketstack_key_usage where key_id=id and usage_day=current_date),0) used_day,
   coalesce((select sum(requests) from public.marketstack_key_usage where key_id=id and usage_day>=date_trunc('month',current_date)::date),0) used_month,
   (select blocked_until from public.marketstack_key_state where key_id=id and blocked_until>now()) blocked
  from unnest(p_key_ids) id
 ), states as (
  select case when blocked is not null then 0 else greatest(0,least(2-used_day,80-used_month)) end free,
   greatest(coalesce(blocked,now()),case when used_month>=80 then date_trunc('month',now())+interval '1 month'
    when used_day>=2 then date_trunc('day',now())+interval '1 day' else now() end) retry from budgets
 ) select count(*) filter(where free>0),coalesce(sum(free),0),min(retry) into available,remaining,next_retry from states;
 insert into public.dividend_provider_budget_status values('marketstack',now(),current_date,cardinality(p_key_ids),available,remaining,next_retry)
 on conflict(provider) do update set checked_at=excluded.checked_at,usage_day=excluded.usage_day,configured_keys=excluded.configured_keys,
 available_keys=excluded.available_keys,remaining_requests=excluded.remaining_requests,next_retry_at=excluded.next_retry_at;
 return available>0;
end $$;

create function public.provider_primary_recheck_due(p_ticker text,p_attempt timestamptz,p_error text) returns boolean
language sql security invoker set search_path=public,pg_temp as $$
 select coalesce(p_error='provider_event_conflict' and p_attempt is not null and exists(
  select 1 from public.issuer_dividend_reconciliations r where r.ticker=p_ticker and r.observed_at>p_attempt),false);
$$;
revoke all on function public.provider_primary_recheck_due(text,timestamptz,text) from public,anon,authenticated;
grant execute on function public.provider_primary_recheck_due(text,timestamptz,text) to service_role;

-- One primary-evidence-triggered retry, still atomically reserved within existing quota.
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
 where t.provider=p_provider and (t.next_sync_at<=now() or public.provider_primary_recheck_due(t.ticker,t.last_attempt_at,t.last_error)) and (t.claim_token is null or t.next_sync_at<=now()) and a.active and a.type='stock_us' and a.currency='USD'
 and not public.issuer_nonpayer_confirmed(t.ticker)
 order by public.provider_primary_recheck_due(t.ticker,t.last_attempt_at,t.last_error) desc,(t.last_attempt_at is null) desc,
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


alter function public.international_queue_health() rename to international_queue_health_primary_snapshot;
create function public.international_queue_health() returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare result jsonb;q jsonb;queues jsonb:='[]';budget public.dividend_provider_budget_status;fresh boolean;
begin
 result:=public.international_queue_health_primary_snapshot();
 select * into budget from public.dividend_provider_budget_status where provider='marketstack';
 fresh:=coalesce(budget.checked_at>=now()-interval '90 minutes' and budget.usage_day=current_date,false);
 for q in select value from jsonb_array_elements(result->'queues') loop
  if q->>'queue'='marketstack' then
   q:=q||jsonb_build_object('key_budget_known',fresh,'global_budget_exhausted',q->'budget_exhausted');
   if fresh then q:=q||jsonb_build_object('configured_keys',budget.configured_keys,'available_keys',budget.available_keys,
    'key_daily_remaining',budget.remaining_requests,'key_budget_checked_at',budget.checked_at,'next_key_retry_at',budget.next_retry_at,
    'key_budget_exhausted',budget.remaining_requests=0,
    'effective_daily_remaining',least((q->>'global_daily_remaining')::integer,budget.remaining_requests),
    'budget_exhausted',coalesce((q->>'budget_exhausted')::boolean,false) or budget.remaining_requests=0,
    'stale',coalesce((q->>'stale')::boolean,false) and budget.remaining_requests>0);end if;
  end if;
  queues:=queues||jsonb_build_array(q);
 end loop;
 return result||jsonb_build_object('queues',queues,'policy_expirations',(
  select coalesce(jsonb_agg(jsonb_build_object('ticker',ticker,'valid_until',valid_until,
   'expired',valid_until<=now(),'renewal_due',valid_until<=now()+interval '7 days')),'[]'::jsonb)
  from public.issuer_dividend_policies));
end $$;
revoke all on function public.international_queue_health() from public,anon,authenticated;
grant execute on function public.international_queue_health() to service_role;

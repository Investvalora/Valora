-- Register opaque identifiers only. Existing daily usage is never reset.
create table public.alpha_key_pool(key_id text primary key check(key_id ~ '^[a-f0-9]{64}$'),checked_at timestamptz not null default now());
alter table public.alpha_key_pool enable row level security;
revoke all on public.alpha_key_pool from public,anon,authenticated;
grant select,insert,update,delete on public.alpha_key_pool to service_role;
create function public.configure_alpha_pool(p_key_ids text[]) returns void
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if p_key_ids is null or cardinality(p_key_ids) not between 1 and 8
 or exists(select 1 from unnest(p_key_ids) k where k is null or k !~ '^[a-f0-9]{64}$')
 or (select count(distinct k) from unnest(p_key_ids) k)<>cardinality(p_key_ids) then raise exception 'Invalid key identifiers';end if;
 perform pg_advisory_xact_lock(hashtextextended('dividend-provider:alpha_vantage',0));
 delete from public.alpha_key_pool where not(key_id=any(p_key_ids));
 insert into public.alpha_key_pool select k,now() from unnest(p_key_ids) k on conflict(key_id) do update set checked_at=excluded.checked_at;
end $$;
create function public.alpha_budget_available() returns boolean
language sql security invoker set search_path=public,pg_temp as $$
 select exists(select 1 from public.alpha_key_pool p where p.checked_at>now()-interval '90 minutes'
 and not exists(select 1 from public.alpha_key_state s where s.key_id=p.key_id and s.blocked_until>now())
 and coalesce((select u.requests from public.alpha_key_usage u where u.key_id=p.key_id and u.usage_day=current_date),0)<20)
 and coalesce((select requests from public.dividend_provider_usage where provider='alpha_vantage' and usage_day=current_date),0)<160;
$$;
create or replace function public.claim_alpha_provider(p_key_ids text[]) returns setof public.dividend_provider_tasks
language plpgsql security invoker set search_path=public,pg_temp as $$
declare task public.dividend_provider_tasks;p_provider text:='alpha_vantage';
begin
 perform public.configure_alpha_pool(p_key_ids);
 if not public.alpha_budget_available() then return;end if;
 insert into public.dividend_provider_tasks(provider,ticker)
 select p_provider,ticker from public.assets where active and type='stock_us' and currency='USD' and ticker ~ '^[A-Z][A-Z0-9.-]{0,9}$'
 on conflict do nothing;
 select t.* into task from public.dividend_provider_tasks t join public.assets a using(ticker)
 where t.provider=p_provider and (t.next_sync_at<=now() or public.provider_recheck_due(t.provider,t.ticker,t.last_attempt_at,t.last_error)) and (t.claim_token is null or t.next_sync_at<=now()) and a.active and a.type='stock_us' and a.currency='USD'
 and not public.issuer_nonpayer_confirmed(t.ticker)
 order by public.provider_recheck_due(t.provider,t.ticker,t.last_attempt_at,t.last_error) desc,(t.last_attempt_at is null) desc,
 (t.last_attempt_at<now()-interval '4 days') desc nulls last,exists(select 1 from public.positions p where p.ticker=t.ticker and p.quantity>0) desc,
 exists(select 1 from public.dividends d where d.ticker=t.ticker and d.source not in ('seed','synthetic') and d.ex_date>=current_date-366 and d.payment_date is null) desc,
 exists(select 1 from public.sec_dividend_announcements s where s.ticker=t.ticker and s.confirmed_ex_date is null and s.payment_date>=current_date) desc,
 t.next_sync_at,t.ticker for update of t skip locked limit 1;
 if not found then return;end if;
 update public.dividend_provider_tasks set claim_token=gen_random_uuid(),next_sync_at=now()+interval '10 minutes' where provider=p_provider and ticker=task.ticker returning * into task;
 return next task;
end $$;

create or replace function public.reserve_alpha_key(p_key_ids text[],p_ticker text,p_claim_token uuid) returns text
language plpgsql security invoker set search_path=public,pg_temp as $$
declare task public.dividend_provider_tasks;lease public.alpha_key_leases;id text;is_retry boolean;
begin
 perform public.configure_alpha_pool(p_key_ids);
 select * into task from public.dividend_provider_tasks where provider='alpha_vantage' and ticker=p_ticker for update;
 if not found or p_claim_token is null or task.claim_token is distinct from p_claim_token or task.next_sync_at<=now() then raise exception 'Provider lease unavailable';end if;
 if not public.alpha_budget_available() then return null;end if;
 select * into lease from public.alpha_key_leases where ticker=p_ticker;
 is_retry:=coalesce(lease.claim_token=p_claim_token,false);
 foreach id in array p_key_ids loop
  if is_retry and id=any(lease.attempted_keys) then continue;end if;
  if exists(select 1 from public.alpha_key_state where key_id=id and blocked_until>now()) then continue;end if;
  if coalesce((select requests from public.alpha_key_usage where key_id=id and usage_day=current_date),0)>=20 then continue;end if;
  insert into public.alpha_key_usage values(id,current_date,1) on conflict(key_id,usage_day) do update set requests=alpha_key_usage.requests+1;
  insert into public.dividend_provider_usage values('alpha_vantage',current_date,1) on conflict(provider,usage_day) do update set requests=dividend_provider_usage.requests+1;
  insert into public.alpha_key_leases values(p_ticker,p_claim_token,array[id]) on conflict(ticker) do update
   set claim_token=excluded.claim_token,attempted_keys=case when is_retry then alpha_key_leases.attempted_keys||id else array[id] end;
  return id;
 end loop;
 return null;
end $$;

alter function public.international_queue_health() rename to international_queue_health_before_alpha_pool;
create function public.international_queue_health() returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare result jsonb;q jsonb;queues jsonb:='[]';configured integer;available integer;remaining integer;used integer;fresh boolean;
begin
 result:=public.international_queue_health_before_alpha_pool();
 select count(*),coalesce(bool_and(checked_at>now()-interval '90 minutes'),false) into configured,fresh from public.alpha_key_pool;
 select count(*) filter(where free>0),coalesce(sum(free),0) into available,remaining from (
  select case when exists(select 1 from public.alpha_key_state s where s.key_id=p.key_id and s.blocked_until>now()) then 0
   else greatest(0,20-coalesce((select requests from public.alpha_key_usage u where u.key_id=p.key_id and usage_day=current_date),0)) end free from public.alpha_key_pool p) b;
 select coalesce(sum(requests),0) into used from public.dividend_provider_usage where provider='alpha_vantage' and usage_day=current_date;
 for q in select value from jsonb_array_elements(result->'queues') loop
  if q->>'queue'='alpha_vantage' then
   q:=q||jsonb_build_object('key_budget_known',fresh,'configured_keys',configured,'available_keys',available,'per_key_daily_limit',20,
    'global_safety_limit',160,'global_daily_remaining',greatest(0,160-used),'key_daily_remaining',remaining,
    'effective_daily_remaining',case when fresh then least(remaining,greatest(0,160-used)) else null end,
    'budget_exhausted',case when fresh then remaining=0 or used>=160 else null end,
    'key_budget_exhausted',case when fresh then remaining=0 else null end,
    'stale',coalesce((q->>'due')::integer,0)>0 and (q->>'last_attempt' is null or (q->>'last_attempt')::timestamptz<now()-interval '90 minutes')
     and (not fresh or (remaining>0 and used<160)));
  end if;
  queues:=queues||jsonb_build_array(q);
 end loop;
 return result||jsonb_build_object('queues',queues);
end $$;
revoke all on function public.configure_alpha_pool(text[]),public.alpha_budget_available(),public.claim_alpha_provider(text[]),public.reserve_alpha_key(text[],text,uuid),public.international_queue_health(),public.international_queue_health_before_alpha_pool() from public,anon,authenticated;
grant execute on function public.configure_alpha_pool(text[]),public.alpha_budget_available(),public.claim_alpha_provider(text[]),public.reserve_alpha_key(text[],text,uuid),public.international_queue_health(),public.international_queue_health_before_alpha_pool() to service_role;

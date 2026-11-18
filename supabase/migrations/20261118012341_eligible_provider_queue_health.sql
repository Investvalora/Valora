-- Report structurally eligible work; budget availability remains a separate field.
-- Keep the raw overdue count
-- separately so dated nonpayer policies and inactive assets remain auditable.
alter function public.international_queue_health() rename to international_queue_health_before_eligibility;
create function public.international_queue_health() returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare result jsonb;q jsonb;queues jsonb:='[]';stats jsonb;oldest timestamptz;attempt timestamptz;n integer;
begin
 result:=public.international_queue_health_before_eligibility();
 for q in select value from jsonb_array_elements(result->'queues') loop
  if q->>'queue' in('alpha_vantage','marketstack') then
   select count(*),min(case when t.next_sync_at<=now() then t.next_sync_at else now() end)
   into n,oldest
   from public.dividend_provider_tasks t join public.assets a using(ticker)
   where t.provider=q->>'queue' and a.active and a.type='stock_us' and a.currency='USD'
    and a.ticker ~ '^[A-Z][A-Z0-9.-]{0,9}$' and not public.issuer_nonpayer_confirmed(t.ticker)
    and (t.next_sync_at<=now() or public.provider_recheck_due(t.provider,t.ticker,t.last_attempt_at,t.last_error))
    and (t.claim_token is null or t.next_sync_at<=now());
   select max(t.last_attempt_at) into attempt from public.dividend_provider_tasks t join public.assets a using(ticker)
    where t.provider=q->>'queue' and a.active and a.type='stock_us' and a.currency='USD'
    and a.ticker ~ '^[A-Z][A-Z0-9.-]{0,9}$' and not public.issuer_nonpayer_confirmed(t.ticker);
   stats:=jsonb_build_object('scheduled_due',q->'due','due',n,'oldest_due',oldest,
    'oldest_due_age_seconds',case when oldest is null then null else greatest(0,floor(extract(epoch from now()-oldest))) end,
    'backlog_overdue',coalesce(oldest<now()-interval '90 minutes',false),
    'stale',n>0 and (attempt is null or attempt<now()-interval '90 minutes') and not coalesce((q->>'budget_exhausted')::boolean,false));
   q:=q||stats;
  else
   oldest:=(q->>'oldest_due')::timestamptz;
   q:=q||jsonb_build_object('oldest_due_age_seconds',case when oldest is null then null else greatest(0,floor(extract(epoch from now()-oldest))) end,
     'backlog_overdue',coalesce(oldest<now()-interval '90 minutes',false));
  end if;
  queues:=queues||jsonb_build_array(q);
 end loop;
 return result||jsonb_build_object('queues',queues);
end $$;
revoke all on function public.international_queue_health(),public.international_queue_health_before_eligibility() from public,anon,authenticated;
grant execute on function public.international_queue_health(),public.international_queue_health_before_eligibility() to service_role;

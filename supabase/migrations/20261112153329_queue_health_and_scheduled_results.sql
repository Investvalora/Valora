-- Durable evidence, independent of pg_net's short response retention.
create table public.operational_job_runs (
 id uuid primary key,job text not null check(job in('sync-macro-rates','international-providers')),
 started_at timestamptz not null default now(),finished_at timestamptz,
 status text not null check(status in('running','success','partial','failed')),details jsonb not null default '{}',
 check(octet_length(details::text)<=16384),check((status='running')=(finished_at is null))
);
alter table public.operational_job_runs enable row level security;
revoke all on public.operational_job_runs from public,anon,authenticated;
grant select,insert,update on public.operational_job_runs to service_role;
create index operational_jobs_recent on public.operational_job_runs(job,started_at desc);

create function public.international_queue_health() returns jsonb
language sql security invoker set search_path=public,pg_temp as $$
 select jsonb_build_object('checked_at',now(),
 'queues',(select jsonb_agg(to_jsonb(s)||jsonb_build_object('stale',s.due>0 and (s.last_attempt is null or s.last_attempt<now()-interval '90 minutes'))) from (
  select 'primary' as queue,count(*) as total,count(*) filter(where next_sync_at<=now()) as due,
   min(next_sync_at) filter(where next_sync_at<=now()) as oldest_due,max(last_attempt_at) as last_attempt,
   max(last_success_at) as last_success,count(*) filter(where last_error is not null) as errors from public.international_announcement_tasks
  union all select 'sec',count(*),count(*) filter(where next_sync_at<=now()),min(next_sync_at) filter(where next_sync_at<=now()),max(last_attempt_at),max(last_success_at),count(*) filter(where last_error is not null) from public.sec_dividend_tasks
  union all select provider,count(*),count(*) filter(where next_sync_at<=now()),min(next_sync_at) filter(where next_sync_at<=now()),max(last_attempt_at),max(last_success_at),count(*) filter(where last_error is not null) from public.dividend_provider_tasks group by provider
 )s),'provider_usage',(select jsonb_agg(s) from(select provider,requests from public.dividend_provider_usage where usage_day=current_date)s),
 'macro',(select jsonb_build_object('status',status,'started_at',started_at,'finished_at',finished_at,'updated',details->'updated','error_count',jsonb_array_length(coalesce(details->'calculation_errors','[]'::jsonb)),'incomplete',status='running' and started_at<now()-interval '10 minutes') from public.operational_job_runs where job='sync-macro-rates' order by started_at desc limit 1),
 'provider_run',(select jsonb_build_object('status',status,'started_at',started_at,'finished_at',finished_at,'delayed',started_at<now()-interval '2 hours','incomplete',status='running' and started_at<now()-interval '10 minutes') from public.operational_job_runs where job='international-providers' order by started_at desc limit 1));
$$;
revoke all on function public.international_queue_health() from public,anon,authenticated;
grant execute on function public.international_queue_health() to service_role;

-- Prioritize held assets and missing calendars without restricting catalog coverage.
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
 order by exists(select 1 from public.positions p where p.ticker=t.ticker and p.quantity>0) desc,
 exists(select 1 from public.dividends d where d.ticker=t.ticker and d.source not in ('seed','synthetic') and d.ex_date>=current_date-366 and d.payment_date is null) desc,
 exists(select 1 from public.sec_dividend_announcements s where s.ticker=t.ticker and s.confirmed_ex_date is null and s.payment_date>=current_date) desc,
 t.next_sync_at,t.ticker for update of t skip locked limit 1;
 if not found then return;end if;
 update public.dividend_provider_tasks set claim_token=gen_random_uuid(),next_sync_at=now()+interval '10 minutes' where provider=p_provider and ticker=task.ticker returning * into task;
 insert into public.dividend_provider_usage(provider,usage_day,requests) values(p_provider,current_date,1)
 on conflict(provider,usage_day) do update set requests=dividend_provider_usage.requests+1;
 return next task;
end $$;


-- Independent of GitHub scheduling; same atomic quotas and leases prevent duplicate collection.
select cron.schedule('international-provider-fallback','11 * * * *',$job$
 select net.http_post(
  url:=(select decrypted_secret from vault.decrypted_secrets where name='project_url')||'/functions/v1/sync-international-announcements',
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='service_role_key')),
  body:='{"mode":"providers"}'::jsonb,timeout_milliseconds:=90000
 );
$job$);

create function public.marketstack_budget_available(p_key_ids text[]) returns boolean
language sql security invoker set search_path=public,pg_temp as $$
 select coalesce(cardinality(p_key_ids) between 1 and 8 and not exists(select 1 from unnest(p_key_ids) id where id is null or id !~ '^[a-f0-9]{64}$') and exists(
  select 1 from unnest(p_key_ids) id where not exists(select 1 from public.marketstack_key_state s where s.key_id=id and s.blocked_until>now())
   and (select coalesce(sum(requests),0) from public.marketstack_key_usage u where u.key_id=id and usage_day=current_date)<2
   and (select coalesce(sum(requests),0) from public.marketstack_key_usage u where u.key_id=id and usage_day>=date_trunc('month',current_date)::date)<80
 ),false);
$$;
revoke all on function public.marketstack_budget_available(text[]) from public,anon,authenticated;
grant execute on function public.marketstack_budget_available(text[]) to service_role;

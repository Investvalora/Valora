-- New structured sources remain private evidence until matched to an official
-- announcement. Never merge source IDs or create personal cash receipts.
create table public.supplemental_dividend_tasks (
 provider text not null check(provider in('massive','alpaca')),ticker text not null references public.assets(ticker) on delete cascade,
 claim_token uuid,next_sync_at timestamptz not null default now(),last_attempt_at timestamptz,last_success_at timestamptz,last_error text,
 primary key(provider,ticker)
);
create table public.supplemental_dividend_usage (
 provider text not null check(provider in('massive','alpaca')),usage_day date not null,requests integer not null default 0 check(requests>=0),last_reserved_at timestamptz,
 blocked_until timestamptz,primary key(provider,usage_day)
);
create table public.supplemental_dividend_observations (
 provider text not null check(provider in('massive','alpaca')),ticker text not null references public.assets(ticker),
 event_id text not null check(event_id ~ '^[A-Za-z0-9_-]{1,180}$'),snapshot_hash text not null,
 ex_date date,record_date date,payment_date date,declaration_date date,currency text check(currency ~ '^[A-Z]{3}$'),
 value_per_share numeric(20,8) not null check(value_per_share>0 and value_per_share<1e12),
 distribution text not null check(distribution in('recurring','special','supplemental','irregular','unknown')),
 observed_at timestamptz not null default now(),
 primary key(provider,ticker,event_id,snapshot_hash)
);
create index supplemental_dividend_pending on public.supplemental_dividend_tasks(provider,next_sync_at);
alter table public.supplemental_dividend_tasks enable row level security;
alter table public.supplemental_dividend_usage enable row level security;
alter table public.supplemental_dividend_observations enable row level security;
revoke all on public.supplemental_dividend_tasks,public.supplemental_dividend_usage,public.supplemental_dividend_observations from public,anon,authenticated;
grant select,insert,update on public.supplemental_dividend_tasks,public.supplemental_dividend_usage to service_role;
grant select,insert on public.supplemental_dividend_observations to service_role;

create function public.claim_supplemental_dividends(p_provider text) returns setof public.supplemental_dividend_tasks
language plpgsql security invoker set search_path=public,pg_temp as $$
declare u public.supplemental_dividend_usage;t public.supplemental_dividend_tasks;
begin
 if p_provider is null or p_provider not in('massive','alpaca') then raise exception 'Invalid supplemental provider';end if;
 perform pg_advisory_xact_lock(hashtextextended('supplemental-dividend:'||p_provider,0));
 insert into public.supplemental_dividend_usage(provider,usage_day) values(p_provider,(now() at time zone 'UTC')::date) on conflict do nothing;
 select * into u from public.supplemental_dividend_usage where provider=p_provider and usage_day=(now() at time zone 'UTC')::date for update;
 -- Conservative one request/minute and 40/day; no key rotation or quota bypass.
 if u.requests>=40 or u.last_reserved_at>now()-interval '1 minute' or exists(select 1 from public.supplemental_dividend_usage b where b.provider=p_provider and b.blocked_until>now()) then return;end if;
 insert into public.supplemental_dividend_tasks(provider,ticker)
 select p_provider,a.ticker from public.assets a where a.active and a.type in('stock_us','etf_us','reit') and a.currency='USD'
 and exists(select 1 from public.positions p where p.ticker=a.ticker and p.quantity>0) on conflict do nothing;
 select q.* into t from public.supplemental_dividend_tasks q join public.assets a on a.ticker=q.ticker
 where q.provider=p_provider and q.next_sync_at<=now() and a.active and a.currency='USD' and a.type in('stock_us','etf_us','reit')
 and exists(select 1 from public.positions p where p.ticker=q.ticker and p.quantity>0)
 order by (q.last_attempt_at is not null),q.next_sync_at,q.ticker for update of q skip locked limit 1;
 if not found then return;end if;
 update public.supplemental_dividend_usage set requests=requests+1,last_reserved_at=now() where provider=p_provider and usage_day=u.usage_day;
 update public.supplemental_dividend_tasks set claim_token=gen_random_uuid(),next_sync_at=now()+interval '10 minutes' where provider=p_provider and ticker=t.ticker returning * into t;
 return next t;
end $$;

create function public.finish_supplemental_dividends(p_provider text,p_ticker text,p_claim_token uuid,p_events jsonb,p_error text,p_partial boolean) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare t public.supplemental_dividend_tasks;e jsonb;ex date;rec date;pay date;decl date;amount numeric;cur text;kind text;eid text;h text;n integer:=0;failure text:=p_error;
begin
 select * into t from public.supplemental_dividend_tasks where provider=p_provider and ticker=p_ticker for update;
 if not found or p_claim_token is null or t.claim_token is distinct from p_claim_token or t.next_sync_at<=now() then raise exception 'Supplemental lease unavailable';end if;
 if p_partial is null or jsonb_typeof(p_events) is distinct from 'array' or jsonb_array_length(p_events)>100
 or (p_error is not null and (p_error !~ '^supplemental_[a-z_]{1,60}$' or jsonb_array_length(p_events)<>0)) then raise exception 'Invalid supplemental result';end if;
 for e in select value from jsonb_array_elements(p_events) loop
  if e->>'ticker' is distinct from p_ticker then raise exception 'Supplemental identity changed';end if;
  eid:=e->>'event_id';ex:=(e->>'ex_date')::date;rec:=(e->>'record_date')::date;pay:=(e->>'payment_date')::date;decl:=(e->>'declaration_date')::date;
  amount:=(e->>'value_per_share')::numeric;cur:=e->>'currency';kind:=e->>'distribution';
  if eid is null or eid !~ '^[A-Za-z0-9_-]{1,180}$' or amount is null or amount<=0 or amount>=1e12 or amount::text in('NaN','Infinity','-Infinity') or amount<>trunc(amount,8)
   or (cur is not null and cur !~ '^[A-Z]{3}$') or kind is null or kind not in('recurring','special','supplemental','irregular','unknown')
   or decl>current_date or decl>ex or (kind='recurring' and ex>rec) or rec>pay or abs(ex-current_date)>366 then raise exception 'Invalid supplemental event';end if;
  if (select count(*) from jsonb_array_elements(p_events) x where x->>'event_id'=eid)>1 then raise exception 'Duplicate supplemental ID';end if;
  h:=md5(jsonb_build_array(eid,ex,rec,pay,decl,amount,cur,kind)::text);
  insert into public.supplemental_dividend_observations(provider,ticker,event_id,snapshot_hash,ex_date,record_date,payment_date,declaration_date,currency,value_per_share,distribution)
  values(p_provider,p_ticker,eid,h,ex,rec,pay,decl,cur,amount,kind) on conflict do nothing;
  n:=n+1;
 end loop;
 if failure is null then
  if p_partial then failure:='supplemental_truncated';elsif n=0 then failure:='supplemental_calendar_unavailable';
  elsif exists(select 1 from jsonb_array_elements(p_events) x where x->>'ex_date' is null or x->>'record_date' is null or x->>'payment_date' is null or x->>'declaration_date' is null or x->>'currency' is null) then failure:='supplemental_incomplete';end if;
 end if;
 update public.supplemental_dividend_tasks set claim_token=null,last_attempt_at=now(),last_success_at=case when failure is null then now() else last_success_at end,
 last_error=failure,next_sync_at=now()+case when failure='supplemental_rate_limited' then interval '24 hours' else interval '72 hours' end where provider=p_provider and ticker=p_ticker;
 if failure in('supplemental_rate_limited','supplemental_credentials_rejected','supplemental_access_denied') then
  update public.supplemental_dividend_usage set blocked_until=now()+interval '24 hours' where provider=p_provider and usage_day=(now() at time zone 'UTC')::date;
 end if;
 return jsonb_build_object('observations',n,'error',failure,'partial',p_partial,'received_income_created',0);
end $$;

-- Classification is dynamic: a later primary confirmation can resolve an old
-- observation without rewriting its immutable vendor snapshot. Never aggregate
-- across providers, event IDs, payment dates or revisions.
create view public.supplemental_dividend_evidence with(security_invoker=true) as
select o.*,
 case when exists(select 1 from public.supplemental_dividend_observations r where r.provider=o.provider and r.ticker=o.ticker and r.event_id=o.event_id and r.snapshot_hash<>o.snapshot_hash) then 'revision_review'
 when o.ex_date is null or o.record_date is null or o.payment_date is null or o.declaration_date is null or o.currency is null then 'incomplete'
 when o.distribution<>'recurring' then 'distribution_review'
 when exists(select 1 from public.issuer_dividend_reconciliations r where r.ticker=o.ticker and r.ex_date=o.ex_date and r.record_date=o.record_date and r.payment_date=o.payment_date and r.declaration_date=o.declaration_date and r.value_per_share=o.value_per_share and o.currency='USD') then 'official_confirmed'
 when exists(select 1 from public.issuer_dividend_reconciliations r where r.ticker=o.ticker and (r.ex_date=o.ex_date or r.payment_date=o.payment_date)) then 'official_conflict'
 else 'reported_unconfirmed' end as evidence_status
from public.supplemental_dividend_observations o;
revoke all on public.supplemental_dividend_evidence from public,anon,authenticated;
grant select on public.supplemental_dividend_evidence to service_role;
revoke all on function public.claim_supplemental_dividends(text),public.finish_supplemental_dividends(text,text,uuid,jsonb,text,boolean) from public,anon,authenticated;
grant execute on function public.claim_supplemental_dividends(text),public.finish_supplemental_dividends(text,text,uuid,jsonb,text,boolean) to service_role;

create function public.supplemental_dividend_health() returns jsonb language sql security invoker set search_path=public,pg_temp as $$
select jsonb_build_object('queues',(select coalesce(jsonb_agg(x),'[]'::jsonb) from (
 select provider,count(*) total,count(*) filter(where last_attempt_at is null) never_attempted,count(*) filter(where next_sync_at<=now()) due,
 count(*) filter(where last_error is not null) errors,max(last_attempt_at) last_attempt_at from public.supplemental_dividend_tasks group by provider)x),
 'usage',(select coalesce(jsonb_agg(x),'[]'::jsonb) from (select provider,requests,blocked_until from public.supplemental_dividend_usage where usage_day=(now() at time zone 'UTC')::date)x),
 'evidence',(select coalesce(jsonb_agg(x),'[]'::jsonb) from (select provider,evidence_status,count(*) observations from public.supplemental_dividend_evidence group by provider,evidence_status)x));
$$;
revoke all on function public.supplemental_dividend_health() from public,anon,authenticated;
grant execute on function public.supplemental_dividend_health() to service_role;

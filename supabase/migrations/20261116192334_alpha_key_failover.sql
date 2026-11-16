-- Credential failover does not increase the existing global 20/day allowance.
create table public.alpha_key_usage (
 key_id text not null check(key_id ~ '^[a-f0-9]{64}$'),usage_day date not null,requests integer not null check(requests between 1 and 20),primary key(key_id,usage_day)
);
create table public.alpha_key_state (
 key_id text primary key check(key_id ~ '^[a-f0-9]{64}$'),blocked_until timestamptz not null,
 reason text not null check(reason in('provider_quota_exhausted','provider_key_invalid','provider_rate_limited'))
);
create table public.alpha_key_leases (
 ticker text primary key references public.assets(ticker) on delete cascade,claim_token uuid not null,attempted_keys text[] not null
);
alter table public.alpha_key_usage enable row level security;
alter table public.alpha_key_state enable row level security;
alter table public.alpha_key_leases enable row level security;
revoke all on public.alpha_key_usage,public.alpha_key_state,public.alpha_key_leases from public,anon,authenticated;
grant select,insert,update on public.alpha_key_usage,public.alpha_key_state,public.alpha_key_leases to service_role;

create function public.reserve_alpha_key(p_key_ids text[],p_ticker text,p_claim_token uuid) returns text
language plpgsql security invoker set search_path=public,pg_temp as $$
declare task public.dividend_provider_tasks;lease public.alpha_key_leases;id text;used integer;is_retry boolean;
begin
 if p_key_ids is null or cardinality(p_key_ids) not between 1 and 8
 or exists(select 1 from unnest(p_key_ids) k where k is null or k !~ '^[a-f0-9]{64}$')
 or (select count(distinct k) from unnest(p_key_ids) k)<>cardinality(p_key_ids) then raise exception 'Invalid key identifiers';end if;
 perform pg_advisory_xact_lock(hashtextextended('dividend-provider:alpha_vantage',0));
 select * into task from public.dividend_provider_tasks where provider='alpha_vantage' and ticker=p_ticker for update;
 if not found or p_claim_token is null or task.claim_token is distinct from p_claim_token or task.next_sync_at<=now() then raise exception 'Provider lease unavailable';end if;
 select * into lease from public.alpha_key_leases where ticker=p_ticker;
 is_retry:=coalesce(lease.claim_token=p_claim_token,false);
 select coalesce(sum(requests),0) into used from public.dividend_provider_usage where provider='alpha_vantage' and usage_day=current_date;
 -- The first attempt was already reserved by claim_dividend_provider.
 if used=0 or used>20 or (is_retry and used>=20) then return null;end if;
 foreach id in array p_key_ids loop
  if is_retry and id=any(lease.attempted_keys) then continue;end if;
  if exists(select 1 from public.alpha_key_state where key_id=id and blocked_until>now()) then continue;end if;
  if coalesce((select requests from public.alpha_key_usage where key_id=id and usage_day=current_date),0)>=20 then continue;end if;
  insert into public.alpha_key_usage values(id,current_date,1) on conflict(key_id,usage_day) do update set requests=alpha_key_usage.requests+1;
  insert into public.alpha_key_leases values(p_ticker,p_claim_token,array[id]) on conflict(ticker) do update
   set claim_token=excluded.claim_token,attempted_keys=case when is_retry then alpha_key_leases.attempted_keys||id else array[id] end;
  if is_retry then update public.dividend_provider_usage set requests=requests+1 where provider='alpha_vantage' and usage_day=current_date;end if;
  return id;
 end loop;
 return null;
end $$;
create function public.block_alpha_key(p_key_id text,p_reason text) returns void
language plpgsql security invoker set search_path=public,pg_temp as $$
declare until_at timestamptz;
begin
 if p_reason is null or p_reason not in('provider_quota_exhausted','provider_key_invalid','provider_rate_limited')
 or not exists(select 1 from public.alpha_key_usage where key_id=p_key_id and usage_day=current_date) then raise exception 'Invalid key failure';end if;
 until_at:=case p_reason when 'provider_quota_exhausted' then (date_trunc('day',now() at time zone 'UTC')+interval '1 day') at time zone 'UTC'
 when 'provider_key_invalid' then now()+interval '24 hours' else now()+interval '15 minutes' end;
 insert into public.alpha_key_state values(p_key_id,until_at,p_reason) on conflict(key_id) do update
 set blocked_until=greatest(alpha_key_state.blocked_until,excluded.blocked_until),reason=excluded.reason;
end $$;
revoke all on function public.reserve_alpha_key(text[],text,uuid),public.block_alpha_key(text,text) from public,anon,authenticated;
grant execute on function public.reserve_alpha_key(text[],text,uuid),public.block_alpha_key(text,text) to service_role;

create or replace function public.get_dividend_provider_key(p_provider text) returns text
language plpgsql security definer set search_path='' as $$
declare secret_name text;result text;
begin
 if p_provider in('marketstack_keys','alpha_vantage_keys') then
  select string_agg(decrypted_secret,',' order by name) into result from vault.decrypted_secrets
  where (p_provider='marketstack_keys' and (name in('marketstack_keys','marketstack_key') or name ~ '^marketstack_key_[2-8]$'))
   or (p_provider='alpha_vantage_keys' and (name in('alpha_vantage_keys','alpha_vantage_key') or name ~ '^alpha_vantage_key_[2-8]$'));
  return coalesce(result,'');
 end if;
 secret_name:=case p_provider when 'alpha_vantage' then 'alpha_vantage_key' when 'marketstack' then 'marketstack_key' else null end;
 if secret_name is null then raise exception 'Invalid provider';end if;
 select decrypted_secret into result from vault.decrypted_secrets where name=secret_name;
 return coalesce(result,'');
end $$;
revoke all on function public.get_dividend_provider_key(text) from public,anon,authenticated;
grant execute on function public.get_dividend_provider_key(text) to service_role;

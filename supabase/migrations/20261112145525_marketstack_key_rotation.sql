create table public.marketstack_key_usage (
 key_id text not null check(key_id ~ '^[a-f0-9]{64}$'),usage_day date not null,requests integer not null check(requests>0),primary key(key_id,usage_day)
);
create table public.marketstack_key_state (
 key_id text primary key check(key_id ~ '^[a-f0-9]{64}$'),blocked_until timestamptz not null,
 reason text not null check(reason in('provider_quota_exhausted','provider_key_invalid','provider_rate_limited'))
);
alter table public.marketstack_key_usage enable row level security;
alter table public.marketstack_key_state enable row level security;
revoke all on public.marketstack_key_usage,public.marketstack_key_state from public,anon,authenticated;
grant select,insert,update on public.marketstack_key_usage,public.marketstack_key_state to service_role;

create function public.reserve_marketstack_key(p_key_ids text[]) returns text
language plpgsql security invoker set search_path=public,pg_temp as $$
declare id text;used_day integer;used_month integer;
begin
 if p_key_ids is null or cardinality(p_key_ids) not between 1 and 8 or exists(select 1 from unnest(p_key_ids) k where k is null or k !~ '^[a-f0-9]{64}$')
 or (select count(distinct k) from unnest(p_key_ids) k)<>cardinality(p_key_ids) then raise exception 'Invalid key identifiers';end if;
 perform pg_advisory_xact_lock(hashtextextended('marketstack-key-quota',0));
 foreach id in array p_key_ids loop
  if exists(select 1 from public.marketstack_key_state where key_id=id and blocked_until>now()) then continue;end if;
  select coalesce(sum(requests),0),coalesce(sum(requests) filter(where usage_day=current_date),0) into used_month,used_day
   from public.marketstack_key_usage where key_id=id and usage_day>=date_trunc('month',current_date)::date;
  if used_month>=80 or used_day>=2 then continue;end if;
  insert into public.marketstack_key_usage(key_id,usage_day,requests) values(id,current_date,1)
   on conflict(key_id,usage_day) do update set requests=marketstack_key_usage.requests+1;
  return id;
 end loop;
 return null;
end $$;

create function public.block_marketstack_key(p_key_id text,p_reason text) returns void
language plpgsql security invoker set search_path=public,pg_temp as $$
declare until_at timestamptz;
begin
 if p_reason is null or p_reason not in('provider_quota_exhausted','provider_key_invalid','provider_rate_limited')
 or not exists(select 1 from public.marketstack_key_usage where key_id=p_key_id and usage_day=current_date) then raise exception 'Invalid key failure';end if;
 until_at:=case p_reason when 'provider_quota_exhausted' then date_trunc('month',now())+interval '1 month'
 when 'provider_key_invalid' then now()+interval '24 hours' else now()+interval '15 minutes' end;
 insert into public.marketstack_key_state(key_id,blocked_until,reason) values(p_key_id,until_at,p_reason)
 on conflict(key_id) do update set blocked_until=greatest(marketstack_key_state.blocked_until,excluded.blocked_until),reason=excluded.reason;
end $$;
revoke all on function public.reserve_marketstack_key(text[]),public.block_marketstack_key(text,text) from public,anon,authenticated;
grant execute on function public.reserve_marketstack_key(text[]),public.block_marketstack_key(text,text) to service_role;

create or replace function public.get_dividend_provider_key(p_provider text) returns text
language plpgsql security definer set search_path='' as $$
declare secret_name text;result text;
begin
 if p_provider='marketstack_keys' then
  select string_agg(decrypted_secret,',' order by name) into result from vault.decrypted_secrets
   where name in('marketstack_keys','marketstack_key') or name ~ '^marketstack_key_[2-8]$';
  return coalesce(result,'');
 end if;
 secret_name:=case p_provider when 'alpha_vantage' then 'alpha_vantage_key' when 'marketstack' then 'marketstack_key' else null end;
 if secret_name is null then raise exception 'Invalid provider';end if;
 select decrypted_secret into result from vault.decrypted_secrets where name=secret_name;
 return coalesce(result,'');
end $$;
revoke all on function public.get_dividend_provider_key(text) from public,anon,authenticated;
grant execute on function public.get_dividend_provider_key(text) to service_role;

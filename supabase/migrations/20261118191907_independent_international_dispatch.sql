-- Independent clock; GitHub remains the bounded collector/executor.
create table public.international_dispatch_runs (
 id uuid primary key default gen_random_uuid(),slot timestamptz not null unique,
 started_at timestamptz not null default now(),finished_at timestamptz,
 status text not null default 'running' check(status in('running','accepted','rejected','unavailable')),
 http_status integer check(http_status between 100 and 599),
 check((status='running')=(finished_at is null))
);
alter table public.international_dispatch_runs enable row level security;
revoke all on public.international_dispatch_runs from public,anon,authenticated;
grant select,insert,update on public.international_dispatch_runs to service_role;
create function public.reserve_international_dispatch() returns uuid
language plpgsql security invoker set search_path=public,pg_temp as $$
declare result uuid;begin
 insert into public.international_dispatch_runs(slot)
 values(date_trunc('hour',now())+floor(extract(minute from now())/15)*interval '15 minutes')
 on conflict(slot) do nothing returning id into result;
 return result;
end $$;
create function public.finish_international_dispatch(p_id uuid,p_status text,p_http_status integer) returns boolean
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if p_status not in('accepted','rejected','unavailable') then raise exception 'Invalid dispatch status';end if;
 update public.international_dispatch_runs set status=p_status,http_status=p_http_status,finished_at=now()
 where id=p_id and status='running';
 return found;
end $$;
revoke all on function public.reserve_international_dispatch(),public.finish_international_dispatch(uuid,text,integer) from public,anon,authenticated;
grant execute on function public.reserve_international_dispatch(),public.finish_international_dispatch(uuid,text,integer) to service_role;
-- Missing credentials are reported safely by the function; no secret in cron SQL.
select cron.schedule('international-independent-dispatch','4,19,34,49 * * * *',$cron$
 select net.http_post(
  url:=(select decrypted_secret from vault.decrypted_secrets where name='project_url')||'/functions/v1/dispatch-international-collector',
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='service_role_key')),
  body:='{}'::jsonb,timeout_milliseconds:=30000);
$cron$);

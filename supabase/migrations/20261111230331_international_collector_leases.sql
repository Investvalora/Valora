alter table public.international_announcement_tasks add column claim_token uuid;
create or replace function public.claim_international_announcements() returns setof public.international_announcement_tasks
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 insert into public.international_announcement_tasks(ticker)
 select ticker from public.assets where active and type='stock_us' and currency='USD' and ticker ~ '^[A-Z][A-Z0-9.-]{0,9}$'
 on conflict(ticker) do nothing;
 return query update public.international_announcement_tasks j
 set next_sync_at=now()+interval '10 minutes',claim_token=gen_random_uuid()
 where j.ticker in (select s.ticker from public.international_announcement_tasks s join public.assets a using(ticker)
  where a.active and a.type='stock_us' and a.currency='USD' and s.next_sync_at<=now()
  order by s.next_sync_at,s.ticker for update of s skip locked limit 2)
 returning j.*;
end $$;
create function public.finish_international_announcements(p_ticker text,p_claim_token uuid,p_events jsonb,p_error text)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare task public.international_announcement_tasks;result jsonb:=jsonb_build_object('saved',0,'conflicts',0); failure text:=p_error;delay_hours integer;
begin
 select * into task from public.international_announcement_tasks where ticker=p_ticker for update;
 if not found or p_claim_token is null or task.claim_token is distinct from p_claim_token or task.next_sync_at<=now() then raise exception 'Collector lease unavailable';end if;
 if jsonb_typeof(p_events) is distinct from 'array' or jsonb_array_length(p_events)>100
  or (p_error is not null and (p_error !~ '^nasdaq_[a-z0-9_]{1,60}$' or jsonb_array_length(p_events)<>0)) then raise exception 'Invalid collector result';end if;
 if failure is null then
  result:=public.store_international_announcements(p_ticker,p_events);
  if (result->>'conflicts')::integer>0 then failure:='nasdaq_event_conflict';end if;
 end if;
 delay_hours:=case when failure is null then 12 when failure in ('nasdaq_identity_unsupported','nasdaq_unavailable') then 24 else 2 end;
 update public.international_announcement_tasks set claim_token=null,last_attempt_at=now(),last_error=failure,
  last_success_at=case when failure is null then now() else last_success_at end,
  next_sync_at=now()+make_interval(hours=>delay_hours) where ticker=p_ticker;
 return result||jsonb_build_object('error',failure);
end $$;
revoke all on function public.claim_international_announcements(),public.finish_international_announcements(text,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.claim_international_announcements(),public.finish_international_announcements(text,uuid,jsonb,text) to service_role;
-- Collection now runs on a standard Node GitHub runner, not on Edge network.
select cron.alter_job(job_id:=jobid,active:=false) from cron.job where jobname='sync-international-announcements';

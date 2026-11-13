-- Declaration differences are retained as metadata, never chosen by recency.
alter table public.dividend_provider_conflicts add column metadata_only boolean not null default false,
 add column reviewed_at timestamptz;
alter table public.dividend_provider_conflicts add constraint metadata_review_consistent check(metadata_only=(reviewed_at is not null));
grant update(metadata_only,reviewed_at) on public.dividend_provider_conflicts to service_role;

create function public.provider_declaration_metadata_only(p_provider text,p_ticker text,e jsonb) returns boolean
language sql stable security invoker set search_path=public,pg_temp as $$
 select
  -- Only an already complete, nonsynthetic public calendar can anchor this exception.
  exists(select 1 from public.dividends d where d.ticker=p_ticker and d.type='dividend'
   and d.source in('issuer_primary','alpha_vantage','marketstack') and d.ex_date=(e->>'ex_date')::date
   and d.record_date=(e->>'record_date')::date and d.payment_date=(e->>'payment_date')::date and d.value_per_share=(e->>'value_per_share')::numeric)
  and exists(select 1 from public.dividend_provider_events d where d.provider<>p_provider and d.ticker=p_ticker
   and d.ex_date=(e->>'ex_date')::date and d.record_date=(e->>'record_date')::date
   and d.payment_date=(e->>'payment_date')::date and d.value_per_share=(e->>'value_per_share')::numeric)
  and exists(select 1 from public.dividend_provider_events d where d.ticker=p_ticker and d.ex_date=(e->>'ex_date')::date
   and d.declaration_date<>(e->>'declaration_date')::date)
  -- Any economic disagreement (including a different ex for the same payment) remains blocking.
  and not exists(select 1 from public.dividend_provider_events d where d.ticker=p_ticker
   and (d.ex_date=(e->>'ex_date')::date or d.payment_date=(e->>'payment_date')::date)
   and (d.ex_date<>(e->>'ex_date')::date or d.record_date<>(e->>'record_date')::date
    or d.payment_date<>(e->>'payment_date')::date or d.value_per_share<>(e->>'value_per_share')::numeric))
  and not exists(select 1 from public.sec_dividend_announcements s where s.ticker=p_ticker
   and s.record_date=(e->>'record_date')::date and s.payment_date=(e->>'payment_date')::date
   and s.value_per_share=(e->>'value_per_share')::numeric and s.confirmed_ex_date is not null
   and s.confirmed_ex_date<>(e->>'ex_date')::date);
$$;
revoke all on function public.provider_declaration_metadata_only(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.provider_declaration_metadata_only(text,text,jsonb) to service_role;

create or replace function public.finish_dividend_provider_observations(p_provider text,p_ticker text,p_claim_token uuid,p_events jsonb,p_error text) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare task public.dividend_provider_tasks;e jsonb;ex date;declared date;rec date;pay date;amount numeric;
 old public.dividend_provider_events;conflicts integer:=0;observations integer:=0;reconciled integer:=0;n integer;metadata_variations integer:=0;metadata_only boolean;failure text:=p_error;
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
   metadata_only:=public.provider_declaration_metadata_only(p_provider,p_ticker,e);
   select * into old from public.dividend_provider_events where provider=p_provider and ticker=p_ticker and ex_date=ex;
   if found and (old.declaration_date<>declared or old.record_date<>rec or old.payment_date<>pay or old.value_per_share<>amount)
    and not(old.declaration_date=declared and old.record_date=rec and old.payment_date=pay and public.provider_observation_rejected(p_provider,p_ticker,ex,declared,rec,pay,old.value_per_share,amount))
    and not(metadata_only and old.ex_date=ex and old.record_date=rec and old.payment_date=pay and old.value_per_share=amount)
    then perform public.record_dividend_provider_conflict(p_provider,p_ticker,e,'own_snapshot');conflicts:=conflicts+1;continue;end if;
   -- Disagreement between vendors is visible, never last-writer-wins.
   if exists(select 1 from public.dividend_provider_events d where d.ticker=p_ticker and d.provider<>p_provider and
    ((d.ex_date=ex and (d.declaration_date<>declared or d.record_date<>rec or d.payment_date<>pay or d.value_per_share<>amount)) or
     (d.payment_date=pay and d.value_per_share=amount and d.ex_date<>ex))
    and not(metadata_only and d.ex_date=ex and d.record_date=rec and d.payment_date=pay and d.value_per_share=amount)
    and not exists(select 1 from public.issuer_dividend_reconciliations primary_event
     where primary_event.ticker=p_ticker and primary_event.ex_date=ex
      and primary_event.declaration_date=declared and primary_event.record_date=rec and primary_event.payment_date=pay
      and primary_event.value_per_share=amount and d.ex_date=ex and d.declaration_date=declared
      and d.record_date=rec and d.payment_date=pay and d.value_per_share>0
      and ((scale(trim_scale(d.value_per_share))<8 and d.value_per_share=round(amount,scale(trim_scale(d.value_per_share)))) or public.provider_observation_rejected(d.provider,p_ticker,ex,declared,rec,pay,d.value_per_share,amount)))) then perform public.record_dividend_provider_conflict(p_provider,p_ticker,e,'cross_provider');conflicts:=conflicts+1;continue;end if;
   if metadata_only then
    perform public.record_dividend_provider_conflict(p_provider,p_ticker,e,'cross_provider');
    update public.dividend_provider_conflicts set metadata_only=true,reviewed_at=now()
     where provider=p_provider and ticker=p_ticker and ex_date=ex and declaration_date=declared
      and record_date=rec and payment_date=pay and observed_value=amount and reason='cross_provider';
    if old.provider=p_provider and old.ex_date=ex and old.declaration_date<>declared then
     perform public.record_dividend_provider_conflict(p_provider,p_ticker,e,'own_snapshot');
     update public.dividend_provider_conflicts set metadata_only=true,reviewed_at=now()
      where provider=p_provider and ticker=p_ticker and ex_date=ex and declaration_date=declared
       and record_date=rec and payment_date=pay and observed_value=amount and reason='own_snapshot';
    end if;
    metadata_variations:=metadata_variations+1;
   end if;
   insert into public.dividend_provider_events(provider,ticker,ex_date,declaration_date,record_date,payment_date,value_per_share)
    values(p_provider,p_ticker,ex,declared,rec,pay,amount) on conflict do nothing;
   get diagnostics n=row_count;observations:=observations+n;
   if exists(select 1 from public.sec_dividend_announcements s where s.ticker=p_ticker and s.declaration_date=declared and s.record_date=rec and s.payment_date=pay and s.value_per_share=amount and s.confirmed_ex_date is not null and s.confirmed_ex_date<>ex) then perform public.record_dividend_provider_conflict(p_provider,p_ticker,e,'sec_ex');conflicts:=conflicts+1;continue;end if;
   update public.sec_dividend_announcements s set confirmed_ex_date=ex,ex_date_provider=p_provider
    where s.ticker=p_ticker and s.declaration_date=declared and s.record_date=rec and s.payment_date=pay and s.value_per_share=amount and s.confirmed_ex_date is null;
   get diagnostics n=row_count;reconciled:=reconciled+n;
   -- Only complete existing public records. Unclassified or special events never enter the recurring DY/Bazin table.
   if exists(select 1 from public.sec_dividend_announcements s where s.ticker=p_ticker and s.payment_date=pay and s.distribution='special') then continue;end if;
   if exists(select 1 from public.dividends d where d.ticker=p_ticker and d.type='dividend' and d.source not in('seed','synthetic') and
    ((d.ex_date=ex and (d.value_per_share<>amount or (d.record_date is not null and d.record_date<>rec) or (d.payment_date is not null and d.payment_date<>pay))) or
     (d.payment_date=pay and d.ex_date<>ex))) then perform public.record_dividend_provider_conflict(p_provider,p_ticker,e,'public_event');conflicts:=conflicts+1;continue;end if;
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
 return jsonb_build_object('observations',observations,'reconciled',reconciled,'conflicts',conflicts,'metadata_variations',metadata_variations,'error',failure,'received_income_created',0);
end $$;

-- One diagnostic retry for an existing, provably metadata-only conflict. No lease/quota bypass.
insert into public.dividend_provider_recheck_requests(provider,ticker,reason)
 select distinct t.provider,t.ticker,'investigate_conflict' from public.dividend_provider_tasks t
 join public.dividend_provider_conflicts c using(provider,ticker)
 where t.last_error='provider_event_conflict' and t.claim_token is null
  and public.provider_declaration_metadata_only(t.provider,t.ticker,jsonb_build_object('ex_date',c.ex_date,
   'declaration_date',c.declaration_date,'record_date',c.record_date,'payment_date',c.payment_date,'value_per_share',c.observed_value))
 on conflict(provider,ticker) do update set requested_at=now(),reason=excluded.reason;

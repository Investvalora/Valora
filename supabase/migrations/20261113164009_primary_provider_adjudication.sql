-- CR primary releases; ex remains independently anchored, never inferred.
create or replace function public.reconcile_issuer_dividend(p_ticker text,e jsonb) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare ex date;declared date;rec date;pay date;amount numeric;link text;old public.dividends;prior public.issuer_dividend_reconciliations;n integer;
begin
 ex:=(e->>'ex_date')::date;declared:=(e->>'declaration_date')::date;rec:=(e->>'record_date')::date;pay:=(e->>'payment_date')::date;amount:=(e->>'value_per_share')::numeric;link:=e->>'source_url';
 if not exists(select 1 from public.assets where ticker=p_ticker and active and type='stock_us' and currency='USD')
 or declared is null or rec is null or pay is null or amount is null or amount<=0 or amount>=1e12 or amount::text in('NaN','Infinity','-Infinity') or amount<>trunc(amount,8)
 or declared>current_date or declared>rec or rec>pay or pay-rec>366 or rec<current_date-366 then raise exception 'Invalid issuer event';end if;
 -- SEC identity and event must have already passed the existing leased collector.
 if not coalesce(((p_ticker='PRT' and link ~ '^https://permrock[.]com/wp-content/uploads/20[0-9]{2}/[0-9]{2}/[A-Za-z0-9-]+[.]pdf$'
   and e->>'ex_date_source_url'='https://permrock.com/cash-distributions/' and ex=rec
   and link like '%/uploads/'||to_char(declared,'YYYY/MM')||'/%')
  or (p_ticker='BMN' and link ~ '^https://www[.]blackrock[.]com/us/individual/literature/press-release/[0-9-]+-pr-(muni-)?div-release[.]pdf$' and e->>'ex_date_source_url'=link and ex=rec)
  or (p_ticker='CR' and link ~ '^https://www[.]nasdaq[.]com/press-release/crane-company-reports-(first-quarter|second-quarter|third-quarter|strong-q4)-20[0-9]{2}-[a-z0-9-]+$'
   and e->>'upstream_url' ~ '^https://www[.]businesswire[.]com/news/home/[0-9]{14}/en/$'
   and substring(e->>'upstream_url' from '/home/([0-9]{8})') in(to_char(declared,'YYYYMMDD'),to_char(declared-1,'YYYYMMDD')))
  or (p_ticker='META' and link ~ '^https://www[.]nasdaq[.]com/press-release/meta-announces-quarterly-cash-dividend-20[0-9]{2}-[0-9]{2}-[0-9]{2}$' and right(link,10)=declared::text)
  or exists(select 1 from public.sec_dividend_announcements s where s.ticker=p_ticker and s.distribution='regular' and s.source_url=link
    and s.declaration_date=declared and s.record_date=rec and s.payment_date=pay and s.value_per_share=amount)),false) then raise exception 'Unverified issuer source';end if;
 perform pg_advisory_xact_lock(hashtextextended('dividend-provider-ticker:'||p_ticker,0));
 if p_ticker not in('PRT','BMN') and ex is not null then raise exception 'Unverified issuer ex';end if;
 -- Missing ex is reconciled against one independent existing event, never copied from record.
 if ex is null then
  select count(distinct d.ex_date),min(d.ex_date) into n,ex from (
   select d.ex_date from public.dividends d where d.ticker=p_ticker and d.type='dividend' and d.source not in('seed','synthetic')
    and d.value_per_share=amount and d.ex_date between declared and rec and (d.payment_date is null or d.payment_date=pay or (p_ticker='META' and d.source='yahoo'))
   union all
   select d.ex_date from public.dividend_provider_events d where p_ticker='CR' and d.ticker=p_ticker
    and d.declaration_date=declared and d.record_date=rec and d.payment_date=pay and d.value_per_share=amount and d.ex_date between declared and rec
  ) d;
  if n<>1 then return jsonb_build_object('saved',0,'conflicts',0,'coverage_gap',true);end if;
 end if;
 if ex<declared or ex>rec then raise exception 'Invalid issuer ex';end if;
 select * into prior from public.issuer_dividend_reconciliations where ticker=p_ticker and ex_date=ex;
 if found and (prior.declaration_date<>declared or prior.record_date<>rec or prior.payment_date<>pay or prior.value_per_share<>amount) then
  return jsonb_build_object('saved',0,'conflicts',1);end if;
 select * into old from public.dividends where ticker=p_ticker and ex_date=ex and type='dividend' for update;
 if found then
  if (old.record_date is not null and old.record_date<>rec) or (old.payment_date is not null and old.payment_date<>pay and not(p_ticker='META' and coalesce(old.source,'')='yahoo' and old.value_per_share=amount))
   or (old.value_per_share<>amount and not(coalesce(old.source,'')='yahoo' and old.value_per_share=round(amount,3))) then return jsonb_build_object('saved',0,'conflicts',1);end if;
 else
  if exists(select 1 from public.dividends where ticker=p_ticker and type='dividend' and payment_date=pay and ex_date<>ex) then return jsonb_build_object('saved',0,'conflicts',1);end if;
 end if;
 insert into public.issuer_dividend_reconciliations(ticker,ex_date,declaration_date,record_date,payment_date,value_per_share,source_url,prior_row)
 values(p_ticker,ex,declared,rec,pay,amount,link,to_jsonb(old)) on conflict do nothing;
 insert into public.dividends(ticker,ex_date,record_date,payment_date,value_per_share,type,source,source_url)
 values(p_ticker,ex,rec,pay,amount,'dividend','issuer_primary',link)
 on conflict(ticker,ex_date,type) do update set record_date=excluded.record_date,payment_date=excluded.payment_date,
  value_per_share=excluded.value_per_share,source=excluded.source,source_url=excluded.source_url;
 return jsonb_build_object('saved',1,'conflicts',0);
end $$;

create or replace function public.finish_primary_dividends(p_ticker text,p_claim_token uuid,p_events jsonb,p_error text) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare task public.international_announcement_tasks;e jsonb;r jsonb;saved integer:=0;conflicts integer:=0;gaps integer:=0;failure text:=p_error;
begin
 select * into task from public.international_announcement_tasks where ticker=p_ticker for update;
 if p_ticker not in('PRT','META','BMN','CR') or not found or p_claim_token is null or task.claim_token is distinct from p_claim_token or task.next_sync_at<=now() then raise exception 'Issuer lease unavailable';end if;
 if jsonb_typeof(p_events) is distinct from 'array' or jsonb_array_length(p_events)>20
 or (p_error is not null and (p_error !~ '^issuer_[a-z_]{1,60}$' or jsonb_array_length(p_events)<>0))
 or (p_error is null and jsonb_array_length(p_events)=0) then raise exception 'Invalid issuer result';end if;
 if failure is null then
  for e in select value from jsonb_array_elements(p_events) loop
   r:=public.reconcile_issuer_dividend(p_ticker,e);saved:=saved+(r->>'saved')::integer;conflicts:=conflicts+(r->>'conflicts')::integer;
   if coalesce((r->>'coverage_gap')::boolean,false) then gaps:=gaps+1;end if;
  end loop;
  if conflicts>0 then failure:='issuer_event_conflict';elsif gaps>0 then failure:='issuer_ex_unconfirmed';end if;
 end if;
 update public.international_announcement_tasks set claim_token=null,last_attempt_at=now(),last_error=failure,
  last_success_at=case when failure is null then now() else last_success_at end,next_sync_at=now()+interval '24 hours' where ticker=p_ticker;
 return jsonb_build_object('saved',saved,'conflicts',conflicts,'coverage_gaps',gaps,'error',failure,'received_income_created',0);
end $$;

-- Preserve raw vendor snapshots and record primary-backed decisions separately.
create table public.dividend_provider_adjudications (
 provider text not null check(provider in('alpha_vantage','marketstack')),ticker text not null references public.assets(ticker),
 ex_date date not null,declaration_date date not null,record_date date not null,payment_date date not null,
 observed_value numeric(20,8) not null,primary_value numeric(20,8) not null,primary_source_url text not null,
 disposition text not null check(disposition in('confirmed','rejected')),observed_at timestamptz not null default now(),
 primary key(provider,ticker,ex_date,observed_value,primary_value),
 check(observed_value>0 and primary_value>0),check((disposition='confirmed')=(observed_value=primary_value))
);
alter table public.dividend_provider_adjudications enable row level security;
revoke all on public.dividend_provider_adjudications from public,anon,authenticated;
grant select,insert on public.dividend_provider_adjudications to service_role;
create function public.provider_observation_rejected(p_provider text,p_ticker text,p_ex date,p_declared date,p_record date,p_payment date,p_observed numeric,p_expected numeric) returns boolean
language sql security invoker set search_path=public,pg_temp as $$
 select exists(select 1 from public.dividend_provider_adjudications a join public.issuer_dividend_reconciliations r using(ticker,ex_date)
  where a.provider=p_provider and a.ticker=p_ticker and a.ex_date=p_ex and a.disposition='rejected'
   and a.declaration_date=p_declared and a.record_date=p_record and a.payment_date=p_payment
   and a.observed_value=p_observed and a.primary_value=p_expected and a.primary_source_url=r.source_url
   and r.declaration_date=p_declared and r.record_date=p_record and r.payment_date=p_payment and r.value_per_share=p_expected);
$$;
revoke all on function public.provider_observation_rejected(text,text,date,date,date,date,numeric,numeric) from public,anon,authenticated;
grant execute on function public.provider_observation_rejected(text,text,date,date,date,date,numeric,numeric) to service_role;

create table public.dividend_provider_conflicts (
 provider text not null check(provider in('alpha_vantage','marketstack')),ticker text not null references public.assets(ticker),
 ex_date date not null,declaration_date date not null,record_date date not null,payment_date date not null,
 observed_value numeric(20,8) not null,reason text not null check(reason in('own_snapshot','cross_provider','public_event','sec_ex')),
 reference_events jsonb not null check(octet_length(reference_events::text)<=8192),observed_at timestamptz not null default now(),
 primary key(provider,ticker,ex_date,declaration_date,record_date,payment_date,observed_value,reason)
);
alter table public.dividend_provider_conflicts enable row level security;
revoke all on public.dividend_provider_conflicts from public,anon,authenticated;
grant select,insert on public.dividend_provider_conflicts to service_role;
create function public.record_dividend_provider_conflict(p_provider text,p_ticker text,e jsonb,p_reason text) returns void
language plpgsql security invoker set search_path=public,pg_temp as $$
declare refs jsonb;
begin
 if p_reason in('own_snapshot','cross_provider') then
  select coalesce(jsonb_agg(to_jsonb(d)),'[]') into refs from (
   select provider,ex_date,declaration_date,record_date,payment_date,value_per_share from public.dividend_provider_events
   where ticker=p_ticker and (ex_date=(e->>'ex_date')::date or payment_date=(e->>'payment_date')::date)
    and ((p_reason='own_snapshot' and provider=p_provider) or (p_reason='cross_provider' and provider<>p_provider))
   order by provider,ex_date limit 5) d;
 elsif p_reason='public_event' then
  select coalesce(jsonb_agg(to_jsonb(d)),'[]') into refs from (
   select ex_date,record_date,payment_date,value_per_share,case when source in('yahoo','issuer_primary','alpha_vantage','marketstack','seed','synthetic') then source else 'other' end source
   from public.dividends where ticker=p_ticker and type='dividend' and (ex_date=(e->>'ex_date')::date or payment_date=(e->>'payment_date')::date)
   order by ex_date limit 5) d;
 elsif p_reason='sec_ex' then
  select coalesce(jsonb_agg(to_jsonb(d)),'[]') into refs from (
   select declaration_date,record_date,payment_date,value_per_share,confirmed_ex_date from public.sec_dividend_announcements
   where ticker=p_ticker and payment_date=(e->>'payment_date')::date order by declaration_date limit 5) d;
 else raise exception 'Invalid conflict reason';end if;
 insert into public.dividend_provider_conflicts(provider,ticker,ex_date,declaration_date,record_date,payment_date,observed_value,reason,reference_events)
 values(p_provider,p_ticker,(e->>'ex_date')::date,(e->>'declaration_date')::date,(e->>'record_date')::date,(e->>'payment_date')::date,(e->>'value_per_share')::numeric,p_reason,refs) on conflict do nothing;
end $$;
revoke all on function public.record_dividend_provider_conflict(text,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.record_dividend_provider_conflict(text,text,jsonb,text) to service_role;

create or replace function public.finish_dividend_provider(p_provider text,p_ticker text,p_claim_token uuid,p_events jsonb,p_error text) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare e jsonb;p public.issuer_dividend_reconciliations;t public.dividend_provider_tasks;r jsonb;filtered jsonb:='[]';limited integer:=0;rejected integer:=0;amount numeric;partial_error text;primary_found boolean;
begin
 select * into t from public.dividend_provider_tasks where provider=p_provider and ticker=p_ticker for update;
 if not found or p_claim_token is null or t.claim_token is distinct from p_claim_token or t.next_sync_at<=now() then raise exception 'Provider lease unavailable';end if;
 if jsonb_typeof(p_events) is distinct from 'array' or jsonb_array_length(p_events)>100 then raise exception 'Invalid provider result';end if;
 if p_error is null then
  for e in select value from jsonb_array_elements(p_events) loop
   amount:=(e->>'value_per_share')::numeric;
   select * into p from public.issuer_dividend_reconciliations where ticker=p_ticker and ex_date=(e->>'ex_date')::date
    and declaration_date=(e->>'declaration_date')::date and record_date=(e->>'record_date')::date and payment_date=(e->>'payment_date')::date;
   primary_found:=found;
   if primary_found and amount>0 and amount<1e12 and amount=trunc(amount,8) then
    -- Prior snapshots are not edited. Their rejection requires identical dates and current primary proof.
    insert into public.dividend_provider_adjudications(provider,ticker,ex_date,declaration_date,record_date,payment_date,observed_value,primary_value,primary_source_url,disposition)
    select d.provider,d.ticker,d.ex_date,d.declaration_date,d.record_date,d.payment_date,d.value_per_share,p.value_per_share,p.source_url,'rejected'
    from public.dividend_provider_events d where d.ticker=p.ticker and d.ex_date=p.ex_date and d.declaration_date=p.declaration_date
     and d.record_date=p.record_date and d.payment_date=p.payment_date and d.value_per_share<>p.value_per_share on conflict do nothing;
    if amount=p.value_per_share or not(amount=round(p.value_per_share,scale(amount)) and scale(amount)<8) then
     insert into public.dividend_provider_adjudications(provider,ticker,ex_date,declaration_date,record_date,payment_date,observed_value,primary_value,primary_source_url,disposition)
     values(p_provider,p_ticker,p.ex_date,p.declaration_date,p.record_date,p.payment_date,amount,p.value_per_share,p.source_url,case when amount=p.value_per_share then 'confirmed' else 'rejected' end) on conflict do nothing;
     if amount<>p.value_per_share then
      insert into public.dividend_provider_events(provider,ticker,ex_date,declaration_date,record_date,payment_date,value_per_share)
      values(p_provider,p_ticker,p.ex_date,p.declaration_date,p.record_date,p.payment_date,amount) on conflict do nothing;
      rejected:=rejected+1;continue;
     end if;
    end if;
   end if;
   if primary_found and amount>0 and amount<>p.value_per_share and amount=round(p.value_per_share,scale(amount)) and scale(amount)<8 then
    -- Existing vendor snapshots remain immutable; do not erase a separate source change.
    if exists(select 1 from public.dividend_provider_events d where d.provider=p_provider and d.ticker=p_ticker and d.ex_date=p.ex_date
      and (d.value_per_share<>amount or d.declaration_date<>p.declaration_date or d.record_date<>p.record_date or d.payment_date<>p.payment_date)) then
     filtered:=filtered||jsonb_build_array(e);continue;
    end if;
    insert into public.dividend_provider_events(provider,ticker,ex_date,declaration_date,record_date,payment_date,value_per_share)
     values(p_provider,p_ticker,p.ex_date,p.declaration_date,p.record_date,p.payment_date,amount) on conflict do nothing;
    limited:=limited+1;
   else filtered:=filtered||jsonb_build_array(e);end if;
  end loop;
 else filtered:=p_events;end if;
 partial_error:=case when rejected>0 then 'provider_primary_disagreement' when limited>0 then 'provider_precision_limited' else null end;
 r:=public.finish_dividend_provider_observations(p_provider,p_ticker,p_claim_token,filtered,
  case when p_error is null and partial_error is not null and jsonb_array_length(filtered)=0 then partial_error else p_error end);
 if partial_error is not null and (r->>'error' is null or r->>'error' in('provider_primary_disagreement','provider_precision_limited')) then
  update public.dividend_provider_tasks set last_error=partial_error,last_success_at=t.last_success_at where provider=p_provider and ticker=p_ticker;
  r:=r||jsonb_build_object('error',partial_error,'precision_limited',limited,'primary_rejected',rejected);
 end if;
 return r;
end $$;

create or replace function public.finish_dividend_provider_observations(p_provider text,p_ticker text,p_claim_token uuid,p_events jsonb,p_error text) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare task public.dividend_provider_tasks;e jsonb;ex date;declared date;rec date;pay date;amount numeric;
 old public.dividend_provider_events;conflicts integer:=0;observations integer:=0;reconciled integer:=0;n integer;failure text:=p_error;
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
   select * into old from public.dividend_provider_events where provider=p_provider and ticker=p_ticker and ex_date=ex;
   if found and (old.declaration_date<>declared or old.record_date<>rec or old.payment_date<>pay or old.value_per_share<>amount)
    and not(old.declaration_date=declared and old.record_date=rec and old.payment_date=pay and public.provider_observation_rejected(p_provider,p_ticker,ex,declared,rec,pay,old.value_per_share,amount))
    then perform public.record_dividend_provider_conflict(p_provider,p_ticker,e,'own_snapshot');conflicts:=conflicts+1;continue;end if;
   -- Disagreement between vendors is visible, never last-writer-wins.
   if exists(select 1 from public.dividend_provider_events d where d.ticker=p_ticker and d.provider<>p_provider and
    ((d.ex_date=ex and (d.declaration_date<>declared or d.record_date<>rec or d.payment_date<>pay or d.value_per_share<>amount)) or
     (d.payment_date=pay and d.value_per_share=amount and d.ex_date<>ex))
    and not exists(select 1 from public.issuer_dividend_reconciliations primary_event
     where primary_event.ticker=p_ticker and primary_event.ex_date=ex
      and primary_event.declaration_date=declared and primary_event.record_date=rec and primary_event.payment_date=pay
      and primary_event.value_per_share=amount and d.ex_date=ex and d.declaration_date=declared
      and d.record_date=rec and d.payment_date=pay and d.value_per_share>0
      and ((scale(trim_scale(d.value_per_share))<8 and d.value_per_share=round(amount,scale(trim_scale(d.value_per_share)))) or public.provider_observation_rejected(d.provider,p_ticker,ex,declared,rec,pay,d.value_per_share,amount)))) then perform public.record_dividend_provider_conflict(p_provider,p_ticker,e,'cross_provider');conflicts:=conflicts+1;continue;end if;
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
 return jsonb_build_object('observations',observations,'reconciled',reconciled,'conflicts',conflicts,'error',failure,'received_income_created',0);
end $$;

-- One bounded diagnostic request; no retry loop and no bypass of quotas/leases.
create table public.dividend_provider_recheck_requests (
 provider text not null check(provider in('alpha_vantage','marketstack')),ticker text not null references public.assets(ticker),
 requested_at timestamptz not null default now(),reason text not null check(reason='investigate_conflict'),primary key(provider,ticker)
);
alter table public.dividend_provider_recheck_requests enable row level security;
revoke all on public.dividend_provider_recheck_requests from public,anon,authenticated;
grant select,insert,update on public.dividend_provider_recheck_requests to service_role;
insert into public.dividend_provider_recheck_requests(provider,ticker,reason)
 select provider,ticker,'investigate_conflict' from public.dividend_provider_tasks
 where provider='marketstack' and ticker='GOOGL' and last_error='provider_event_conflict' and claim_token is null on conflict do nothing;
create function public.provider_recheck_due(p_provider text,p_ticker text,p_attempt timestamptz,p_error text) returns boolean
language sql security invoker set search_path=public,pg_temp as $$
 select public.provider_primary_recheck_due(p_ticker,p_attempt,p_error) or coalesce(p_error='provider_event_conflict' and exists(
  select 1 from public.dividend_provider_recheck_requests r where r.provider=p_provider and r.ticker=p_ticker and (p_attempt is null or r.requested_at>p_attempt)),false);
$$;
revoke all on function public.provider_recheck_due(text,text,timestamptz,text) from public,anon,authenticated;
grant execute on function public.provider_recheck_due(text,text,timestamptz,text) to service_role;

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
 where t.provider=p_provider and (t.next_sync_at<=now() or public.provider_recheck_due(t.provider,t.ticker,t.last_attempt_at,t.last_error)) and (t.claim_token is null or t.next_sync_at<=now()) and a.active and a.type='stock_us' and a.currency='USD'
 and not public.issuer_nonpayer_confirmed(t.ticker)
 order by public.provider_recheck_due(t.provider,t.ticker,t.last_attempt_at,t.last_error) desc,(t.last_attempt_at is null) desc,
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

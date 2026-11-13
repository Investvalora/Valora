-- JNJ syndicated issuer releases with explicit ex-date and dated Business Wire proof.
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
  or (p_ticker='JNJ' and link ~ '^https://www[.]nasdaq[.]com/press-release/johnson-johnson-announces-(quarterly-dividend-(first|second|third|fourth)-quarter-20[0-9]{2}-20[0-9]{2}-[0-9]{2}-[0-9]{2}|[0-9]{2}th-consecutive-year-dividend-increase-raises-quarterly)$'
   and e->>'upstream_url' ~ '^https://www[.]businesswire[.]com/news/home/[0-9]{14}/en/$'
   and substring(e->>'upstream_url' from '/home/([0-9]{8})')=to_char(declared,'YYYYMMDD')
   and (link not like '%quarter-20%' or right(link,10)=declared::text)
   and e->>'ex_date_source_url'=link and ex is not null)
  or (p_ticker='META' and link ~ '^https://www[.]nasdaq[.]com/press-release/meta-announces-quarterly-cash-dividend-20[0-9]{2}-[0-9]{2}-[0-9]{2}$' and right(link,10)=declared::text)
  or exists(select 1 from public.sec_dividend_announcements s where s.ticker=p_ticker and s.distribution='regular' and s.source_url=link
    and s.declaration_date=declared and s.record_date=rec and s.payment_date=pay and s.value_per_share=amount)),false) then raise exception 'Unverified issuer source';end if;
 perform pg_advisory_xact_lock(hashtextextended('dividend-provider-ticker:'||p_ticker,0));
 if p_ticker not in('PRT','BMN','JNJ') and ex is not null then raise exception 'Unverified issuer ex';end if;
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
 if p_ticker not in('PRT','META','BMN','CR','JNJ') or not found or p_claim_token is null or task.claim_token is distinct from p_claim_token or task.next_sync_at<=now() then raise exception 'Issuer lease unavailable';end if;
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


revoke all on function public.reconcile_issuer_dividend(text,jsonb),public.finish_primary_dividends(text,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.reconcile_issuer_dividend(text,jsonb),public.finish_primary_dividends(text,uuid,jsonb,text) to service_role;

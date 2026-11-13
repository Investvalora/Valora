begin;
insert into public.assets(ticker,name,type,currency,quote_provider) values('CR','Crane Company','stock_us','USD','finnhub'),('GOOGL','Alphabet','stock_us','USD','finnhub') on conflict(ticker) do update set active=true;
delete from public.dividend_provider_adjudications where ticker in('CR','GOOGL');
delete from public.dividend_provider_conflicts where ticker in('CR','GOOGL');
delete from public.issuer_dividend_reconciliations where ticker in('CR','GOOGL');
delete from public.dividend_provider_events where ticker in('CR','GOOGL');
delete from public.dividends where ticker in('CR','GOOGL');
insert into public.dividends(ticker,ex_date,value_per_share,type,source) values('CR',current_date-10,0.255,'dividend','yahoo'),('GOOGL',current_date-10,0.21,'dividend','alpha_vantage');
insert into public.dividend_provider_tasks(provider,ticker) values('alpha_vantage','CR'),('alpha_vantage','GOOGL') on conflict(provider,ticker) do nothing;
insert into public.dividend_provider_events(provider,ticker,ex_date,declaration_date,record_date,payment_date,value_per_share) values
 ('alpha_vantage','CR',current_date-10,current_date-20,current_date-10,current_date-5,0.435),('alpha_vantage','GOOGL',current_date-10,current_date-20,current_date-10,current_date-5,0.21);
set local role service_role;
do $$ declare e jsonb;r jsonb;lease uuid:='11111111-1111-4111-8111-111111111111';begin
 e:=jsonb_build_object('declaration_date',current_date-20,'record_date',current_date-10,'payment_date',current_date-5,'value_per_share',0.255,
  'source_url','https://www.nasdaq.com/press-release/crane-company-reports-second-quarter-2026-results-fixture',
  'upstream_url','https://www.businesswire.com/news/home/'||to_char(current_date-20,'YYYYMMDD')||'123456/en/');
 begin perform public.reconcile_issuer_dividend('CR',e||'{"upstream_url":"https://attacker.invalid/source"}');raise exception 'Foreign upstream accepted';exception when raise_exception then if sqlerrm<>'Unverified issuer source' then raise;end if;end;
 r:=public.reconcile_issuer_dividend('CR',e);if r->>'saved'<>'1' then raise exception 'CR primary not reconciled';end if;
 -- Correct vendor is accepted first; incorrect old raw snapshot remains immutable and audited.
 insert into public.dividend_provider_tasks(provider,ticker,claim_token,next_sync_at) values('marketstack','CR',lease,now()+interval '10 minutes') on conflict(provider,ticker) do update set claim_token=excluded.claim_token,next_sync_at=excluded.next_sync_at;
 e:=e||jsonb_build_object('ex_date',current_date-10);
 r:=public.finish_dividend_provider('marketstack','CR',lease,jsonb_build_array(e),null);
 if r->>'error' is not null or r->>'conflicts'<>'0' then raise exception 'Correct vendor blocked by primary-rejected source: %',r;end if;
 if not exists(select 1 from public.dividend_provider_events where ticker='CR' and provider='alpha_vantage' and value_per_share=0.435) then raise exception 'Rejected raw snapshot overwritten';end if;
 if not exists(select 1 from public.dividend_provider_adjudications where ticker='CR' and provider='alpha_vantage' and observed_value=0.435 and primary_value=0.255 and disposition='rejected') then raise exception 'Rejection not audited';end if;
 insert into public.dividend_provider_tasks(provider,ticker,claim_token,next_sync_at) values('alpha_vantage','CR',lease,now()+interval '10 minutes') on conflict(provider,ticker) do update set claim_token=excluded.claim_token,next_sync_at=excluded.next_sync_at,last_success_at=null;
 r:=public.finish_dividend_provider('alpha_vantage','CR',lease,jsonb_build_array(e||'{"value_per_share":0.435}'),null);
 if r->>'error'<>'provider_primary_disagreement' or r->>'primary_rejected'<>'1' then raise exception 'Rejected source not explicit';end if;
 if exists(select 1 from public.dividend_provider_tasks where ticker='CR' and provider='alpha_vantage' and (last_success_at is not null or claim_token is not null)) then raise exception 'Rejected source falsely succeeded or leased';end if;
 -- A later corrected vendor response can be confirmed without deleting its prior raw snapshot.
 update public.dividend_provider_tasks set claim_token=lease,next_sync_at=now()+interval '10 minutes' where provider='alpha_vantage' and ticker='CR';
 r:=public.finish_dividend_provider('alpha_vantage','CR',lease,jsonb_build_array(e),null);
 if r->>'error' is not null then raise exception 'Corrected source rejected: %',r;end if;
 if not exists(select 1 from public.dividend_provider_adjudications where provider='alpha_vantage' and ticker='CR' and observed_value=0.255 and disposition='confirmed') then raise exception 'New confirmation not retained';end if;
 -- Date mismatches are never suppressed by an amount-only primary match.
 update public.dividend_provider_tasks set claim_token=lease,next_sync_at=now()+interval '10 minutes' where provider='marketstack' and ticker='CR';
 r:=public.finish_dividend_provider('marketstack','CR',lease,jsonb_build_array(e||jsonb_build_object('record_date',current_date-9)),null);
 if r->>'error'<>'provider_event_conflict' then raise exception 'Date disagreement hidden';end if;
 -- Exact future diagnostic data, not credentials or the raw response.
 insert into public.dividend_provider_tasks(provider,ticker,claim_token,next_sync_at) values('marketstack','GOOGL',lease,now()+interval '10 minutes') on conflict(provider,ticker) do update set claim_token=excluded.claim_token,next_sync_at=excluded.next_sync_at;
 e:=jsonb_build_object('ex_date',current_date-10,'declaration_date',current_date-19,'record_date',current_date-10,'payment_date',current_date-5,'value_per_share',0.21,'apikey','fixture-secret');
 r:=public.finish_dividend_provider('marketstack','GOOGL',lease,jsonb_build_array(e),null);
 if r->>'error'<>'provider_event_conflict' then raise exception 'Unverified disagreement hidden';end if;
 if not exists(select 1 from public.dividend_provider_conflicts where ticker='GOOGL' and reason='cross_provider' and declaration_date=current_date-19 and reference_events->0->>'declaration_date'=(current_date-20)::text) then raise exception 'Conflict diagnosis missing exact dates';end if;
 if exists(select 1 from public.dividend_provider_conflicts where reference_events::text like '%fixture-secret%') then raise exception 'Request metadata leaked';end if;
 -- CR without any independent ex anchor stays incomplete.
 r:=public.reconcile_issuer_dividend('CR',jsonb_build_object('declaration_date',current_date,'record_date',current_date+10,'payment_date',current_date+20,'value_per_share',0.255,
  'source_url','https://www.nasdaq.com/press-release/crane-company-reports-third-quarter-2026-results-fixture','upstream_url','https://www.businesswire.com/news/home/'||to_char(current_date,'YYYYMMDD')||'123456/en/'));
 if not coalesce((r->>'coverage_gap')::boolean,false) then raise exception 'CR ex inferred';end if;
 if has_table_privilege('authenticated','public.dividend_provider_adjudications','SELECT') or has_table_privilege('anon','public.dividend_provider_conflicts','SELECT') or has_function_privilege('anon','public.record_dividend_provider_conflict(text,text,jsonb,text)','EXECUTE') then raise exception 'Private evidence exposed';end if;
end $$;
reset role;
-- An explicit diagnostic retry happens only once and still consumes reserved quota.
update public.assets set active=false where type='stock_us' and ticker<>'GOOGL';
update public.dividend_provider_tasks set last_attempt_at=now()-interval '1 day',last_error='provider_event_conflict',next_sync_at=now()+interval '7 days',claim_token=null where provider='marketstack' and ticker='GOOGL';
insert into public.dividend_provider_recheck_requests(provider,ticker,reason) values('marketstack','GOOGL','investigate_conflict') on conflict(provider,ticker) do update set requested_at=now();
delete from public.dividend_provider_usage where provider='marketstack';
set local role service_role;
do $$ declare t public.dividend_provider_tasks;begin
 insert into public.dividend_provider_usage values('marketstack',current_date,16);
 if exists(select 1 from public.claim_dividend_provider('marketstack')) then raise exception 'Diagnostic bypassed quota';end if;
 delete from public.dividend_provider_usage where provider='marketstack';
 select * into t from public.claim_dividend_provider('marketstack');if t.ticker<>'GOOGL' then raise exception 'Diagnostic request not leased';end if;
 if exists(select 1 from public.claim_dividend_provider('marketstack')) then raise exception 'Active diagnostic lease reused';end if;
 perform public.finish_dividend_provider('marketstack',t.ticker,t.claim_token,'[]','provider_event_conflict');
 if exists(select 1 from public.claim_dividend_provider('marketstack')) then raise exception 'Diagnostic request looped';end if;
end $$;
reset role;
rollback;

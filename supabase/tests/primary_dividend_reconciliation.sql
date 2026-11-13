-- Isolated local/CI database only. Every fixture is rolled back.
begin;
insert into public.assets(ticker,name,type,currency,quote_provider) values
 ('PRT','Primary fixture','stock_us','USD','finnhub'),('META','Primary fixture','stock_us','USD','finnhub'),
 ('AMZN','Policy fixture','stock_us','USD','finnhub'),('ZZFIRST','Queue fixture','stock_us','USD','finnhub'),('AAAGED','Queue fixture','stock_us','USD','finnhub')
 on conflict(ticker) do update set active=true,type='stock_us',currency='USD';
delete from public.issuer_dividend_reconciliations where ticker in('PRT','META');
delete from public.dividend_provider_events where ticker in('PRT','META');
delete from public.dividends where ticker in('PRT','META','AMZN');
insert into public.dividends(ticker,ex_date,value_per_share,type,source) values
 ('PRT',current_date-10,0.020000,'dividend','yahoo'),('META',current_date-10,0.525,'dividend','yahoo');
set local role service_role;
do $$ declare e jsonb;r jsonb;link text;lease uuid:='11111111-1111-4111-8111-111111111111';t public.dividend_provider_tasks;before_count integer;begin
 link:='https://permrock.com/wp-content/uploads/'||to_char(current_date-15,'YYYY/MM')||'/Fixture.pdf';
 e:=jsonb_build_object('declaration_date',current_date-15,'ex_date',current_date-10,'record_date',current_date-10,'payment_date',current_date-5,'value_per_share',0.0196242,'source_url',link,'ex_date_source_url','https://permrock.com/cash-distributions/');
 r:=public.reconcile_issuer_dividend('PRT',e);
 if r->>'saved'<>'1' or r->>'conflicts'<>'0' then raise exception 'Primary reconciliation failed';end if;
 if not exists(select 1 from public.dividends where ticker='PRT' and ex_date=current_date-10 and value_per_share=0.0196242 and payment_date=current_date-5 and source='issuer_primary') then raise exception 'Primary precision/calendar lost';end if;
 if not exists(select 1 from public.issuer_dividend_reconciliations where ticker='PRT' and (prior_row->>'value_per_share')::numeric=0.020000 and source_url=link) then raise exception 'Prior value/source not audited';end if;
 perform public.reconcile_issuer_dividend('PRT',e);
 if (select count(*) from public.issuer_dividend_reconciliations where ticker='PRT')<>1 then raise exception 'Replay duplicated audit';end if;
 r:=public.reconcile_issuer_dividend('PRT',e||jsonb_build_object('value_per_share',0.025));
 if r->>'conflicts'<>'1' then raise exception 'Primary disagreement overwritten';end if;
 begin
  perform public.reconcile_issuer_dividend('PRT',e||jsonb_build_object('source_url','https://attacker.invalid/Fixture.pdf'));
  raise exception 'Foreign source accepted';
 exception when raise_exception then if sqlerrm<>'Unverified issuer source' then raise;end if;end;
 begin
  perform public.reconcile_issuer_dividend('PRT',e-'source_url');raise exception 'Missing source accepted';
 exception when raise_exception then if sqlerrm<>'Unverified issuer source' then raise;end if;end;
 e:=jsonb_build_object('declaration_date',current_date-15,'record_date',current_date-10,'payment_date',current_date-5,'value_per_share',0.525,
  'source_url','https://www.nasdaq.com/press-release/meta-announces-quarterly-cash-dividend-'||(current_date-15)::text);
 r:=public.reconcile_issuer_dividend('META',e);
 if r->>'saved'<>'1' then raise exception 'Independent Meta ex not matched';end if;
 begin
  perform public.reconcile_issuer_dividend('META',e||jsonb_build_object('ex_date',current_date-10));raise exception 'Record substituted as ex';
 exception when raise_exception then if sqlerrm<>'Unverified issuer ex' then raise;end if;end;
 r:=public.reconcile_issuer_dividend('META',e||jsonb_build_object('record_date',current_date-2,'payment_date',current_date+2,'declaration_date',current_date-4,
  'source_url','https://www.nasdaq.com/press-release/meta-announces-quarterly-cash-dividend-'||(current_date-4)::text));
 if not coalesce((r->>'coverage_gap')::boolean,false) then raise exception 'Missing independent ex invented';end if;
 insert into public.dividend_provider_tasks(provider,ticker,claim_token,next_sync_at) values('marketstack','META',lease,now()+interval '10 minutes')
 on conflict(provider,ticker) do update set claim_token=excluded.claim_token,next_sync_at=excluded.next_sync_at,last_success_at=null;
 e:=e||jsonb_build_object('ex_date',current_date-10,'value_per_share',0.53);
 r:=public.finish_dividend_provider('marketstack','META',lease,jsonb_build_array(e),null);
 if r->>'error'<>'provider_precision_limited' then raise exception 'Primary-confirmed rounding not classified';end if;
 if exists(select 1 from public.dividend_provider_tasks where provider='marketstack' and ticker='META' and (claim_token is not null or last_success_at is not null)) then raise exception 'Partial task falsely successful or leased';end if;
 if not exists(select 1 from public.dividends where ticker='META' and value_per_share=0.525 and source='issuer_primary') then raise exception 'Rounded provider overwrote primary';end if;
 update public.dividend_provider_tasks set claim_token=lease,next_sync_at=now()+interval '10 minutes' where provider='marketstack' and ticker='META';
 r:=public.finish_dividend_provider('marketstack','META',lease,jsonb_build_array(e||jsonb_build_object('value_per_share',0.54)),null);
 if r->>'error'<>'provider_primary_disagreement' or r->>'primary_rejected'<>'1' then raise exception 'Primary-backed rejection hidden';end if;
 -- An exact provider value must survive another vendor's proven rounding.
 insert into public.dividend_provider_tasks(provider,ticker,claim_token,next_sync_at) values('alpha_vantage','META',lease,now()+interval '10 minutes')
 on conflict(provider,ticker) do update set claim_token=excluded.claim_token,next_sync_at=excluded.next_sync_at;
 r:=public.finish_dividend_provider('alpha_vantage','META',lease,jsonb_build_array(e||jsonb_build_object('value_per_share',0.525)),null);
 if r->>'error' is not null or r->>'conflicts'<>'0' then raise exception 'Rounded vendor blocked primary-confirmed exact value';end if;
 -- Nothing in the reconciliation calls personal-income APIs or writes positions.
 if has_table_privilege('authenticated','public.issuer_dividend_reconciliations','SELECT') or has_function_privilege('anon','public.reconcile_issuer_dividend(text,jsonb)','EXECUTE') then raise exception 'Primary evidence exposed';end if;
 if has_function_privilege('authenticated','public.finish_primary_dividends(text,uuid,jsonb,text)','EXECUTE') then raise exception 'Issuer RPC exposed';end if;
 -- Exhausted budget cannot be treated as a stalled collector.
 insert into public.dividend_provider_tasks(provider,ticker) values('alpha_vantage','PRT') on conflict do nothing;
 insert into public.dividend_provider_usage(provider,usage_day,requests) values('alpha_vantage',current_date,20) on conflict(provider,usage_day) do update set requests=20;
 if exists(select 1 from public.claim_dividend_provider('alpha_vantage')) then raise exception 'Budget bypass';end if;
 if not exists(select 1 from jsonb_array_elements(public.international_queue_health()->'queues') q where q->>'queue'='alpha_vantage' and q->>'global_daily_remaining'='0' and q->>'stale'='false') then raise exception 'Exhausted budget misreported';end if;
 delete from public.dividend_provider_usage where provider='alpha_vantage' and usage_day=current_date;
 insert into public.dividend_provider_tasks(provider,ticker) select 'alpha_vantage',ticker from public.assets where active and type='stock_us' and currency='USD' on conflict do nothing;
 update public.dividend_provider_tasks set last_attempt_at=now(),next_sync_at=now()+interval '1 day',claim_token=null where provider='alpha_vantage';
 insert into public.issuer_dividend_policies values('AMZN','no_cash_dividends','https://ir.aboutamazon.com/faqs/default.aspx',now(),now()+interval '7 days')
 on conflict(ticker) do update set observed_at=excluded.observed_at,valid_until=excluded.valid_until;
 update public.dividend_provider_tasks set last_attempt_at=null,next_sync_at=now()-interval '30 days' where provider='alpha_vantage' and ticker='AMZN';
 insert into public.dividend_provider_tasks(provider,ticker,last_attempt_at,next_sync_at) values
  ('alpha_vantage','ZZFIRST',null,now()-interval '1 day'),('alpha_vantage','AAAGED',now()-interval '5 days',now()-interval '5 days')
 on conflict(provider,ticker) do update set last_attempt_at=excluded.last_attempt_at,next_sync_at=excluded.next_sync_at;
 select * into t from public.claim_dividend_provider('alpha_vantage');
 if t.ticker<>'ZZFIRST' then raise exception 'First pass starved';end if;
 perform public.finish_dividend_provider('alpha_vantage',t.ticker,t.claim_token,'[]','provider_calendar_unavailable');
 if not exists(select 1 from public.dividend_provider_tasks where provider='alpha_vantage' and ticker='ZZFIRST' and next_sync_at>=now()+interval '71 hours') then raise exception 'Refresh cadence exceeds free budget';end if;
 -- A subsequent positive announcement invalidates the dated no-dividend policy.
 insert into public.dividends(ticker,ex_date,value_per_share,type,source) values('AMZN',current_date+2,0.1,'dividend','yahoo');
 select * into t from public.claim_dividend_provider('alpha_vantage');
 if t.ticker<>'AMZN' then raise exception 'Fresh announcement suppressed by policy';end if;
 perform public.finish_dividend_provider('alpha_vantage',t.ticker,t.claim_token,'[]','provider_calendar_unavailable');
 select * into t from public.claim_dividend_provider('alpha_vantage');
 if t.ticker<>'AAAGED' then raise exception 'Aged task starved';end if;
end $$;
reset role;
rollback;

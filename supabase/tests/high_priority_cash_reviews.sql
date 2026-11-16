begin;
insert into public.assets(ticker,name,type,currency,quote_provider) select t,t,'stock_us','USD','finnhub' from unnest(array['ITA','SAP','MRX','PR']) t on conflict(ticker) do update set active=true,type='stock_us',currency='USD';
delete from public.issuer_dividend_reconciliations where ticker in('ITA','SAP','MRX','PR');
delete from public.reviewed_cash_event_applications;
delete from public.dividend_provider_adjudications where ticker in('ITA','SAP','MRX','PR');
delete from public.dividend_provider_conflicts where ticker in('ITA','SAP','MRX','PR');
delete from public.dividend_provider_events where ticker in('ITA','SAP','MRX','PR');
delete from public.dividends where ticker in('ITA','SAP','MRX','PR');
insert into public.dividend_provider_tasks(provider,ticker) select p,t from unnest(array['alpha_vantage','marketstack']) p cross join unnest(array['ITA','SAP','MRX','PR']) t on conflict do nothing;
insert into public.dividends(ticker,ex_date,value_per_share,type,source)
 select ticker,ex_date,prior_values[1],'dividend','yahoo' from public.reviewed_cash_events where ticker in('ITA','SAP') or ticker='PR' and ex_date='2026-06-16';
insert into public.dividend_provider_events(provider,ticker,ex_date,declaration_date,record_date,payment_date,value_per_share)
 select case when ticker in('MRX','PR') then 'marketstack' else 'alpha_vantage' end,ticker,ex_date,
 case when ticker='ITA' then '2025-09-05'::date when ticker='MRX' then '2026-11-05'::date else declaration_date end,record_date,payment_date,
 case when ticker='SAP' then 2.929075 else value_per_share end
 from public.reviewed_cash_events where not(ticker='PR' and ex_date='2026-06-16');
insert into public.dividend_provider_conflicts(provider,ticker,ex_date,declaration_date,record_date,payment_date,observed_value,reason,reference_events)
 values('alpha_vantage','MRX','2026-11-16','2026-11-03','2026-11-16','2026-12-02',0.16,'cross_provider','[]');
insert into auth.users(id,email,raw_user_meta_data) values('ab000000-0000-4000-8000-000000000097','qa-high-cash@test.invalid','{"full_name":"Cash QA"}');
select set_config('request.jwt.claim.sub','ab000000-0000-4000-8000-000000000097',true);
set local role authenticated;
do $$ declare w uuid;begin
 select id into w from public.wallets where user_id=auth.uid() limit 1;
 perform public.import_owned_transactions(w,'fixture.csv','[{"ticker":"PR","type":"buy","quantity":3,"price":10,"brokerage_fee":0,"transaction_date":"2026-01-02"},{"ticker":"PR","type":"dividend","quantity":3,"price":0.16,"brokerage_fee":0,"transaction_date":"2026-06-30"}]');
end $$;
reset role;
set local role service_role;
do $$ declare r record;result jsonb;events jsonb;before_hash text;raw_hash text;lease uuid:='11111111-1111-4111-8111-111111111111';begin
 select md5(jsonb_build_array((select jsonb_agg(t order by id) from transactions t),(select jsonb_agg(t order by id) from positions t),(select jsonb_agg(t order by id) from wallet_income t))::text) into before_hash;
 select md5(jsonb_agg(t order by provider,ticker,ex_date)::text) into raw_hash from public.dividend_provider_events t;
 for r in select ticker,ex_date from public.reviewed_cash_events loop
  result:=public.apply_reviewed_cash_event(r.ticker,r.ex_date);
  if result->>'saved'<>'1' then raise exception 'Review failed: %',result;end if;
  perform public.apply_reviewed_cash_event(r.ticker,r.ex_date);
 end loop;
 if (select count(*) from dividends where ticker in('ITA','SAP','MRX','PR') and source='issuer_primary')<>7 then raise exception 'Missing reviewed calendar';end if;
 if not exists(select 1 from dividends where ticker='SAP' and value_per_share=2.940725 and payment_date='2026-05-15') then raise exception 'Final ADR amount incorrect';end if;
 if (select count(*) from dividends where ticker='ITA' and value_per_share in(0.151325,0.16358,0.25052))<>3 then raise exception 'Original-share basis lost';end if;
 if exists(select 1 from issuer_dividend_reconciliations where ticker='MRX') then raise exception 'Unknown board date invented';end if;
 if not exists(select 1 from reviewed_cash_events where ticker='MRX' and declaration_date is null and announcement_date='2026-11-05') then raise exception 'Announcement not separated';end if;
 if not exists(select 1 from dividend_provider_conflicts where ticker='MRX' and declaration_date='2026-11-03' and metadata_only) then raise exception 'Original declaration not retained';end if;
 if raw_hash<>(select md5(jsonb_agg(t order by provider,ticker,ex_date)::text) from public.dividend_provider_events t) then raise exception 'Raw evidence changed';end if;
 perform public.store_yahoo_dividend_events('[{"ticker":"ITA","ex_date":"2026-09-15","value_per_share":0.083667,"type":"dividend"},{"ticker":"SAP","ex_date":"2026-05-05","value_per_share":2.929,"type":"dividend"}]');
 if not exists(select 1 from dividends where ticker='ITA' and ex_date='2026-09-15' and value_per_share=0.25052 and source='issuer_primary') or not exists(select 1 from dividends where ticker='SAP' and value_per_share=2.940725 and source='issuer_primary') then raise exception 'Yahoo overwrote primary evidence';end if;
 -- Original MRX result now passes using the existing strict metadata classifier.
 update dividend_provider_tasks set claim_token=lease,next_sync_at=now()+interval '10 minutes' where provider='alpha_vantage' and ticker='MRX';
 result:=finish_dividend_provider('alpha_vantage','MRX',lease,'[{"ex_date":"2026-11-16","declaration_date":"2026-11-03","record_date":"2026-11-16","payment_date":"2026-12-02","value_per_share":0.16}]',null);
 if result->>'error' is not null or result->>'conflicts'<>'0' then raise exception 'MRX replay failed: %',result;end if;
 -- Final gross differs materially from the initial rate: never round it away.
 update dividend_provider_tasks set claim_token=lease,next_sync_at=now()+interval '10 minutes' where provider='alpha_vantage' and ticker='SAP';
 result:=finish_dividend_provider('alpha_vantage','SAP',lease,'[{"ex_date":"2026-05-05","declaration_date":"2026-04-14","record_date":"2026-05-05","payment_date":"2026-05-15","value_per_share":2.929075}]',null);
 if result->>'error'<>'provider_primary_disagreement' then raise exception 'Old ADR estimate not rejected';end if;
 -- Explicit hold remains partial and never becomes a second public payment.
 update dividend_provider_tasks set claim_token=lease,next_sync_at=now()+interval '10 minutes',last_success_at=null where provider='marketstack' and ticker='PR';
 result:=finish_dividend_provider('marketstack','PR',lease,'[{"ex_date":"2026-06-30","declaration_date":"2026-04-21","record_date":"2026-06-30","payment_date":"2026-07-10","value_per_share":0.03}]',null);
 if result->>'error'<>'provider_distribution_unverified' or result->>'held_events'<>'1' then raise exception 'Unverified PR event not held';end if;
 if exists(select 1 from dividends where ticker='PR' and ex_date='2026-06-30') then raise exception 'Unverified PR distribution published';end if;
 if exists(select 1 from dividend_provider_tasks where ticker='PR' and provider='marketstack' and last_success_at is not null) then raise exception 'Hold marked complete';end if;
 update dividend_provider_tasks set claim_token=lease,next_sync_at=now()+interval '10 minutes',last_success_at=null where provider='marketstack' and ticker='PR';
 result:=finish_partial_dividend_provider('marketstack','PR',lease,'[{"ex_date":"2026-12-17","declaration_date":"2026-11-04","record_date":"2026-12-17","payment_date":"2026-12-31","value_per_share":0.16}]',null,1);
 if result->>'error'<>'provider_partial_invalid_amount' or result->>'missing'<>'1' then raise exception 'Partial result falsely complete: %',result;end if;
 if exists(select 1 from dividend_provider_tasks where ticker='PR' and provider='marketstack' and last_success_at is not null) then raise exception 'Partial provider marked complete';end if;
 -- Explicit prior values do not authorize unrelated changes.
 update dividends set value_per_share=99 where ticker='SAP';
 begin perform apply_reviewed_cash_event('SAP','2026-05-05');raise exception 'Unreviewed amount accepted';exception when raise_exception then if sqlerrm<>'Unreviewed public conflict' then raise;end if;end;
 if before_hash<>md5(jsonb_build_array((select jsonb_agg(t order by id) from transactions t),(select jsonb_agg(t order by id) from positions t),(select jsonb_agg(t order by id) from wallet_income t))::text) then raise exception 'Financial records changed';end if;
 if has_table_privilege('authenticated','public.reviewed_cash_events','SELECT') or has_table_privilege('anon','public.reviewed_provider_holds','SELECT') or has_function_privilege('anon','public.apply_reviewed_cash_event(text,date)','EXECUTE') then raise exception 'Private evidence exposed';end if;
end $$;
rollback;

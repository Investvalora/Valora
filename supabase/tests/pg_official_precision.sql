begin;
insert into public.assets(ticker,name,type,currency,quote_provider) values('PG','Procter & Gamble','stock_us','USD','finnhub') on conflict(ticker) do update set active=true,type='stock_us',currency='USD';
delete from public.issuer_dividend_reconciliations where ticker='PG';
delete from public.dividend_provider_adjudications where ticker='PG';
delete from public.dividend_provider_conflicts where ticker='PG';
delete from public.dividends where ticker='PG';
delete from public.dividend_provider_events where ticker='PG';
delete from public.supplemental_dividend_observations where ticker='PG';
insert into public.dividend_provider_tasks(provider,ticker) values('alpha_vantage','PG'),('marketstack','PG') on conflict do nothing;
insert into public.dividend_provider_events(provider,ticker,ex_date,declaration_date,record_date,payment_date,value_per_share)
 select 'marketstack',ticker,ex_date,declaration_date,record_date,payment_date,round(value_per_share,2) from public.cash_issuer_reviews where ticker='PG';
insert into public.dividends(ticker,ex_date,type,value_per_share,source)
 select ticker,ex_date,'dividend',round(value_per_share,3),'yahoo' from public.cash_issuer_reviews where ticker='PG';
insert into auth.users(id,email,raw_user_meta_data) values('ab000000-0000-4000-8000-000000000096','qa-pg@test.invalid','{"full_name":"PG QA"}');
select set_config('request.jwt.claim.sub','ab000000-0000-4000-8000-000000000096',true);
set local role authenticated;
do $$ declare w uuid;begin
 select id into w from public.wallets where user_id=auth.uid() limit 1;
 perform public.import_owned_transactions(w,'fixture.csv','[{"ticker":"PG","type":"buy","quantity":1,"price":100,"brokerage_fee":0,"transaction_date":"2026-01-02"},{"ticker":"PG","type":"dividend","quantity":1,"price":1.089,"brokerage_fee":0,"transaction_date":"2026-08-17"}]');
end $$;
reset role;
set local role service_role;
do $$ declare events jsonb;r record;result jsonb;before_hash text;vendor_hash text;lease uuid:='11111111-1111-4111-8111-111111111111';begin
 select md5(jsonb_build_array((select jsonb_agg(t order by id) from public.transactions t),(select jsonb_agg(t order by id) from public.positions t),(select jsonb_agg(t order by id) from public.wallet_income t))::text) into before_hash;
 select md5(jsonb_agg(t order by ex_date)::text) into vendor_hash from public.dividend_provider_events t where provider='marketstack' and ticker='PG';
 select jsonb_agg(jsonb_build_object('ex_date',ex_date,'declaration_date',declaration_date,'record_date',record_date,'payment_date',payment_date,'value_per_share',value_per_share)) into events from public.cash_issuer_reviews where ticker='PG';
 update public.dividend_provider_tasks set claim_token=lease,next_sync_at=now()+interval '10 minutes' where provider='alpha_vantage' and ticker='PG';
 result:=public.finish_dividend_provider('alpha_vantage','PG',lease,events,null);
 if result->>'error'<>'provider_event_conflict' then raise exception 'Original failure not reproduced: %',result;end if;
 if (select count(*) from public.dividend_provider_conflicts where ticker='PG' and reason='cross_provider')<>4 then raise exception 'Expected four quarantined events';end if;
 -- Release the quarantined observations only after matching reviewed facts.
 insert into public.dividend_provider_events(provider,ticker,ex_date,declaration_date,record_date,payment_date,value_per_share,observed_at)
 select c.provider,c.ticker,c.ex_date,c.declaration_date,c.record_date,c.payment_date,c.observed_value,c.observed_at
 from public.dividend_provider_conflicts c join public.cash_issuer_reviews reviewed
 on reviewed.ticker=c.ticker and reviewed.ex_date=c.ex_date and reviewed.declaration_date=c.declaration_date and reviewed.record_date=c.record_date and reviewed.payment_date=c.payment_date and reviewed.value_per_share=c.observed_value
 where c.ticker='PG' and c.provider='alpha_vantage' and c.reason='cross_provider' on conflict do nothing;
 for r in select ticker,ex_date from public.cash_issuer_reviews where ticker='PG' loop
  result:=public.apply_cash_issuer_review(r.ticker,r.ex_date);
  if result->>'saved'<>'1' then raise exception 'Review failed: %',result;end if;
  perform public.apply_cash_issuer_review(r.ticker,r.ex_date);
 end loop;
 if (select count(*) from public.dividends where ticker='PG' and source='issuer_primary')<>4 then raise exception 'Missing or duplicate calendar';end if;
 if (select count(*) from public.issuer_dividend_reconciliations where ticker='PG' and (prior_row->>'value_per_share')::numeric=round(value_per_share,3))<>4 then raise exception 'Prior values not audited';end if;
 if (select count(*) from public.dividend_provider_conflicts where ticker='PG' and issuer_reviewed_at is not null and not metadata_only)<>4 then raise exception 'Economic review not retained';end if;
 update public.dividend_provider_tasks set claim_token=lease,next_sync_at=now()+interval '10 minutes' where provider='alpha_vantage' and ticker='PG';
 result:=public.finish_dividend_provider('alpha_vantage','PG',lease,events,null);
 if result->>'error' is not null or result->>'conflicts'<>'0' then raise exception 'Exact failed batch still rejected: %',result;end if;
 -- Real discrepancies and wrong calendars must still fail after the repair.
 update public.dividend_provider_tasks set claim_token=lease,next_sync_at=now()+interval '10 minutes' where provider='alpha_vantage' and ticker='PG';
 result:=public.finish_dividend_provider('alpha_vantage','PG',lease,jsonb_set(jsonb_build_array(events->0),'{0,value_per_share}','1.12'),null);
 if result->>'error'<>'provider_primary_disagreement' then raise exception 'Wrong amount accepted: %',result;end if;
 update public.dividend_provider_tasks set claim_token=lease,next_sync_at=now()+interval '10 minutes' where provider='alpha_vantage' and ticker='PG';
 result:=public.finish_dividend_provider('alpha_vantage','PG',lease,jsonb_set(jsonb_build_array(events->0),'{0,payment_date}','"2026-12-30"'),null);
 if result->>'error'<>'provider_event_conflict' then raise exception 'Wrong payment accepted: %',result;end if;
 update public.dividends set value_per_share=1.12,source='yahoo' where ticker='PG' and ex_date='2026-01-23';
 begin perform public.apply_cash_issuer_review('PG','2026-01-23');raise exception 'Unreviewed Yahoo amount accepted';exception when raise_exception then if sqlerrm<>'Unreviewed public conflict' then raise;end if;end;
 update public.dividends set value_per_share=1.057,source='marketstack' where ticker='PG' and ex_date='2026-01-23';
 begin perform public.apply_cash_issuer_review('PG','2026-01-23');raise exception 'Non-Yahoo amount overwritten';exception when raise_exception then if sqlerrm<>'Unreviewed public conflict' then raise;end if;end;
 if vendor_hash<>(select md5(jsonb_agg(t order by ex_date)::text) from public.dividend_provider_events t where provider='marketstack' and ticker='PG') then raise exception 'Vendor snapshots modified';end if;
 if before_hash<>md5(jsonb_build_array((select jsonb_agg(t order by id) from public.transactions t),(select jsonb_agg(t order by id) from public.positions t),(select jsonb_agg(t order by id) from public.wallet_income t))::text) then raise exception 'Financial data changed';end if;
end $$;
rollback;

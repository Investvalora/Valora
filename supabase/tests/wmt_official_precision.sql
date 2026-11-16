begin;
-- This fixture exercises the four installments declared in 2026 only.
delete from public.cash_issuer_reviews where ticker='WMT' and ex_date<'2026-01-01';
insert into public.assets(ticker,name,type,currency,quote_provider) values('WMT','Walmart','stock_us','USD','finnhub') on conflict(ticker) do update set active=true,type='stock_us',currency='USD';
delete from public.issuer_dividend_reconciliations where ticker='WMT';
delete from public.dividends where ticker='WMT';
delete from public.dividend_provider_events where ticker='WMT';
delete from public.supplemental_dividend_observations where ticker='WMT';
insert into public.dividend_provider_tasks(provider,ticker) values('alpha_vantage','WMT') on conflict do nothing;
insert into public.dividend_provider_events(provider,ticker,ex_date,declaration_date,record_date,payment_date,value_per_share)
 select 'alpha_vantage',ticker,ex_date,declaration_date,record_date,payment_date,value_per_share from public.cash_issuer_reviews where ticker='WMT';
insert into public.dividends(ticker,ex_date,type,value_per_share,source)
 select ticker,ex_date,'dividend',0.248,'yahoo' from public.cash_issuer_reviews where ticker='WMT' and ex_date<'2026-12-01';
insert into auth.users(id,email,raw_user_meta_data) values('ab000000-0000-4000-8000-000000000095','qa-wmt@test.invalid','{"full_name":"WMT QA"}');
select set_config('request.jwt.claim.sub','ab000000-0000-4000-8000-000000000095',true);
set local role authenticated;
do $$ declare w uuid;begin
 select id into w from public.wallets where user_id=auth.uid() limit 1;
 perform public.import_owned_transactions(w,'fixture.csv','[{"ticker":"WMT","type":"buy","quantity":1,"price":100,"brokerage_fee":0,"transaction_date":"2026-01-02"},{"ticker":"WMT","type":"dividend","quantity":1,"price":0.248,"brokerage_fee":0,"transaction_date":"2026-09-08"}]');
end $$;
reset role;
set local role service_role;
do $$ declare r record;before_hash text;after_hash text;result jsonb;lease uuid:='11111111-1111-4111-8111-111111111111';events jsonb;begin
 select md5(jsonb_build_array((select jsonb_agg(t order by id) from public.transactions t),(select jsonb_agg(t order by id) from public.positions t),(select jsonb_agg(t order by id) from public.wallet_income t))::text) into before_hash;
 for r in select ticker,ex_date from public.cash_issuer_reviews where ticker='WMT' loop
  result:=public.apply_cash_issuer_review(r.ticker,r.ex_date);
  if result->>'saved'<>'1' then raise exception 'WMT not reconciled: %',result;end if;
  perform public.apply_cash_issuer_review(r.ticker,r.ex_date);
 end loop;
 if (select count(*) from public.dividends where ticker='WMT' and value_per_share=0.2475 and source='issuer_primary')<>4 then raise exception 'Precision not corrected or duplicated';end if;
 if (select count(*) from public.issuer_dividend_reconciliations where ticker='WMT' and (prior_row->>'value_per_share')::numeric=0.248)<>3 then raise exception 'Prior rounded values not audited';end if;
 -- A replayed Nasdaq batch must now match instead of returning three conflicts.
 insert into public.international_announcement_tasks(ticker,claim_token,next_sync_at) values('WMT',lease,now()+interval '10 minutes') on conflict(ticker) do update set claim_token=excluded.claim_token,next_sync_at=excluded.next_sync_at;
 select jsonb_agg(jsonb_build_object('ex_date',ex_date,'declaration_date',declaration_date,'record_date',record_date,'payment_date',payment_date,'value_per_share',value_per_share)) into events from public.cash_issuer_reviews where ticker='WMT';
 result:=public.finish_partial_international_announcements('WMT',lease,events,1);
 if result->>'conflicts'<>'0' or result->>'error'<>'nasdaq_partial_coverage' then raise exception 'Workflow still fails reviewed WMT: %',result;end if;
 -- Only the explicitly reviewed Yahoo rounding is eligible; neither a different
 -- amount, a non-Yahoo source, nor a conflicting calendar may be overwritten.
 update public.dividends set value_per_share=0.249,source='yahoo' where ticker='WMT' and ex_date='2026-03-20';
 begin perform public.apply_cash_issuer_review('WMT','2026-03-20');raise exception 'Unreviewed amount accepted';exception when raise_exception then if sqlerrm<>'Unreviewed public conflict' then raise;end if;end;
 update public.dividends set value_per_share=0.248,source='alpha_vantage' where ticker='WMT' and ex_date='2026-03-20';
 begin perform public.apply_cash_issuer_review('WMT','2026-03-20');raise exception 'Non-Yahoo rounding accepted';exception when raise_exception then if sqlerrm<>'Unreviewed public conflict' then raise;end if;end;
 update public.dividends set value_per_share=0.248,source='yahoo',payment_date='2026-04-07' where ticker='WMT' and ex_date='2026-03-20';
 begin perform public.apply_cash_issuer_review('WMT','2026-03-20');raise exception 'Wrong payment accepted';exception when raise_exception then if sqlerrm<>'Unreviewed public conflict' then raise;end if;end;
 select md5(jsonb_build_array((select jsonb_agg(t order by id) from public.transactions t),(select jsonb_agg(t order by id) from public.positions t),(select jsonb_agg(t order by id) from public.wallet_income t))::text) into after_hash;
 if before_hash<>after_hash then raise exception 'Personal records changed';end if;
end $$;
rollback;

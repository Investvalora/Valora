begin;
insert into public.assets(ticker,name,type,currency,quote_provider) values
 ('GOOGL','Alphabet','stock_us','USD','finnhub'),('KO','Coca-Cola','stock_us','USD','finnhub'),('MCD','McDonalds','stock_us','USD','finnhub'),('DIS','Disney','stock_us','USD','finnhub'),('GGG','Graco','stock_us','USD','finnhub'),('WMT','Walmart','stock_us','USD','finnhub')
 on conflict(ticker) do update set active=true,type='stock_us',currency='USD';
delete from public.issuer_dividend_reconciliations where ticker in('GOOGL','KO','MCD','DIS','GGG');
delete from public.dividends where ticker in('GOOGL','KO','MCD','DIS','GGG','WMT');
delete from public.dividend_provider_conflicts where ticker in('DIS','GGG');
delete from public.dividend_provider_adjudications where ticker in('DIS','GGG');
delete from public.supplemental_dividend_observations where ticker in('GOOGL','KO','MCD');
delete from public.dividend_provider_events where ticker in('DIS','GGG');
insert into public.supplemental_dividend_observations(provider,ticker,event_id,snapshot_hash,ex_date,record_date,payment_date,declaration_date,currency,value_per_share,distribution)
 select 'massive',ticker,'fixture_'||ticker,'fixture',ex_date,record_date,payment_date,case when ticker='GOOGL' then declaration_date-1 else declaration_date end,'USD',value_per_share,'recurring'
 from public.cash_issuer_reviews where ticker in('GOOGL','KO','MCD');
insert into public.dividend_provider_tasks(provider,ticker) values('alpha_vantage','DIS'),('alpha_vantage','GGG') on conflict do nothing;
insert into public.dividend_provider_events(provider,ticker,ex_date,declaration_date,record_date,payment_date,value_per_share)
 select 'alpha_vantage',ticker,ex_date,declaration_date,record_date,payment_date,value_per_share from public.cash_issuer_reviews where ticker in('DIS','GGG');
insert into public.dividends(ticker,ex_date,value_per_share,payment_date,type,source) values('DIS','2025-12-15',0.75,'2025-12-29','dividend','yahoo');
insert into public.dividend_provider_conflicts(provider,ticker,ex_date,declaration_date,record_date,payment_date,observed_value,reason,reference_events)
 select 'marketstack',ticker,ex_date,declaration_date,record_date,payment_date,case when ticker='GGG' then 0.3 else value_per_share end,'cross_provider','[]'::jsonb from public.cash_issuer_reviews where ticker in('DIS','GGG');
-- Nonempty personal data makes the preservation assertion exercise real rows.
insert into auth.users(id,email,raw_user_meta_data) values('ab000000-0000-4000-8000-000000000094','qa-cash-review@test.invalid','{"full_name":"Cash review QA"}');
select set_config('request.jwt.claim.sub','ab000000-0000-4000-8000-000000000094',true);
set local role authenticated;
do $$ declare w uuid;begin
 select id into w from public.wallets where user_id=auth.uid() limit 1;
 perform public.import_owned_transactions(w,'fixture.csv','[{"ticker":"GOOGL","type":"buy","quantity":1,"price":100,"brokerage_fee":0,"transaction_date":"2026-01-02"},{"ticker":"GOOGL","type":"dividend","quantity":1,"price":0.22,"brokerage_fee":0,"transaction_date":"2026-09-14"}]');
end $$;
reset role;
set local role service_role;
do $$ declare e record;r jsonb;before_hash text;after_hash text;lease uuid:='11111111-1111-4111-8111-111111111111';begin
 select md5(jsonb_build_array((select jsonb_agg(t order by id) from public.transactions t),(select jsonb_agg(t order by id) from public.positions t),(select jsonb_agg(t order by id) from public.wallet_income t))::text) into before_hash;
 for e in select ticker,ex_date from public.cash_issuer_reviews loop
  r:=public.apply_cash_issuer_review(e.ticker,e.ex_date);
  if r->>'saved'<>'1' then raise exception 'Reviewed source not applied: % %',e,r;end if;
  perform public.apply_cash_issuer_review(e.ticker,e.ex_date);
 end loop;
 if (select count(*) from public.dividends where ticker in('GOOGL','KO','MCD','DIS','GGG'))<>5 then raise exception 'Duplicate/missing events';end if;
 if not exists(select 1 from public.issuer_dividend_reconciliations where ticker='DIS' and prior_row->>'payment_date'='2025-12-29') then raise exception 'Prior payment audit lost';end if;
 if not exists(select 1 from public.dividend_provider_adjudications where ticker='GGG' and observed_value=0.3 and primary_value=0.295 and disposition='rejected') then raise exception 'Rounded vendor not rejected';end if;
 if exists(select 1 from public.dividend_provider_conflicts where ticker in('DIS','GGG') and issuer_reviewed_at is null) then raise exception 'Conflict review not tracked';end if;
 if not exists(select 1 from public.supplemental_dividend_observations where ticker='GOOGL' and declaration_date='2026-10-27') then raise exception 'Vendor date overwritten';end if;
 if not exists(select 1 from public.supplemental_dividend_evidence where ticker='GOOGL' and evidence_status='official_metadata_difference') then raise exception 'Declaration-only difference classified as financial conflict';end if;
 insert into public.supplemental_dividend_observations(provider,ticker,event_id,snapshot_hash,ex_date,record_date,payment_date,declaration_date,currency,value_per_share,distribution)
 select 'massive',ticker,'conflicting_ex','fixture',ex_date-1,record_date,payment_date,declaration_date,'USD',value_per_share,'recurring' from public.cash_issuer_reviews where ticker='GOOGL';
 begin perform public.apply_cash_issuer_review('GOOGL','2026-12-07');raise exception 'Conflicting independent ex accepted';exception when raise_exception then if sqlerrm<>'Conflicting independent ex' then raise;end if;end;
 delete from public.supplemental_dividend_observations where ticker='GOOGL' and event_id='conflicting_ex';
 update public.dividends set payment_date='2026-12-16' where ticker='KO';
 begin perform public.apply_cash_issuer_review('KO','2026-12-01');raise exception 'Unreviewed public conflict accepted';exception when raise_exception then if sqlerrm<>'Unreviewed public conflict' then raise;end if;end;
 update public.dividends set payment_date='2026-12-15' where ticker='KO';
 begin perform public.apply_cash_issuer_review('WMT',current_date);raise exception 'Unreviewed event accepted';exception when raise_exception then if sqlerrm<>'Unreviewed issuer event' then raise;end if;end;
 insert into public.international_announcement_tasks(ticker,claim_token,next_sync_at) values('WMT',lease,now()+interval '10 minutes') on conflict(ticker) do update set claim_token=excluded.claim_token,next_sync_at=excluded.next_sync_at,last_success_at=null;
 r:=public.finish_partial_international_announcements('WMT',lease,jsonb_build_array(jsonb_build_object('ex_date',current_date-2,'declaration_date',current_date-10,'record_date',current_date-2,'payment_date',current_date+2,'value_per_share',0.2475)),1);
 if r->>'error'<>'nasdaq_partial_coverage' or r->>'saved'<>'1' then raise exception 'Partial Nasdaq lost valid event: %',r;end if;
 if exists(select 1 from public.international_announcement_tasks where ticker='WMT' and (claim_token is not null or last_success_at is not null)) then raise exception 'Partial falsely completed';end if;
 begin perform public.finish_partial_international_announcements('WMT',lease,'[]',1);raise exception 'Reused lease accepted';exception when raise_exception then if sqlerrm<>'Collector lease unavailable' then raise;end if;end;
 select md5(jsonb_build_array((select jsonb_agg(t order by id) from public.transactions t),(select jsonb_agg(t order by id) from public.positions t),(select jsonb_agg(t order by id) from public.wallet_income t))::text) into after_hash;
 if before_hash<>after_hash then raise exception 'Personal financial records changed';end if;
 if has_function_privilege('anon','public.apply_cash_issuer_review(text,date)','execute') or has_table_privilege('authenticated','public.cash_issuer_reviews','select') then raise exception 'Review API exposed';end if;
end $$;
rollback;

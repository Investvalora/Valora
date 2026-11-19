begin;
insert into public.assets(ticker,name,type,currency,quote_provider) values
 ('RA','RA QA','stock_us','USD','brapi'),('GOOG','Alphabet QA','stock_us','USD','brapi'),('GGG','Graco QA','stock_us','USD','brapi') on conflict do nothing;
insert into public.dividend_provider_tasks(provider,ticker) values('alpha_vantage','GGG') on conflict do nothing;
insert into public.international_announcement_tasks(ticker) values('GOOG') on conflict do nothing;
delete from public.dividends where (ticker='RA' and ex_date in('2026-10-09','2026-11-12','2026-12-10')) or (ticker='GOOG' and ex_date='2026-12-07') or (ticker='GGG' and ex_date='2026-10-19');
delete from public.issuer_dividend_reconciliations where (ticker='RA' and ex_date in('2026-10-09','2026-11-12','2026-12-10')) or (ticker='GOOG' and ex_date='2026-12-07') or (ticker='GGG' and ex_date='2026-10-19');
delete from public.dividend_provider_events where (ticker='RA' and payment_date='2026-12-24') or (ticker='GGG' and ex_date='2026-10-19');
do $$ declare result jsonb;finance_hash text;vendor_hash text;begin
 select md5(jsonb_build_array((select jsonb_agg(t order by id) from transactions t),(select jsonb_agg(t order by id) from positions t),(select jsonb_agg(t order by id) from wallet_income t))::text) into finance_hash;
 select md5(coalesce(jsonb_agg(t order by provider,ticker,ex_date)::text,'[]')) into vendor_hash from public.dividend_provider_events t;
 -- Explicit issuer ex date works without fabricating a second vendor observation.
 result:=public.apply_cash_issuer_review('RA','2026-12-10');
 if result->>'saved'<>'1' then raise exception 'Explicit issuer ex rejected: %',result;end if;
 perform public.apply_cash_issuer_review('RA','2026-12-10');
 if (select count(*) from public.dividends where ticker='RA' and payment_date='2026-12-24')<>1 then raise exception 'RA duplicated';end if;
 if not exists(select 1 from public.dividends where ticker='RA' and ex_date='2026-12-10' and record_date='2026-12-10' and payment_date='2026-12-24' and value_per_share=0.118 and source='issuer_primary') then raise exception 'RA missing';end if;
 result:=public.apply_cash_issuer_review('GOOG','2026-12-07');
 if result->>'saved'<>'1' then raise exception 'Exchange ex rejected: %',result;end if;
 if not exists(select 1 from public.cash_issuer_reviews where ticker='GOOG' and declaration_date='2026-10-28' and ex_evidence_snapshot->'reviewed_excerpt'->>'declarationDate'='10/27/2026') then raise exception 'Declaration disagreement erased';end if;
 result:=public.store_international_announcements('GOOG','[{"ex_date":"2026-12-07","record_date":"2026-12-07","payment_date":"2026-12-14","declaration_date":"2026-10-27","value_per_share":0.22}]');
 if result->>'conflicts'<>'0' or not exists(select 1 from public.dividends where ticker='GOOG' and ex_date='2026-12-07' and source='issuer_primary' and value_per_share=0.22) then raise exception 'Nasdaq replay replaced issuer review';end if;
 -- Existing reviews without explicit ex evidence still require the independent observation.
 result:=public.apply_cash_issuer_review('GGG','2026-10-19');
 if result->>'waiting'<>'independent_ex' then raise exception 'Legacy review became permissive';end if;
 if vendor_hash<>(select md5(coalesce(jsonb_agg(t order by provider,ticker,ex_date)::text,'[]')) from public.dividend_provider_events t) then raise exception 'Vendor evidence changed';end if;
 if finance_hash<>(select md5(jsonb_build_array((select jsonb_agg(t order by id) from transactions t),(select jsonb_agg(t order by id) from positions t),(select jsonb_agg(t order by id) from wallet_income t))::text)) then raise exception 'Private financial record changed';end if;
 -- Explicit evidence is not permission to overwrite unrelated values.
 update public.dividends set value_per_share=99 where ticker='RA' and ex_date='2026-12-10';
 begin perform public.apply_cash_issuer_review('RA','2026-12-10');raise exception 'Unexpected overwrite';exception when raise_exception then if SQLERRM<>'Unreviewed public conflict' then raise;end if;end;
end $$;
insert into public.dividend_provider_events(provider,ticker,ex_date,declaration_date,record_date,payment_date,value_per_share) values('alpha_vantage','GGG','2026-10-19','2026-09-11','2026-10-19','2026-11-04',0.295);
do $$ declare result jsonb;begin
 result:=public.apply_cash_issuer_review('GGG','2026-10-19');
 if result->>'saved'<>'1' or not exists(select 1 from public.dividends where ticker='GGG' and payment_date='2026-11-04' and value_per_share=0.295 and source='issuer_primary') then raise exception 'GGG precision lost';end if;
 begin
  update public.cash_issuer_reviews set ex_evidence_basis='issuer_explicit',ex_evidence_snapshot='{}',ex_source_url=source_url where ticker='GGG' and ex_date='2026-10-19';
  raise exception 'Empty snapshot accepted';
 exception when check_violation then null;end;
 if has_table_privilege('authenticated','public.cash_issuer_reviews','INSERT') or has_table_privilege('authenticated','public.cash_issuer_reviews','UPDATE') or has_function_privilege('authenticated','public.apply_cash_issuer_review(text,date)','execute') then raise exception 'Review exposed to user';end if;
 if not exists(select 1 from public.reviewed_provider_holds where ticker='PR' and value_per_share=0.03) then raise exception 'PR hold lost';end if;
end $$;
rollback;

begin;
insert into public.assets(ticker,name,type,currency,quote_provider) values('VG','Venture Global','stock_us','USD','finnhub'),('WMT','Walmart','stock_us','USD','finnhub') on conflict(ticker) do update set active=true,type='stock_us',currency='USD';
create temporary table reviewed_events as select * from public.cash_issuer_reviews where (ticker='VG' and ex_date in('2025-12-15','2026-03-16')) or (ticker='WMT' and ex_date='2025-12-12');
delete from public.issuer_dividend_reconciliations where (ticker,ex_date) in(select ticker,ex_date from reviewed_events);
delete from public.dividend_provider_adjudications where (ticker,ex_date) in(select ticker,ex_date from reviewed_events);
delete from public.dividend_provider_conflicts where (ticker,ex_date) in(select ticker,ex_date from reviewed_events);
delete from public.dividend_provider_events where (ticker,ex_date) in(select ticker,ex_date from reviewed_events);
delete from public.dividends where (ticker,ex_date) in(select ticker,ex_date from reviewed_events);
insert into public.dividend_provider_tasks(provider,ticker) select distinct p,ticker from reviewed_events cross join unnest(array['alpha_vantage','marketstack']) p on conflict do nothing;
insert into public.dividend_provider_events(provider,ticker,ex_date,declaration_date,record_date,payment_date,value_per_share)
 select p,ticker,ex_date,declaration_date,record_date,payment_date,case when p='marketstack' then round(value_per_share,2) else value_per_share end from reviewed_events cross join unnest(array['alpha_vantage','marketstack']) p;
insert into public.dividends(ticker,ex_date,value_per_share,type,source,record_date,payment_date)
 select ticker,ex_date,value_per_share,'dividend','alpha_vantage',record_date,payment_date from reviewed_events;
grant select on reviewed_events to service_role;
set local role service_role;
do $$ declare reviewed record;result jsonb;event jsonb;lease uuid:='11111111-1111-4111-8111-111111111111';snapshot text;begin
 select md5(jsonb_agg(t order by provider,ticker,ex_date)::text) into snapshot from public.dividend_provider_events t;
 if (select count(*) from reviewed_events)<>3 then raise exception 'Missing catalog entries';end if;
 for reviewed in select * from reviewed_events loop
  result:=public.apply_cash_issuer_review(reviewed.ticker,reviewed.ex_date);
  if result->>'saved'<>'1' then raise exception 'Review failed: %',result;end if;
  perform public.apply_cash_issuer_review(reviewed.ticker,reviewed.ex_date);
  event:=jsonb_build_array(jsonb_build_object('ex_date',reviewed.ex_date,'declaration_date',reviewed.declaration_date,'record_date',reviewed.record_date,'payment_date',reviewed.payment_date,'value_per_share',round(reviewed.value_per_share,2)));
  update public.dividend_provider_tasks set claim_token=lease,next_sync_at=now()+interval '10 minutes' where provider='marketstack' and ticker=reviewed.ticker;
  result:=public.finish_dividend_provider('marketstack',reviewed.ticker,lease,event,null);
  if result->>'error'<>'provider_precision_limited' then raise exception 'Rounded provider still operational failure: %',result;end if;
  if not exists(select 1 from public.dividends where ticker=reviewed.ticker and ex_date=reviewed.ex_date and value_per_share=reviewed.value_per_share and source='issuer_primary') then raise exception 'Official amount overwritten';end if;
 end loop;
 if snapshot<>(select md5(jsonb_agg(t order by provider,ticker,ex_date)::text) from public.dividend_provider_events t) then raise exception 'Vendor snapshots changed';end if;
end $$;
rollback;

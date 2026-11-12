begin;
insert into public.assets(ticker,name,type,currency,quote_provider) values('BMN','BlackRock 2037 Municipal Target Term Trust','stock_us','USD','finnhub'),('META','Meta Platforms','stock_us','USD','finnhub') on conflict(ticker) do nothing;
delete from public.issuer_dividend_reconciliations where ticker in('BMN','META');
delete from public.dividends where ticker in('BMN','META');
insert into public.dividends(ticker,ex_date,payment_date,value_per_share,type,source) values('BMN','2026-10-15',null,0.099,'dividend','yahoo'),('META','2025-12-15','2025-12-29',0.525,'dividend','yahoo');
set local role service_role;
do $$ declare e jsonb;r jsonb;begin
 e:='{"declaration_date":"2026-09-10","ex_date":"2026-10-15","record_date":"2026-10-15","payment_date":"2026-11-02","value_per_share":0.09925,"source_url":"https://www.blackrock.com/us/individual/literature/press-release/9-10-2026-pr-div-release.pdf","ex_date_source_url":"https://www.blackrock.com/us/individual/literature/press-release/9-10-2026-pr-div-release.pdf"}';
 r:=public.reconcile_issuer_dividend('BMN',e);if r->>'saved'<>'1' then raise exception 'BMN not reconciled';end if;
 if not exists(select 1 from public.dividends where ticker='BMN' and value_per_share=0.09925 and payment_date='2026-11-02') then raise exception 'BMN amount/calendar lost';end if;
 r:=public.reconcile_issuer_dividend('BMN',e||'{"value_per_share":0.1}');if r->>'conflicts'<>'1' then raise exception 'BMN real conflict hidden';end if;
 e:='{"declaration_date":"2025-12-03","record_date":"2025-12-15","payment_date":"2025-12-23","value_per_share":0.525,"source_url":"https://www.nasdaq.com/press-release/meta-announces-quarterly-cash-dividend-2025-12-03"}';
 r:=public.reconcile_issuer_dividend('META',e);if r->>'saved'<>'1' then raise exception 'META not corrected';end if;
 if not exists(select 1 from public.issuer_dividend_reconciliations where ticker='META' and prior_row->>'payment_date'='2025-12-29') then raise exception 'META prior payment not audited';end if;
 perform public.reconcile_issuer_dividend('META',e);
 if not exists(select 1 from public.dividends where ticker='META' and payment_date='2025-12-23' and source='issuer_primary') then raise exception 'META primary payment lost';end if;
end $$;
reset role;
delete from public.issuer_dividend_reconciliations where ticker='META';
update public.dividends set source='alpha_vantage',payment_date='2025-12-29' where ticker='META';
set local role service_role;
do $$ declare r jsonb;begin
 r:=public.reconcile_issuer_dividend('META','{"declaration_date":"2025-12-03","record_date":"2025-12-15","payment_date":"2025-12-23","value_per_share":0.525,"source_url":"https://www.nasdaq.com/press-release/meta-announces-quarterly-cash-dividend-2025-12-03"}');
 if not coalesce((r->>'coverage_gap')::boolean,false) then raise exception 'Non-Yahoo disagreement overwritten';end if;
end $$;
reset role;
rollback;

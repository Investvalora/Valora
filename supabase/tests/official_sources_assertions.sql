-- Run after 20261107183717 in an enclosing transaction, then ROLLBACK.
-- Uses market-data fixtures only. Never commit these fixtures.
do $test$
declare r jsonb; n integer;
begin
 if has_table_privilege('anon','public.cvm_fii_reports','select') or has_table_privilege('authenticated','public.cvm_fii_reports','insert') or has_function_privilege('authenticated','public.apply_cvm_fii_fallback()','execute') then raise exception 'Privilege regression';end if;
 insert into public.asset_market_identifiers(ticker,isin) values('GARE11','BRTESTCTF019'),('PETR4','BRPETRACNPR6');
 insert into public.cvm_fii_reports(cnpj,isin,reference_date,delivered_at,version,vpa,source_url) values('00000000000000','BRTESTCTF019',date_trunc('month',current_date)::date,current_date,1,100,'https://dados.cvm.gov.br/dados/FII/DOC/INF_MENSAL/DADOS/inf_mensal_fii_2026.zip');
 insert into public.fundamentals(ticker,reference_date,vpa,dy,source) values('GARE11',current_date,null,12,'test') on conflict(ticker,reference_date) do update set vpa=null,dy=12;
 perform public.apply_cvm_fii_fallback();
 if not exists(select 1 from public.fundamentals where ticker='GARE11' and reference_date=current_date and vpa=100 and dy=12) then raise exception 'CVM lost fields';end if;
 perform public.apply_cvm_fii_fallback();
 insert into public.issuer_dividend_sources(ticker,source_url) values('TFLO','https://www.ishares.com/us/products/260652/ishares-treasury-floating-rate-bond-etf');
 r:=public.store_issuer_distributions('TFLO','[{"ticker":"TFLO","type":"dividend","ex_date":"2026-11-02","record_date":"2026-11-02","payment_date":"2026-11-05","value_per_share":0.171627}]');
 perform public.store_yahoo_dividend_events('[{"ticker":"TFLO","type":"dividend","ex_date":"2026-11-02","value_per_share":0.17}]');
 if not exists(select 1 from public.dividends where ticker='TFLO' and ex_date='2026-11-02' and source='ishares' and payment_date='2026-11-05' and value_per_share=0.171627) then raise exception 'Yahoo overwrote issuer';end if;
 r:=public.store_issuer_distributions('TFLO','[{"ticker":"TFLO","type":"dividend","ex_date":"2026-11-02","record_date":"2026-11-02","payment_date":"2026-11-06","value_per_share":0.18}]');
 if (r->>'conflicts')::integer<>1 then raise exception 'Conflict overwritten';end if;
 perform * from public.claim_issuer_sources();
 perform * from public.claim_b3_dividend_assets();
 r:=public.store_b3_announcements('[{"ticker":"PETR4","isin":"BRPETRACNPR6","type":"dividend","record_date":"2026-08-21","payment_date":"2026-12-21","approval_date":"2026-08-06","value_per_share":0.47156696,"source_url":"https://sistemaswebb3-listados.b3.com.br/"}]');
 if (r->>'saved')::integer<>1 then raise exception 'B3 announcement not stored';end if;
 r:=public.store_b3_announcements('[{"ticker":"PETR4","isin":"BRPETRACNPR6","type":"dividend","record_date":"2026-08-21","payment_date":"2026-12-21","approval_date":"2026-08-06","value_per_share":0.47156696,"source_url":"https://sistemaswebb3-listados.b3.com.br/"}]');
 if (r->>'saved')::integer<>0 then raise exception 'B3 duplicated';end if;
end $test$;

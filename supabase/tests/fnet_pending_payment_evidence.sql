-- QA only. Preserve original financial rows and all fixture changes by rollback.
begin;
insert into public.assets(ticker,name,type,currency,quote_provider) values
 ('XPML11','XP Malls QA','fii','BRL','brapi'),('QAFI11','Ambiguous fund QA','fii','BRL','brapi')
 on conflict(ticker) do update set active=true,type='fii',currency='BRL';
insert into public.asset_market_identifiers(ticker,isin,source) values
 ('XPML11','BRXPMLCTF000','b3_cotahist'),('QAFI11','BRTESTCTF000','b3_cotahist')
 on conflict(ticker) do update set isin=excluded.isin;
delete from public.dividend_payment_sources where ticker in('XPML11','QAFI11');
delete from public.cvm_fii_reports where isin in('BRXPMLCTF000','BRTESTCTF000');
insert into public.cvm_fii_reports(cnpj,isin,reference_date,delivered_at,version,vpa,source_url) values
 ('07583627000161','BRXPMLCTF000',current_date-60,current_date-30,1,100,'https://dados.cvm.gov.br/dados/FII/DOC/INF_MENSAL/DADOS/inf_mensal_fii_2026.zip'),
 ('28757546000100','BRXPMLCTF000',current_date-10,current_date-1,1,100,'https://dados.cvm.gov.br/dados/FII/DOC/INF_MENSAL/DADOS/inf_mensal_fii_2026.zip'),
 ('11111111000111','BRTESTCTF000',current_date-10,current_date-1,1,100,'https://dados.cvm.gov.br/dados/FII/DOC/INF_MENSAL/DADOS/inf_mensal_fii_2026.zip'),
 ('22222222000122','BRTESTCTF000',current_date-10,current_date-1,1,100,'https://dados.cvm.gov.br/dados/FII/DOC/INF_MENSAL/DADOS/inf_mensal_fii_2026.zip');
select * from public.claim_dividend_payment_sources();
delete from public.dividends where ticker='XPML11' and ex_date between '2026-11-17' and '2026-11-24';
delete from public.fnet_payment_notices where ticker='XPML11';
set local role service_role;
do $$ declare e jsonb:='{"record_date":"2026-11-17","payment_date":"2026-11-25","value_per_share":0.8,"source_url":"https://fnet.bmfbovespa.com.br/fnet/publico/exibirDocumento?cvm=true&id=1387873"}'; r jsonb;finance_hash text;begin
 if not exists(select 1 from public.dividend_payment_sources where ticker='XPML11' and cnpj='28757546000100') then raise exception 'Latest identity not discovered';end if;
 if exists(select 1 from public.dividend_payment_sources where ticker='QAFI11') then raise exception 'Ambiguous current identity accepted';end if;
 select md5(jsonb_build_array((select jsonb_agg(t order by id) from transactions t),(select jsonb_agg(t order by id) from positions t),(select jsonb_agg(t order by id) from wallet_income t))::text) into finance_hash;
 r:=public.store_confirmed_dividend_payments('XPML11',jsonb_build_array(e));
 if r->>'pending_ex'<>'1' or r->>'conflicts'<>'0' or r->>'enriched'<>'0' then raise exception 'Missing ex not preserved: %',r;end if;
 perform public.store_confirmed_dividend_payments('XPML11',jsonb_build_array(e));
 if (select count(*) from public.fnet_payment_notices where ticker='XPML11')<>1 then raise exception 'Duplicate document';end if;
 if exists(select 1 from public.dividends where ticker='XPML11' and ex_date between '2026-11-17' and '2026-11-24') then raise exception 'Invented ex';end if;
 r:=public.store_confirmed_dividend_payments('XPML11',jsonb_build_array(e||'{"value_per_share":0.74}'));
 if r->>'conflicts'<>'1' or not exists(select 1 from public.fnet_payment_notices where ticker='XPML11' and value_per_share=0.8) then raise exception 'Original evidence overwritten';end if;
 insert into public.dividends(ticker,ex_date,value_per_share,type,source) values('XPML11','2026-11-18',0.8,'dividend','yahoo');
 r:=public.store_confirmed_dividend_payments('XPML11',jsonb_build_array(e));
 if r->>'enriched'<>'1' or r->>'pending_ex'<>'0' or not exists(select 1 from public.dividends where ticker='XPML11' and ex_date='2026-11-18' and payment_date='2026-11-25' and source='fnet') then raise exception 'Independent ex not reconciled';end if;
 if finance_hash<>(select md5(jsonb_build_array((select jsonb_agg(t order by id) from transactions t),(select jsonb_agg(t order by id) from positions t),(select jsonb_agg(t order by id) from wallet_income t))::text)) then raise exception 'Private financial records changed';end if;
 if has_table_privilege('anon','public.fnet_payment_notices','SELECT') or has_table_privilege('authenticated','public.fnet_payment_notices','INSERT') or has_function_privilege('authenticated','public.store_confirmed_dividend_payments(text,jsonb)','EXECUTE') then raise exception 'Public write access';end if;
end $$;
reset role;
set local role authenticated;
do $$ begin if not exists(select 1 from public.fnet_payment_notices where ticker='XPML11') then raise exception 'Official notice not readable';end if;end $$;
reset role;
rollback;

-- Run after the migration in a rollback-only transaction against a snapshot
-- containing the three public Yahoo events. No personal receipt fixtures.
do $$
declare result jsonb;original_ex date;original_pay date;
begin
 perform * from public.claim_dividend_payment_sources();
 if has_function_privilege('authenticated','public.store_confirmed_dividend_payments(text,jsonb)','execute')
   or has_function_privilege('anon','public.claim_dividend_payment_sources()','execute')
   or has_table_privilege('authenticated','public.dividend_payment_sources','select') then
   raise exception 'FAIL service-only access';
 end if;
 result:=public.store_confirmed_dividend_payments('GARE11','[{"record_date":"2026-10-30","payment_date":"2026-11-09","value_per_share":0.083,"source_url":"https://fnet.bmfbovespa.com.br/fnet/publico/exibirDocumento?cvm=true&id=1365436"}]');
 if result->>'enriched'<>'1' or result->>'conflicts'<>'0' then raise exception 'FAIL GARE %',result;end if;
 result:=public.store_confirmed_dividend_payments('VGHF11','[{"record_date":"2026-10-30","payment_date":"2026-11-09","value_per_share":0.05,"source_url":"https://fnet.bmfbovespa.com.br/fnet/publico/exibirDocumento?cvm=true&id=1365431"}]');
 if result->>'enriched'<>'1' then raise exception 'FAIL VGHF %',result;end if;
 result:=public.store_confirmed_dividend_payments('MA','[{"record_date":"2026-10-09","payment_date":"2026-11-09","value_per_share":0.87,"source_url":"https://investor.mastercard.com/stock-information/dividend-history/default.aspx"}]');
 if result->>'enriched'<>'1' then raise exception 'FAIL MA %',result;end if;
 -- Repeated source is idempotent; conflicting payment cannot overwrite it.
 result:=public.store_confirmed_dividend_payments('MA','[{"record_date":"2026-10-09","payment_date":"2026-11-10","value_per_share":0.87,"source_url":"https://investor.mastercard.com/stock-information/dividend-history/default.aspx"}]');
 if result->>'conflicts'<>'1' then raise exception 'FAIL conflict';end if;
 select ex_date,payment_date into original_ex,original_pay from public.dividends where ticker='MA' and ex_date='2026-10-09' and type='dividend';
 if original_ex<>'2026-10-09' or original_pay<>'2026-11-09' then raise exception 'FAIL original ex-date or payment';end if;
 -- Multiple candidate ex-dates must not produce a guessed match.
 insert into public.dividends(ticker,type,ex_date,value_per_share,source) values('GARE11','dividend','2026-11-04',0.083,'yahoo');
 result:=public.store_confirmed_dividend_payments('GARE11','[{"record_date":"2026-10-30","payment_date":"2026-11-09","value_per_share":0.083,"source_url":"https://fnet.bmfbovespa.com.br/fnet/publico/exibirDocumento?cvm=true&id=1365436"}]');
 if result->>'conflicts'<>'1' then raise exception 'FAIL ambiguous ex-date';end if;
end $$;

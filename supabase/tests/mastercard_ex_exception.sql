-- Disposable local Supabase only. All fixture changes are rolled back.
begin;
insert into public.assets(ticker,name,type,currency,quote_provider) values('MA','Mastercard fixture','stock_us','USD','finnhub')
on conflict(ticker) do nothing;
insert into public.dividend_payment_sources(ticker,provider) values('MA','mastercard') on conflict(ticker) do nothing;
delete from public.dividends where ticker='MA' and ex_date between '2025-01-01' and '2025-02-15';
insert into public.dividends(ticker,ex_date,value_per_share,type,source) values('MA','2025-01-10',0.76,'dividend','yahoo');
set local role service_role;
do $test$
declare event jsonb:=jsonb_build_object('record_date','2025-01-09','payment_date','2025-02-07','value_per_share',0.76,
 'source_url','https://investor.mastercard.com/stock-information/dividend-history/default.aspx'); result jsonb;
begin
 result:=public.store_confirmed_dividend_payments('MA',jsonb_build_array(event));
 if (result->>'conflicts')::int<>0 or (result->>'enriched')::int<>1 then raise exception 'Documented closure not reconciled';end if;
 if not exists(select 1 from public.dividends where ticker='MA' and ex_date='2025-01-10' and record_date='2025-01-09' and payment_date='2025-02-07' and value_per_share=0.76 and source='mastercard_ri') then raise exception 'Exception changed eligibility or amount';end if;
 result:=public.store_confirmed_dividend_payments('MA',jsonb_build_array(event));
 if (result->>'conflicts')::int<>0 or (select count(*) from public.dividends where ticker='MA' and ex_date='2025-01-10')<>1 then raise exception 'Repeated event duplicated';end if;
 result:=public.store_confirmed_dividend_payments('MA',jsonb_build_array(event||'{"value_per_share":0.77}'::jsonb));
 if (result->>'conflicts')::int<>1 then raise exception 'Different amount accepted';end if;
 -- Ex after record on another date is still invalid for this conciliator.
 insert into public.dividends(ticker,ex_date,value_per_share,type,source) values('MA','2025-02-11',0.76,'dividend','yahoo');
 result:=public.store_confirmed_dividend_payments('MA',jsonb_build_array(event||'{"record_date":"2025-02-10","payment_date":"2025-03-07"}'::jsonb));
 if (result->>'conflicts')::int<>1 or exists(select 1 from public.dividends where ticker='MA' and ex_date='2025-02-11' and payment_date is not null) then raise exception 'Exception broadened beyond documented date';end if;
 -- Conflicting confirmed payment remains unchanged.
 update public.dividends set payment_date='2025-02-08' where ticker='MA' and ex_date='2025-01-10';
 result:=public.store_confirmed_dividend_payments('MA',jsonb_build_array(event));
 if (result->>'conflicts')::int<>1 or not exists(select 1 from public.dividends where ticker='MA' and ex_date='2025-01-10' and payment_date='2025-02-08') then raise exception 'Confirmed payment overwritten';end if;
end $test$;
reset role;
do $test$ begin
 if has_function_privilege('anon','public.store_confirmed_dividend_payments(text,jsonb)','EXECUTE') or has_function_privilege('authenticated','public.store_confirmed_dividend_payments(text,jsonb)','EXECUTE') then raise exception 'Public write permission expanded';end if;
end $test$;
rollback;

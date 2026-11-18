begin;
insert into public.assets(ticker,name,type,currency,quote_provider,active)
values('QANONPAY','QA nonpayer','stock_us','USD','finnhub',true);
insert into public.issuer_dividend_policies values
('QANONPAY','no_cash_dividends','https://www.sec.gov/qa',now()-interval '1 day',now()+interval '1 day');
do $$ begin
 if not public.issuer_nonpayer_confirmed('QANONPAY') then raise exception 'Valid reviewed policy ignored'; end if;
 update public.issuer_dividend_policies set valid_until=now()-interval '1 hour' where ticker='QANONPAY';
 if public.issuer_nonpayer_confirmed('QANONPAY') then raise exception 'Expired policy still suppresses collection'; end if;
 update public.issuer_dividend_policies set valid_until=now()+interval '1 day' where ticker='QANONPAY';
end $$;
insert into public.dividends(ticker,ex_date,value_per_share,type,source)
values('QANONPAY',current_date,0.16,'dividend','issuer_primary');
do $$ begin
 if public.issuer_nonpayer_confirmed('QANONPAY') then raise exception 'New cash evidence did not invalidate policy'; end if;
 if exists(select 1 from public.issuer_dividend_policies where ticker='TIC' and valid_until>'2026-12-17T23:03:00Z') then
  raise exception 'TIC review silently renewed';
 end if;
end $$;
rollback;

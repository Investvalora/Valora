begin;
insert into public.assets(ticker,name,type,currency,quote_provider) values('QASYN','Synthetic isolation','stock_us','USD','finnhub');
insert into public.international_announcement_tasks(ticker) values('QASYN');
insert into public.dividends(ticker,ex_date,record_date,payment_date,value_per_share,type,source,source_url) values
('QASYN',current_date-3,current_date-3,current_date+3,99,'dividend','seed','https://fixture.invalid'),
('QASYN',current_date-4,null,current_date+4,88,'dividend','synthetic',null),
('QASYN',current_date-5,current_date-5,current_date+5,1,'dividend','mastercard_ri',null);
set local role authenticated;
do $$ begin
 if (select count(*) from public.dividends where ticker='QASYN')<>1 then raise exception 'Simulated rows exposed';end if;
end $$;
reset role;
set local role service_role;
do $$ declare r integer;e jsonb;result jsonb; begin
 if (select count(*) from public.dividends where ticker='QASYN')<>3 then raise exception 'Audit rows lost';end if;
 e:=jsonb_build_array(jsonb_build_object('ticker','QASYN','ex_date',current_date-3,'value_per_share',0.5,'type','dividend'),jsonb_build_object('ticker','QASYN','ex_date',current_date-4,'value_per_share',0.6,'type','dividend'),jsonb_build_object('ticker','QASYN','ex_date',current_date-5,'value_per_share',77,'type','dividend'));
 r:=public.store_yahoo_dividend_events(e);
 if r<>2 then raise exception 'Real replacement failed';end if;
 if exists(select 1 from public.dividends where ticker='QASYN' and ex_date in(current_date-3,current_date-4) and (source<>'yahoo' or payment_date is not null or record_date is not null or source_url is not null)) then raise exception 'Simulated metadata retained';end if;
 if not exists(select 1 from public.dividends where ticker='QASYN' and ex_date=current_date-5 and value_per_share=1 and payment_date=current_date+5) then raise exception 'Primary event overwritten';end if;
 -- Nasdaq supplies independent ex/record/payment and can replace a simulated key.
 update public.dividends set source='seed',value_per_share=99 where ticker='QASYN' and ex_date=current_date-3;
 result:=public.store_international_announcements('QASYN',jsonb_build_array(jsonb_build_object('ex_date',current_date-3,'record_date',current_date-3,'payment_date',current_date+2,'declaration_date',current_date-6,'value_per_share',0.7)));
 if (result->>'saved')::int<>1 then raise exception 'Independent announcement blocked by seed';end if;
end $$;
reset role;
-- JPM must not derive ex-date from a simulated event, even when the amount matches.
insert into public.assets(ticker,name,type,currency,quote_provider) values('JPM','JPM fixture','stock_us','USD','finnhub') on conflict(ticker) do update set active=true,type='stock_us',currency='USD';
delete from public.dividends where ticker='JPM';
insert into public.international_announcement_tasks(ticker) values('JPM') on conflict do nothing;
insert into public.dividends(ticker,ex_date,value_per_share,type,source) values('JPM',current_date-2,1.65,'dividend','seed');
set local role service_role;
do $$ declare r jsonb;begin
 r:=public.store_international_announcements('JPM',jsonb_build_array(jsonb_build_object('record_date',current_date-2,'payment_date',current_date+2,'declaration_date',current_date-5,'value_per_share',1.65,'source_url','https://www.jpmorganchase.com/ir/news/2026/jpmc-declares-common-stock-dividend')));
 if (r->>'conflicts')::int<>1 or (r->>'saved')::int<>0 then raise exception 'Synthetic ex treated as evidence';end if;
end $$;
reset role;
rollback;

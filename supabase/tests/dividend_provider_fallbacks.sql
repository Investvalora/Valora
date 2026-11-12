begin;
insert into public.assets(ticker,name,type,currency,quote_provider) values('COST','Provider fixture','stock_us','USD','finnhub') on conflict(ticker) do update set active=true,type='stock_us',currency='USD';
delete from public.sec_dividend_announcements where ticker='COST';
delete from public.dividends where ticker='COST';
insert into public.sec_dividend_announcements(ticker,cik,accession,declaration_date,record_date,payment_date,filing_date,value_per_share,distribution,source_url)
values('COST','0000909832','0000909832-26-000134',current_date-2,current_date+12,current_date+22,current_date-1,30,'special','https://www.sec.gov/Archives/edgar/data/909832/000090983226000134/cost.htm');
insert into public.dividend_provider_tasks(provider,ticker,claim_token,next_sync_at) values
('alpha_vantage','COST','11111111-1111-4111-8111-111111111111',now()+interval '10 minutes'),
('marketstack','COST','22222222-2222-4222-8222-222222222222',now()+interval '10 minutes');
set local role service_role;
do $$ declare e jsonb;r jsonb;begin
 e:=jsonb_build_object('ex_date',current_date+12,'declaration_date',current_date-2,'record_date',current_date+12,'payment_date',current_date+22,'value_per_share',30);
 r:=public.finish_dividend_provider('alpha_vantage','COST','11111111-1111-4111-8111-111111111111',jsonb_build_array(e),null);
 if (r->>'reconciled')::int<>1 or (r->>'conflicts')::int<>0 then raise exception 'Special reconciliation failed';end if;
 if not exists(select 1 from public.sec_dividend_announcements where ticker='COST' and confirmed_ex_date=current_date+12 and ex_date_provider='alpha_vantage' and distribution='special') then raise exception 'Special ex not confirmed';end if;
 if exists(select 1 from public.dividends where ticker='COST') then raise exception 'Special polluted recurring DY';end if;
 begin
  perform public.finish_dividend_provider('alpha_vantage','COST','11111111-1111-4111-8111-111111111111',jsonb_build_array(e),null);
  raise exception 'Replay accepted';
 exception when raise_exception then if sqlerrm<>'Provider lease unavailable' then raise;end if;end;
 r:=public.finish_dividend_provider('marketstack','COST','22222222-2222-4222-8222-222222222222',jsonb_build_array(e||jsonb_build_object('ex_date',current_date+11)),null);
 if (r->>'conflicts')::int<>1 then raise exception 'Vendor disagreement ignored';end if;
 if (select confirmed_ex_date from public.sec_dividend_announcements where ticker='COST')<>current_date+12 then raise exception 'Conflicting ex overwritten';end if;
 -- Yahoo already establishes an independent ex-date. Only missing calendar fields are filled.
 insert into public.dividends(ticker,ex_date,value_per_share,type,source) values('COST',current_date-10,1.47,'dividend','yahoo');
 update public.dividend_provider_tasks set claim_token='11111111-1111-4111-8111-111111111111',next_sync_at=now()+interval '10 minutes' where provider='alpha_vantage' and ticker='COST';
 e:=jsonb_build_object('ex_date',current_date-10,'declaration_date',current_date-20,'record_date',current_date-10,'payment_date',current_date+1,'value_per_share',1.47);
 perform public.finish_dividend_provider('alpha_vantage','COST','11111111-1111-4111-8111-111111111111',jsonb_build_array(e),null);
 if not exists(select 1 from public.dividends where ticker='COST' and ex_date=current_date-10 and payment_date=current_date+1 and value_per_share=1.47 and source='alpha_vantage') then raise exception 'Calendar not enriched';end if;
 -- Independent global budgets, even if there are many users and concurrent callers.
 insert into public.dividend_provider_usage(provider,usage_day,requests) values('alpha_vantage',current_date,20),('marketstack',current_date,16);
 if exists(select 1 from public.claim_dividend_provider('alpha_vantage')) or exists(select 1 from public.claim_dividend_provider('marketstack')) then raise exception 'Daily quota exceeded';end if;
 update public.dividend_provider_usage set requests=80 where provider='marketstack';
 if exists(select 1 from public.claim_dividend_provider('marketstack')) then raise exception 'Monthly quota exceeded';end if;
 if has_function_privilege('authenticated','public.claim_dividend_provider(text)','EXECUTE') or has_function_privilege('anon','public.finish_dividend_provider(text,text,uuid,jsonb,text)','EXECUTE') then raise exception 'Provider RPC exposed';end if;
 if has_table_privilege('authenticated','public.dividend_provider_events','SELECT') or has_table_privilege('anon','public.dividend_provider_usage','SELECT') then raise exception 'Private provider data exposed';end if;
 if has_function_privilege('authenticated','public.get_dividend_provider_key(text)','EXECUTE') or has_function_privilege('anon','public.get_dividend_provider_key(text)','EXECUTE') then raise exception 'Provider credentials exposed';end if;
 begin
  perform public.get_dividend_provider_key('service_role_key');raise exception 'General Vault reader accepted';
 exception when raise_exception then if sqlerrm<>'Invalid provider' then raise;end if;end;
end $$;
reset role;
rollback;

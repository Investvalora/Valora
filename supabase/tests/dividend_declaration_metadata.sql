begin;
insert into public.assets(ticker,name,type,currency,quote_provider) values('QAMETA','Metadata fixture','stock_us','USD','finnhub');
insert into public.dividend_provider_tasks(provider,ticker) values('alpha_vantage','QAMETA'),('marketstack','QAMETA');
insert into public.dividends(ticker,ex_date,record_date,payment_date,value_per_share,type,source)
 values('QAMETA',current_date-10,current_date-10,current_date-5,0.21,'dividend','alpha_vantage');
insert into public.dividend_provider_events(provider,ticker,ex_date,declaration_date,record_date,payment_date,value_per_share)
 values('alpha_vantage','QAMETA',current_date-10,current_date-20,current_date-10,current_date-5,0.21);
set local role service_role;
do $$ declare e jsonb;r jsonb;lease uuid:='22222222-2222-4222-8222-222222222222';bad jsonb;begin
 e:=jsonb_build_object('ex_date',current_date-10,'declaration_date',current_date-19,'record_date',current_date-10,'payment_date',current_date-5,'value_per_share',0.21);
 update public.dividend_provider_tasks set claim_token=lease,next_sync_at=now()+interval '10 minutes' where provider='marketstack' and ticker='QAMETA';
 r:=public.finish_dividend_provider('marketstack','QAMETA',lease,jsonb_build_array(e),null);
 if r->>'error' is not null or r->>'metadata_variations'<>'1' or r->>'conflicts'<>'0' then raise exception 'Metadata blocked economic calendar: %',r;end if;
 if (select count(*) from public.dividend_provider_events where ticker='QAMETA')<>2 then raise exception 'Raw observations missing';end if;
 if not exists(select 1 from public.dividend_provider_events where ticker='QAMETA' and provider='alpha_vantage' and declaration_date=current_date-20) then raise exception 'Original declaration overwritten';end if;
 if not exists(select 1 from public.dividend_provider_conflicts where ticker='QAMETA' and metadata_only and reviewed_at is not null and declaration_date=current_date-19) then raise exception 'Metadata audit missing';end if;
 if not exists(select 1 from public.dividend_provider_tasks where ticker='QAMETA' and provider='marketstack' and last_success_at is not null and last_error is null and claim_token is null) then raise exception 'Economic success not recorded';end if;
 -- Later metadata variation never overwrites the immutable raw snapshot.
 update public.dividend_provider_tasks set claim_token=lease,next_sync_at=now()+interval '10 minutes' where provider='marketstack' and ticker='QAMETA';
 r:=public.finish_dividend_provider('marketstack','QAMETA',lease,jsonb_build_array(e||jsonb_build_object('declaration_date',current_date-18)),null);
 if r->>'error' is not null or r->>'metadata_variations'<>'1' then raise exception 'Own declaration variation blocked';end if;
 if not exists(select 1 from public.dividend_provider_events where ticker='QAMETA' and provider='marketstack' and declaration_date=current_date-19) then raise exception 'Raw source rewritten';end if;
 -- Each economic field remains blocking, even with a harmless declaration variation alongside it.
 foreach bad in array array[jsonb_build_object('value_per_share',0.22),jsonb_build_object('record_date',current_date-9),jsonb_build_object('payment_date',current_date-4),jsonb_build_object('ex_date',current_date-11)] loop
  update public.dividend_provider_tasks set claim_token=lease,next_sync_at=now()+interval '10 minutes' where provider='marketstack' and ticker='QAMETA';
  r:=public.finish_dividend_provider('marketstack','QAMETA',lease,jsonb_build_array(e||bad),null);
  if r->>'error'<>'provider_event_conflict' then raise exception 'Economic disagreement hidden: % / %',bad,r;end if;
 end loop;
 insert into public.sec_dividend_announcements(ticker,cik,accession,declaration_date,filing_date,record_date,payment_date,value_per_share,distribution,source_url,confirmed_ex_date,ex_date_provider)
 values('QAMETA','0000000123','0000000123-26-000001',current_date-20,current_date-19,current_date-10,current_date-5,0.21,'regular','https://www.sec.gov/Archives/edgar/data/123/fixture.htm',current_date-11,'alpha_vantage');
 update public.dividend_provider_tasks set claim_token=lease,next_sync_at=now()+interval '10 minutes' where provider='marketstack' and ticker='QAMETA';
 r:=public.finish_dividend_provider('marketstack','QAMETA',lease,jsonb_build_array(e),null);
 if r->>'error'<>'provider_event_conflict' then raise exception 'SEC economic disagreement hidden by metadata rule';end if;
 if not exists(select 1 from public.dividends where ticker='QAMETA' and value_per_share=0.21 and record_date=current_date-10 and payment_date=current_date-5) then raise exception 'Public event modified';end if;
 if has_function_privilege('authenticated','public.provider_declaration_metadata_only(text,text,jsonb)','EXECUTE') or has_column_privilege('anon','public.dividend_provider_conflicts','metadata_only','UPDATE') then raise exception 'Private classification exposed';end if;
end $$;
reset role;
rollback;

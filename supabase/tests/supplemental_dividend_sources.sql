begin;
insert into public.assets(ticker,name,type,currency,quote_provider) values('QASUP','Supplemental fixture','stock_us','USD','finnhub') on conflict(ticker) do update set active=true;
insert into auth.users(id,email,raw_user_meta_data) values('ab000000-0000-4000-8000-000000000091','qa-supplemental@test.invalid','{"full_name":"Supplemental QA"}');
select set_config('request.jwt.claim.sub','ab000000-0000-4000-8000-000000000091',true);
set local role authenticated;
do $$ declare w uuid;r jsonb;begin
 select id into w from public.wallets where user_id=auth.uid() limit 1;
 r:=public.import_owned_transactions(w,'fixture.csv','[{"ticker":"QASUP","type":"buy","quantity":1,"price":10,"brokerage_fee":0,"transaction_date":"2026-01-02"}]');
end $$;
reset role;
update public.assets set active=false where ticker<>'QASUP';
delete from public.supplemental_dividend_tasks;
delete from public.supplemental_dividend_usage;
set local role service_role;
do $$ declare t public.supplemental_dividend_tasks;e jsonb;r jsonb;n bigint;h text;income bigint;begin
 select count(*) into income from public.wallet_income;
 select md5(string_agg(to_jsonb(x)::text,'' order by id)) into h from public.transactions x;
 select * into t from public.claim_supplemental_dividends('massive');
 if t.ticker is distinct from 'QASUP' or t.claim_token is null then raise exception 'Held asset not leased';end if;
 if exists(select 1 from public.claim_supplemental_dividends('massive')) then raise exception 'Minute limit bypassed';end if;
 e:=jsonb_build_object('event_id','evt_1','ticker','QASUP','ex_date',current_date+5,'record_date',current_date+5,'payment_date',current_date+10,'declaration_date',current_date-1,'currency','USD','value_per_share','1.34','distribution','recurring');
 begin perform public.finish_supplemental_dividends('massive','QASUP',gen_random_uuid(),jsonb_build_array(e),null,false);raise exception 'Foreign lease accepted';exception when raise_exception then if sqlerrm<>'Supplemental lease unavailable' then raise;end if;end;
 r:=public.finish_supplemental_dividends('massive','QASUP',t.claim_token,jsonb_build_array(e),null,false);
 if r->>'observations'<>'1' or r->>'error' is not null then raise exception 'Evidence not stored: %',r;end if;
 if (select evidence_status from public.supplemental_dividend_evidence where event_id='evt_1')<>'reported_unconfirmed' then raise exception 'Unconfirmed promoted';end if;
 if exists(select 1 from public.dividends where ticker='QASUP') then raise exception 'Reported event entered calendar';end if;
 insert into public.issuer_dividend_reconciliations(ticker,ex_date,declaration_date,record_date,payment_date,value_per_share,source_url)
 values('QASUP',current_date+5,current_date-1,current_date+5,current_date+10,1.34,'https://issuer.invalid/fixture');
 if (select evidence_status from public.supplemental_dividend_evidence where event_id='evt_1')<>'official_confirmed' then raise exception 'Primary confirmation not recognized';end if;
 -- Same ID with changed amount is immutable revision history, not an overwrite.
 update public.supplemental_dividend_tasks set claim_token=t.claim_token,next_sync_at=now()+interval '10 minutes' where provider='massive' and ticker='QASUP';
 perform public.finish_supplemental_dividends('massive','QASUP',t.claim_token,jsonb_build_array(e||'{"value_per_share":"1.35"}'),null,false);
 if (select count(*) from public.supplemental_dividend_evidence where event_id='evt_1' and evidence_status='revision_review')<>2 then raise exception 'Revision lost';end if;
 -- Same dates but another source/ID remain independent; incomplete Alpaca stays incomplete.
 select * into t from public.claim_supplemental_dividends('alpaca');
 r:=public.finish_supplemental_dividends('alpaca','QASUP',t.claim_token,jsonb_build_array(e||'{"declaration_date":null,"currency":null}'),null,false);
 if r->>'error'<>'supplemental_incomplete' then raise exception 'Incomplete calendar hidden';end if;
 if (select count(*) from public.supplemental_dividend_observations where ticker='QASUP')<>3 then raise exception 'Providers merged';end if;
 update public.supplemental_dividend_usage set requests=40,last_reserved_at=now()-interval '2 minutes' where provider='massive';
 update public.supplemental_dividend_tasks set next_sync_at=now()-interval '1 minute' where provider='massive';
 if exists(select 1 from public.claim_supplemental_dividends('massive')) then raise exception 'Daily cap bypassed';end if;
 update public.supplemental_dividend_usage set requests=0,last_reserved_at=now()-interval '2 minutes' where provider='massive';
 select * into t from public.claim_supplemental_dividends('massive');
 perform public.finish_supplemental_dividends('massive','QASUP',t.claim_token,'[]','supplemental_rate_limited',false);
 if not exists(select 1 from public.supplemental_dividend_usage where provider='massive' and blocked_until>now()) then raise exception 'Rate-limit block absent';end if;
 update public.supplemental_dividend_tasks set next_sync_at=now()-interval '1 minute' where provider='massive';
 update public.supplemental_dividend_usage set usage_day=usage_day-1,last_reserved_at=now()-interval '2 days' where provider='massive';
 if exists(select 1 from public.claim_supplemental_dividends('massive')) then raise exception 'Midnight bypassed cooldown';end if;
 if (select count(*) from public.wallet_income)<>income or (select md5(string_agg(to_jsonb(x)::text,'' order by id)) from public.transactions x)<>h then raise exception 'Personal data changed';end if;
 if has_table_privilege('authenticated','public.supplemental_dividend_observations','SELECT') or has_function_privilege('anon','public.claim_supplemental_dividends(text)','EXECUTE') then raise exception 'Private evidence exposed';end if;
end $$;
rollback;

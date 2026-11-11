-- Run on disposable local Supabase only; fixtures are rolled back.
begin;
insert into public.assets(ticker,name,type,currency,quote_provider) values('QANASDAQ','Nasdaq fixture','stock_us','USD','finnhub');
insert into public.international_announcement_tasks(ticker) values('QANASDAQ');
set local role service_role;
do $test$
declare e jsonb; result jsonb; ex date:=current_date+1;pay date:=current_date+4;
begin
 e:=jsonb_build_object('ex_date',ex,'record_date',ex,'payment_date',pay,'declaration_date',current_date,'value_per_share',0.27);
 result:=public.store_international_announcements('QANASDAQ',jsonb_build_array(e));
 if (result->>'saved')::int<>1 then raise exception 'Future announcement not saved';end if;
 result:=public.store_international_announcements('QANASDAQ',jsonb_build_array(e));
 if (result->>'saved')::int<>0 or (result->>'conflicts')::int<>0 then raise exception 'Repeated announcement changed';end if;
 update public.dividends set source='apple_ri',source_url='https://investor.apple.com/' where ticker='QANASDAQ';
 result:=public.store_international_announcements('QANASDAQ',jsonb_build_array(e));
 if (select source from public.dividends where ticker='QANASDAQ')<>'apple_ri' then raise exception 'Primary source overwritten';end if;
 result:=public.store_international_announcements('QANASDAQ',jsonb_build_array(e||'{"value_per_share":0.28}'::jsonb));
 if (result->>'conflicts')::int<>1 or (select value_per_share from public.dividends where ticker='QANASDAQ')<>0.27 then raise exception 'Amount conflict overwritten';end if;
 result:=public.store_international_announcements('QANASDAQ',jsonb_build_array(e||jsonb_build_object('ex_date',ex+1,'record_date',ex+1)));
 if (result->>'conflicts')::int<>1 or (select count(*) from public.dividends where ticker='QANASDAQ')<>1 then raise exception 'Different ex date duplicated same payment';end if;
 insert into public.dividends(ticker,ex_date,value_per_share,type,source) values('QANASDAQ',ex+10,0.28,'dividend','yahoo');
 e:=e||jsonb_build_object('ex_date',ex+10,'record_date',ex+10,'payment_date',pay+10,'value_per_share',0.28);
 result:=public.store_international_announcements('QANASDAQ',jsonb_build_array(e));
 if (result->>'saved')::int<>1 or not exists(select 1 from public.dividends where ticker='QANASDAQ' and ex_date=ex+10 and payment_date=pay+10 and source='nasdaq') then raise exception 'Yahoo exact event not enriched';end if;
 begin
  perform public.store_international_announcements('QANASDAQ',jsonb_build_array(e||'{"value_per_share":0.0000001}'::jsonb));
  raise exception 'Excess precision accepted';
 exception when raise_exception then
  if sqlerrm<>'Invalid announcement' then raise;end if;
 end;
end $test$;
reset role;
do $test$ begin
 if has_function_privilege('authenticated','public.store_international_announcements(text,jsonb)','EXECUTE') or has_function_privilege('anon','public.claim_international_announcements()','EXECUTE') then raise exception 'Public announcement write access';end if;
 if not (select relrowsecurity from pg_class where oid='public.international_announcement_tasks'::regclass) then raise exception 'Queue RLS missing';end if;
end $test$;
rollback;

begin;
insert into public.assets(ticker,name,type,currency,quote_provider) values('JPM','JPM fixture','stock_us','USD','finnhub') on conflict(ticker) do update set active=true,type='stock_us',currency='USD';
delete from public.dividends where ticker='JPM';
insert into public.international_announcement_tasks(ticker) values('JPM') on conflict do nothing;
insert into public.dividends(ticker,ex_date,value_per_share,type,source) values('JPM',current_date-6,1.65,'dividend','yahoo');
set local role service_role;
do $test$
declare e jsonb;r jsonb;
begin
 e:=jsonb_build_object('declaration_date',current_date-30,'record_date',current_date-5,'payment_date',current_date+3,'value_per_share',1.65,'source_url','https://www.jpmorganchase.com/ir/news/2026/jpmc-declares-increased-common-stock-dividend-9-15');
 r:=public.store_international_announcements('JPM',jsonb_build_array(e));
 if (r->>'saved')::int<>1 or (r->>'conflicts')::int<>0 then raise exception 'Issuer enrichment failed';end if;
 if not exists(select 1 from public.dividends where ticker='JPM' and ex_date=current_date-6 and record_date=current_date-5 and payment_date=current_date+3 and source='jpmorgan_ri') then raise exception 'Independent ex date not preserved';end if;
 r:=public.store_international_announcements('JPM',jsonb_build_array(e));
 if (r->>'saved')::int<>0 or (r->>'conflicts')::int<>0 then raise exception 'Replay not idempotent';end if;
 r:=public.store_international_announcements('JPM',jsonb_build_array(e||jsonb_build_object('payment_date',current_date+4)));
 if (r->>'conflicts')::int<>1 then raise exception 'Confirmed payment overwritten';end if;
 begin
  perform public.store_international_announcements('JPM',jsonb_build_array(e||jsonb_build_object('source_url','https://attacker.invalid/ir/news/2026/x')));
  raise exception 'Foreign source accepted';
 exception when raise_exception then if sqlerrm<>'Invalid issuer source' then raise;end if;end;
 update public.international_announcement_tasks set claim_token='11111111-1111-4111-8111-111111111111',next_sync_at=now()+interval '10 minutes',last_success_at=null where ticker='JPM';
 r:=public.finish_international_announcements('JPM','11111111-1111-4111-8111-111111111111',jsonb_build_array(e||jsonb_build_object('record_date',current_date+30,'payment_date',current_date+35)),null);
 if r->>'error'<>'jpm_ex_date_or_event_conflict' or (r->>'conflicts')::int<>1 then raise exception 'Missing ex-date not diagnosed';end if;
 if (select last_success_at from public.international_announcement_tasks where ticker='JPM') is not null then raise exception 'Unmatched event marked successful';end if;
 if (select count(*) from public.dividends where ticker='JPM')<>1 then raise exception 'Invented ex-date/event';end if;
 -- Two possible independent events must not be selected arbitrarily.
 insert into public.dividends(ticker,ex_date,value_per_share,type,source) values('JPM',current_date-7,1.65,'dividend','yahoo');
 r:=public.store_international_announcements('JPM',jsonb_build_array(e));
 if (r->>'conflicts')::int<>1 then raise exception 'Ambiguous ex-date accepted';end if;
end $test$;
reset role;
do $test$ begin
 if has_function_privilege('anon','public.store_international_announcements(text,jsonb)','EXECUTE') or has_function_privilege('authenticated','public.store_international_announcements(text,jsonb)','EXECUTE') then raise exception 'Public issuer writes';end if;
end $test$;
rollback;

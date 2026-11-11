begin;
insert into public.assets(ticker,name,type,currency,quote_provider) values('QALEASE','Lease fixture','stock_us','USD','finnhub');
insert into public.international_announcement_tasks(ticker,claim_token,next_sync_at) values('QALEASE','11111111-1111-4111-8111-111111111111',now()+interval '10 minutes');
set local role service_role;
do $test$
declare e jsonb;result jsonb;
begin
 e:=jsonb_build_object('ex_date',current_date+1,'record_date',current_date+1,'payment_date',current_date+4,'declaration_date',current_date,'value_per_share',0.27);
 begin
  perform public.finish_international_announcements('QALEASE','22222222-2222-4222-8222-222222222222',jsonb_build_array(e),null);
  raise exception 'Wrong lease accepted';
 exception when raise_exception then if sqlerrm<>'Collector lease unavailable' then raise;end if;end;
 result:=public.finish_international_announcements('QALEASE','11111111-1111-4111-8111-111111111111',jsonb_build_array(e),null);
 if (result->>'saved')::int<>1 then raise exception 'Valid completion missing';end if;
 if exists(select 1 from public.international_announcement_tasks where ticker='QALEASE' and (claim_token is not null or last_success_at is null)) then raise exception 'Completion not finalized';end if;
 begin
  perform public.finish_international_announcements('QALEASE','11111111-1111-4111-8111-111111111111',jsonb_build_array(e),null);
  raise exception 'Replayed lease accepted';
 exception when raise_exception then if sqlerrm<>'Collector lease unavailable' then raise;end if;end;
 update public.international_announcement_tasks set claim_token='11111111-1111-4111-8111-111111111111',next_sync_at=now()-interval '1 minute' where ticker='QALEASE';
 begin
  perform public.finish_international_announcements('QALEASE','11111111-1111-4111-8111-111111111111','[]'::jsonb,'nasdaq_unavailable');
  raise exception 'Expired lease accepted';
 exception when raise_exception then if sqlerrm<>'Collector lease unavailable' then raise;end if;end;
 update public.international_announcement_tasks set next_sync_at=now()+interval '10 minutes' where ticker='QALEASE';
 result:=public.finish_international_announcements('QALEASE','11111111-1111-4111-8111-111111111111','[]'::jsonb,'nasdaq_identity_unsupported');
 if (select last_error from public.international_announcement_tasks where ticker='QALEASE')<>'nasdaq_identity_unsupported' then raise exception 'Missing unsupported status';end if;
 if (select count(*) from public.dividends where ticker='QALEASE')<>1 then raise exception 'Unexpected event mutation';end if;
end $test$;
reset role;
do $test$ begin
 if has_function_privilege('anon','public.finish_international_announcements(text,uuid,jsonb,text)','EXECUTE') or has_function_privilege('authenticated','public.finish_international_announcements(text,uuid,jsonb,text)','EXECUTE') then raise exception 'Public completion access';end if;
end $test$;
rollback;

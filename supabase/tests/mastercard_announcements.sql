begin;
insert into public.assets(ticker,name,type,currency,quote_provider) values('MA','Mastercard fixture','stock_us','USD','finnhub') on conflict(ticker) do update set active=true,type='stock_us',currency='USD';
delete from public.dividends where ticker='MA';
insert into public.international_announcement_tasks(ticker) values('MA') on conflict do nothing;
insert into public.dividends(ticker,ex_date,value_per_share,type,source) values('MA',current_date-6,0.87,'dividend','yahoo');
set local role service_role;
do $$ declare e jsonb;r jsonb;begin
 e:=jsonb_build_object('declaration_date',current_date-30,'record_date',current_date-5,'payment_date',current_date+3,'value_per_share',0.87,'source_url','https://www.nasdaq.com/press-release/mastercard-board-directors-announces-quarterly-dividend-'||(current_date-30)::text);
 r:=public.store_international_announcements('MA',jsonb_build_array(e));
 if (r->>'saved')::int<>1 or (r->>'conflicts')::int<>0 then raise exception 'MA enrichment failed';end if;
 if not exists(select 1 from public.dividends where ticker='MA' and ex_date=current_date-6 and record_date=current_date-5 and payment_date=current_date+3 and source='mastercard_nasdaq_release') then raise exception 'MA ex changed';end if;
 r:=public.store_international_announcements('MA',jsonb_build_array(e));
 if (r->>'saved')::int<>0 then raise exception 'MA duplicate';end if;
 r:=public.store_international_announcements('MA',jsonb_build_array(e||jsonb_build_object('payment_date',current_date+4)));
 if (r->>'conflicts')::int<>1 then raise exception 'MA conflict overwritten';end if;
 begin
  perform public.store_international_announcements('MA',jsonb_build_array(e||jsonb_build_object('source_url','https://attacker.invalid/press-release/x')));
  raise exception 'Foreign MA source accepted';
 exception when raise_exception then if sqlerrm<>'Invalid issuer source' then raise;end if;end;
 update public.international_announcement_tasks set claim_token='11111111-1111-4111-8111-111111111111',next_sync_at=now()+interval '10 minutes',last_success_at=null where ticker='MA';
 r:=public.finish_international_announcements('MA','11111111-1111-4111-8111-111111111111',jsonb_build_array(e||jsonb_build_object('record_date',current_date+30,'payment_date',current_date+35)),null);
 if r->>'error'<>'ma_ex_date_or_event_conflict' then raise exception 'Missing MA ex not diagnosed';end if;
 if (select count(*) from public.dividends where ticker='MA')<>1 then raise exception 'Invented MA event';end if;
 if (select last_success_at from public.international_announcement_tasks where ticker='MA') is not null then raise exception 'Unmatched MA marked success';end if;
end $$;
reset role;
rollback;

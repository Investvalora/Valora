begin;
insert into public.assets(ticker,name,type,currency,quote_provider) values('JNJ','Johnson & Johnson','stock_us','USD','finnhub') on conflict(ticker) do update set active=true;
delete from public.dividend_provider_adjudications where ticker='JNJ';
delete from public.issuer_dividend_reconciliations where ticker='JNJ';
delete from public.dividends where ticker='JNJ';
insert into public.international_announcement_tasks(ticker) values('JNJ') on conflict do nothing;
set local role service_role;
do $$ declare e jsonb;r jsonb;link text;lease uuid:='11111111-1111-4111-8111-111111111111';before_income bigint;begin
 select count(*) into before_income from public.wallet_income;
 link:='https://www.nasdaq.com/press-release/johnson-johnson-announces-quarterly-dividend-fourth-quarter-2026-'||(current_date-20)::text;
 e:=jsonb_build_object('ex_date',current_date+5,'declaration_date',current_date-20,'record_date',current_date+5,'payment_date',current_date+20,'value_per_share',1.34,
 'source_url',link,'ex_date_source_url',link,'upstream_url','https://www.businesswire.com/news/home/'||to_char(current_date-20,'YYYYMMDD')||'123456/en/');
 begin perform public.reconcile_issuer_dividend('JNJ',e-'ex_date');raise exception 'Missing ex accepted';exception when raise_exception then if sqlerrm<>'Unverified issuer source' then raise;end if;end;
 begin perform public.reconcile_issuer_dividend('JNJ',e||'{"upstream_url":"https://attacker.invalid"}');raise exception 'Foreign proof accepted';exception when raise_exception then if sqlerrm<>'Unverified issuer source' then raise;end if;end;
 begin perform public.reconcile_issuer_dividend('JNJ',e||'{"ex_date_source_url":"https://attacker.invalid"}');raise exception 'Foreign ex proof accepted';exception when raise_exception then if sqlerrm<>'Unverified issuer source' then raise;end if;end;
 begin perform public.finish_primary_dividends('JNJ',lease,jsonb_build_array(e),null);raise exception 'Missing lease accepted';exception when raise_exception then if sqlerrm<>'Issuer lease unavailable' then raise;end if;end;
 update public.international_announcement_tasks set claim_token=lease,next_sync_at=now()+interval '10 minutes',last_success_at=null where ticker='JNJ';
 r:=public.finish_primary_dividends('JNJ',lease,jsonb_build_array(e),null);
 if r->>'saved'<>'1' or r->>'error' is not null or r->>'received_income_created'<>'0' then raise exception 'JNJ reconciliation failed: %',r;end if;
 if not exists(select 1 from public.dividends where ticker='JNJ' and ex_date=current_date+5 and value_per_share=1.34 and payment_date=current_date+20 and source='issuer_primary') then raise exception 'Explicit JNJ calendar not saved';end if;
 if exists(select 1 from public.international_announcement_tasks where ticker='JNJ' and (claim_token is not null or last_success_at is null)) then raise exception 'Lease not released';end if;
 r:=public.reconcile_issuer_dividend('JNJ',e);if r->>'conflicts'<>'0' then raise exception 'Idempotent replay failed';end if;
 r:=public.reconcile_issuer_dividend('JNJ',e||'{"value_per_share":1.35}');if r->>'conflicts'<>'1' then raise exception 'Economic conflict overwritten';end if;
 if (select count(*) from public.wallet_income)<>before_income then raise exception 'Personal income changed';end if;
 if has_function_privilege('authenticated','public.finish_primary_dividends(text,uuid,jsonb,text)','EXECUTE') or has_function_privilege('anon','public.reconcile_issuer_dividend(text,jsonb)','EXECUTE') then raise exception 'Client access leaked';end if;
end $$;
rollback;

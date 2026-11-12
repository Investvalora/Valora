-- Isolated local/CI only; rollback all fixtures.
begin;
insert into public.assets(ticker,name,type,currency,quote_provider) values('QARETRY','Primary repair fixture','stock_us','USD','finnhub'),('QANEXT','First pass fixture','stock_us','USD','finnhub') on conflict(ticker) do nothing;
update public.assets set active=false where type='stock_us' and ticker not in('QARETRY','QANEXT');
delete from public.marketstack_key_usage;
delete from public.marketstack_key_state;
delete from public.dividend_provider_usage;
insert into public.dividend_provider_tasks(provider,ticker,last_attempt_at,next_sync_at,last_error) values
 ('alpha_vantage','QARETRY',now()-interval '1 day',now()+interval '2 days','provider_event_conflict'),
 ('alpha_vantage','QANEXT',null,now()-interval '1 day',null),
 ('marketstack','QANEXT',now()-interval '2 hours',now()-interval '1 day',null)
 on conflict(provider,ticker) do update set last_attempt_at=excluded.last_attempt_at,next_sync_at=excluded.next_sync_at,last_error=excluded.last_error,claim_token=null;
insert into public.issuer_dividend_reconciliations(ticker,ex_date,declaration_date,record_date,payment_date,value_per_share,source_url)
 values('QARETRY',current_date-10,current_date-20,current_date-10,current_date-5,0.1,'https://example.invalid/fixture');
set local role service_role;
do $$ declare a text:=repeat('d',64);b text:=repeat('e',64);q jsonb;t public.dividend_provider_tasks;begin
 insert into public.marketstack_key_usage values(a,current_date,2);
 if not public.marketstack_budget_available(array[a,b]) then raise exception 'Fresh configured key unavailable';end if;
 if not exists(select 1 from public.dividend_provider_budget_status where configured_keys=2 and available_keys=1 and remaining_requests=2) then raise exception 'Key budget incorrect';end if;
 insert into public.marketstack_key_usage values(b,current_date,2);
 if public.marketstack_budget_available(array[a,b]) then raise exception 'Spent keys usable';end if;
 select value into q from jsonb_array_elements(public.international_queue_health()->'queues') where value->>'queue'='marketstack';
 if q->>'key_budget_exhausted'<>'true' or q->>'effective_daily_remaining'<>'0' or q->>'stale'<>'false' or (q->>'global_daily_remaining')::int<>16 then raise exception 'Global/per-key quota misclassified: %',q;end if;
 if q::text like '%'||a||'%' then raise exception 'Key fingerprint exposed';end if;
 update public.dividend_provider_budget_status set checked_at=now()-interval '2 hours';
 select value into q from jsonb_array_elements(public.international_queue_health()->'queues') where value->>'queue'='marketstack';
 if q->>'key_budget_known'<>'false' or q->>'stale'<>'true' then raise exception 'Stale snapshot hid stalled queue';end if;
 update public.dividend_provider_budget_status set checked_at=now(),usage_day=current_date-1;
 select value into q from jsonb_array_elements(public.international_queue_health()->'queues') where value->>'queue'='marketstack';
 if q->>'key_budget_known'<>'false' or q->>'stale'<>'true' then raise exception 'Previous-day quota suppressed current queue';end if;
 -- Fresh evidence may bring forward one conflicting task, preserving quota and leases.
 select * into t from public.claim_dividend_provider('alpha_vantage');
 if t.ticker<>'QARETRY' then raise exception 'Fresh primary repair not retried';end if;
 select * into t from public.claim_dividend_provider('alpha_vantage');
 if t.ticker<>'QANEXT' then raise exception 'Active repair lease claimed twice';end if;
 perform public.finish_dividend_provider('alpha_vantage',t.ticker,t.claim_token,'[]','provider_calendar_unavailable');
 select * into t from public.dividend_provider_tasks where provider='alpha_vantage' and ticker='QARETRY';
 perform public.finish_dividend_provider('alpha_vantage',t.ticker,t.claim_token,'[]','provider_event_conflict');
 if exists(select 1 from public.claim_dividend_provider('alpha_vantage')) then raise exception 'Same evidence caused retry loop';end if;
 update public.dividend_provider_tasks set last_attempt_at=now()-interval '1 day',last_error='provider_event_conflict',claim_token=null where provider='alpha_vantage' and ticker='QARETRY';
 insert into public.dividend_provider_usage values('alpha_vantage',current_date,20) on conflict(provider,usage_day) do update set requests=20;
 if exists(select 1 from public.claim_dividend_provider('alpha_vantage')) then raise exception 'Repair bypassed global quota';end if;
 insert into public.issuer_dividend_policies values('QANEXT','no_cash_dividends','https://example.invalid/fixture',now(),now()+interval '2 days') on conflict(ticker) do update set observed_at=excluded.observed_at,valid_until=excluded.valid_until;
 if not exists(select 1 from jsonb_array_elements(public.international_queue_health()->'policy_expirations') p where p->>'ticker'='QANEXT' and p->>'renewal_due'='true' and p->>'expired'='false') then raise exception 'Policy renewal deadline hidden';end if;
 if has_table_privilege('authenticated','public.dividend_provider_budget_status','SELECT') or has_function_privilege('anon','public.provider_primary_recheck_due(text,timestamptz,text)','EXECUTE') then raise exception 'Private diagnostics exposed';end if;
end $$;
reset role;
rollback;

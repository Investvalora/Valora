begin;
-- Isolate diagnostics from previous fixtures/catalog and real budgets.
delete from public.dividend_provider_tasks;
insert into public.assets(ticker,name,type,currency,quote_provider,active) values
 ('QAPOLICY','Policy fixture','stock_us','USD','finnhub',true),
 ('QAELIGIBLE','Eligible fixture','stock_us','USD','finnhub',true),
 ('QAINACTIVE','Inactive fixture','stock_us','USD','finnhub',false);
insert into public.issuer_dividend_policies values
 ('QAPOLICY','no_cash_dividends','https://www.sec.gov/qa',now()-interval '1 day',now()+interval '1 day');
insert into public.dividend_provider_tasks(provider,ticker,next_sync_at,last_attempt_at)
values('alpha_vantage','QAPOLICY',now()-interval '2 days',now()-interval '3 days'),
 ('alpha_vantage','QAINACTIVE',now()-interval '2 days',now()-interval '3 days');
do $$ declare q jsonb;begin
 select value into q from jsonb_array_elements(public.international_queue_health()->'queues') where value->>'queue'='alpha_vantage';
 if q->>'due'<>'0' or q->>'scheduled_due'<>'2' or q->>'stale'<>'false' or q->>'backlog_overdue'<>'false' or q->>'oldest_due' is not null then raise exception 'Ineligible task reported as overdue: %',q;end if;
end $$;
insert into public.dividend_provider_tasks(provider,ticker,next_sync_at,last_attempt_at)
values('alpha_vantage','QAELIGIBLE',now()-interval '2 hours',now());
do $$ declare q jsonb;begin
 select value into q from jsonb_array_elements(public.international_queue_health()->'queues') where value->>'queue'='alpha_vantage';
 if q->>'due'<>'1' or q->>'backlog_overdue'<>'true' or (q->>'oldest_due_age_seconds')::integer<7200 then raise exception 'Recent activity hid overdue backlog';end if;
 update public.issuer_dividend_policies set valid_until=now()-interval '1 hour' where ticker='QAPOLICY';
 select value into q from jsonb_array_elements(public.international_queue_health()->'queues') where value->>'queue'='alpha_vantage';
 if q->>'due'<>'2' then raise exception 'Expired policy still hides due task';end if;
 update public.dividend_provider_tasks set claim_token=gen_random_uuid(),next_sync_at=now()+interval '10 minutes' where ticker='QAELIGIBLE';
 select value into q from jsonb_array_elements(public.international_queue_health()->'queues') where value->>'queue'='alpha_vantage';
 if q->>'due'<>'1' then raise exception 'Active lease counted as due';end if;
 if has_function_privilege('anon','public.international_queue_health()','execute') or has_function_privilege('authenticated','public.international_queue_health_before_eligibility()','execute') then raise exception 'Private diagnostics exposed';end if;
end $$;
rollback;

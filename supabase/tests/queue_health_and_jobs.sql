begin;
select set_config('valora.job_user',gen_random_uuid()::text,true);
insert into auth.users(id,aud,role,email,raw_user_meta_data)
values(current_setting('valora.job_user')::uuid,'authenticated','authenticated','job-fixture@example.invalid','{"full_name":"Teste jobs"}');
insert into public.assets(ticker,name,type,currency,quote_provider) values
('QAJOBONE','Unheld fixture','stock_us','USD','finnhub'),('QAJOBTWO','Held fixture','stock_us','USD','finnhub');
update public.assets set active=false where type='stock_us' and ticker not in('QAJOBONE','QAJOBTWO');
insert into public.positions(user_id,wallet_id,ticker,quantity,average_price,acquisition_date)
select current_setting('valora.job_user')::uuid,id,'QAJOBTWO',1,10,current_date-20 from public.wallets where user_id=current_setting('valora.job_user')::uuid limit 1;
delete from public.dividend_provider_usage;
insert into public.dividend_provider_tasks(provider,ticker,next_sync_at) values
('alpha_vantage','QAJOBONE',now()-interval '10 days'),('alpha_vantage','QAJOBTWO',now()-interval '1 day');
set local role service_role;
do $$ declare task public.dividend_provider_tasks;health jsonb;k text:=repeat('c',64);begin
 select * into task from public.claim_dividend_provider('alpha_vantage');
 if task.ticker<>'QAJOBTWO' then raise exception 'Held asset not prioritized';end if;
 insert into public.operational_job_runs(id,job,status,finished_at,details) values(gen_random_uuid(),'sync-macro-rates','partial',now(),'{"updated":13,"calculation_errors":["private-position-marker"]}');
 health:=public.international_queue_health();
 if health->'macro'->>'status'<>'partial' or health->'macro'->>'error_count'<>'1' then raise exception 'Partial result not observable';end if;
 if health::text like '%private-position-marker%' then raise exception 'Private diagnostics leaked into public workflow';end if;
 if public.marketstack_budget_available(array[k]) is not true then raise exception 'Fresh account unavailable';end if;
 insert into public.marketstack_key_usage(key_id,usage_day,requests) values(k,current_date,2);
 if public.marketstack_budget_available(array[k]) is not false then raise exception 'Spent account still available';end if;
 if has_table_privilege('authenticated','public.operational_job_runs','SELECT') or has_function_privilege('authenticated','public.international_queue_health()','EXECUTE') then raise exception 'Operations exposed';end if;
end $$;
reset role;
do $$ begin
 if not exists(select 1 from cron.job where jobname='international-provider-fallback' and schedule='11,31,51 * * * *' and active and command like '%vault.decrypted_secrets%') then raise exception 'Independent schedule unavailable';end if;
end $$;
rollback;

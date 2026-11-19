begin;
insert into public.assets(ticker,name,type,currency,quote_provider) values('QASECQA','QA official statement','stock_us','USD','finnhub');
insert into public.sec_statement_tasks(ticker,next_attempt_at) values('QASECQA',now()-interval '1 day');
set local role service_role;
create temp table qa_sec_claim as select * from public.claim_sec_statements();
do $$ declare token uuid; snapshot jsonb; begin
 select claim_token into token from qa_sec_claim where ticker='QASECQA';
 if token is null then raise exception 'Eligible task not claimed';end if;
 if exists(select 1 from public.claim_sec_statements() where ticker='QASECQA') then raise exception 'Live lease reclaimed';end if;
 snapshot:='{"ticker":"QASECQA","accession":"0000320193-26-000001","cik":"0000320193","periodEnd":"2025-12-31","filingDate":"2026-02-01","metrics":{"operatingMargin":-10,"freeCashFlow":-20,"netDebtEbitda":null,"roic":null,"revenueCagr":null,"earningsCagr":null},"evidence":{}}';
 if public.finish_sec_statement('QASECQA',gen_random_uuid(),snapshot,null) then raise exception 'Wrong lease accepted';end if;
 if not public.finish_sec_statement('QASECQA',token,snapshot,null) then raise exception 'Valid task not stored';end if;
 if public.finish_sec_statement('QASECQA',token,snapshot,null) then raise exception 'Replayed lease accepted';end if;
 if (select count(*) from public.sec_statement_snapshots where ticker='QASECQA')<>1 then raise exception 'Snapshot absent or duplicated';end if;
 if (select free_cash_flow from public.sec_statement_snapshots where ticker='QASECQA')<>-20 then raise exception 'Negative FCF lost';end if;
 if (select next_attempt_at<=now() from public.sec_statement_tasks where ticker='QASECQA') then raise exception 'Task not delayed';end if;
end $$;
reset role;
set local role authenticated;
do $$ begin
 if (select count(*) from public.sec_statement_snapshots where ticker='QASECQA')<>1 then raise exception 'Shared market evidence not readable';end if;
 if has_table_privilege(current_user,'public.sec_statement_snapshots','INSERT') then raise exception 'Client writes exposed';end if;
 if has_table_privilege(current_user,'public.sec_statement_tasks','SELECT') then raise exception 'Queue exposed';end if;
 if has_function_privilege(current_user,'public.claim_sec_statements()','EXECUTE') then raise exception 'Client can claim work';end if;
end $$;
reset role;
rollback;

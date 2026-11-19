-- Shared public-market evidence, isolated from personal holdings and core ratios.
create table public.sec_statement_snapshots (
 ticker text not null references public.assets(ticker), accession text not null check(accession ~ '^\d{10}-\d{2}-\d{6}$'),
 cik text not null check(cik ~ '^\d{10}$'),period_end date not null,filing_date date not null check(filing_date>=period_end),
 operating_margin numeric,free_cash_flow numeric,net_debt_ebitda numeric,roic numeric,revenue_cagr numeric,earnings_cagr numeric,
 evidence jsonb not null check(jsonb_typeof(evidence)='object'),
 collected_at timestamptz not null default now(),primary key(ticker,accession),
 check(operating_margin::text not in('NaN','Infinity','-Infinity')),
 check(free_cash_flow::text not in('NaN','Infinity','-Infinity')),
 check(net_debt_ebitda::text not in('NaN','Infinity','-Infinity')),check(roic::text not in('NaN','Infinity','-Infinity')),
 check(revenue_cagr::text not in('NaN','Infinity','-Infinity')),check(earnings_cagr::text not in('NaN','Infinity','-Infinity'))
);
alter table public.sec_statement_snapshots enable row level security;
revoke all on public.sec_statement_snapshots from public,anon,authenticated;
grant select on public.sec_statement_snapshots to authenticated;
grant select,insert,update on public.sec_statement_snapshots to service_role;
create policy shared_market_statements on public.sec_statement_snapshots for select to authenticated using(true);
create table public.sec_statement_tasks (
 ticker text primary key references public.assets(ticker),next_attempt_at timestamptz not null default now(),
 claim_token uuid,lease_until timestamptz,last_attempt_at timestamptz,last_success_at timestamptz,last_error text
);
alter table public.sec_statement_tasks enable row level security;
revoke all on public.sec_statement_tasks from public,anon,authenticated;
grant select,insert,update on public.sec_statement_tasks to service_role;
create function public.claim_sec_statements() returns table(ticker text,claim_token uuid)
language plpgsql security invoker set search_path='' as $$
begin
 insert into public.sec_statement_tasks(ticker) select a.ticker from public.assets a where a.active and a.type='stock_us' on conflict do nothing;
 return query with due as (
  select t.ticker from public.sec_statement_tasks t join public.assets a on a.ticker=t.ticker
  where a.active and a.type='stock_us' and t.next_attempt_at<=now() and coalesce(t.lease_until,'-infinity'::timestamptz)<=now()
  order by t.next_attempt_at,t.ticker for update of t skip locked limit 2
 ) update public.sec_statement_tasks t set claim_token=gen_random_uuid(),lease_until=now()+interval '15 minutes',last_attempt_at=now()
 from due where t.ticker=due.ticker returning t.ticker,t.claim_token;
end $$;
create function public.finish_sec_statement(p_ticker text,p_claim_token uuid,p_snapshot jsonb,p_error text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare task public.sec_statement_tasks;begin
 select * into task from public.sec_statement_tasks where ticker=p_ticker and claim_token=p_claim_token and lease_until>now() for update;
 if not found then return false;end if;
 if p_error is null then
  if p_snapshot->>'ticker' is distinct from p_ticker or not exists(select 1 from public.assets where ticker=p_ticker and active and type='stock_us')
    then raise exception 'Invalid statement identity';end if;
  insert into public.sec_statement_snapshots(ticker,accession,cik,period_end,filing_date,operating_margin,free_cash_flow,net_debt_ebitda,roic,revenue_cagr,earnings_cagr,evidence)
  values(p_ticker,p_snapshot->>'accession',p_snapshot->>'cik',(p_snapshot->>'periodEnd')::date,(p_snapshot->>'filingDate')::date,
   (p_snapshot->'metrics'->>'operatingMargin')::numeric,(p_snapshot->'metrics'->>'freeCashFlow')::numeric,
   (p_snapshot->'metrics'->>'netDebtEbitda')::numeric,(p_snapshot->'metrics'->>'roic')::numeric,
   (p_snapshot->'metrics'->>'revenueCagr')::numeric,(p_snapshot->'metrics'->>'earningsCagr')::numeric,p_snapshot->'evidence')
  on conflict(ticker,accession) do update set operating_margin=excluded.operating_margin,free_cash_flow=excluded.free_cash_flow,
   net_debt_ebitda=excluded.net_debt_ebitda,roic=excluded.roic,revenue_cagr=excluded.revenue_cagr,earnings_cagr=excluded.earnings_cagr,
   evidence=excluded.evidence,collected_at=now();
 end if;
 update public.sec_statement_tasks set claim_token=null,lease_until=null,last_error=p_error,
  last_success_at=case when p_error is null then now() else last_success_at end,
  next_attempt_at=now()+case when p_error is null then interval '7 days'
    when p_error in('sec_identity_unavailable','sec_statement_sector_unsupported','sec_statement_annual_unavailable') then interval '30 days' else interval '6 hours' end
 where ticker=p_ticker;
 return true;
end $$;
revoke all on function public.claim_sec_statements(),public.finish_sec_statement(text,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.claim_sec_statements(),public.finish_sec_statement(text,uuid,jsonb,text) to service_role;

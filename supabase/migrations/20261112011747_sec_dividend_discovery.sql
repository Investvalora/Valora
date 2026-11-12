-- Independent discovery ledger. Never a personal receipt or an eligible dividend.
create table public.sec_dividend_tasks (
 ticker text primary key references public.assets(ticker) on delete cascade,
 cik text check(cik ~ '^[0-9]{10}$'),claim_token uuid,next_sync_at timestamptz not null default now(),
 last_attempt_at timestamptz,last_success_at timestamptz,last_error text,inspected integer not null default 0
);
alter table public.sec_dividend_tasks enable row level security;
revoke all on public.sec_dividend_tasks from public,anon,authenticated;
grant select,insert,update on public.sec_dividend_tasks to service_role;
create index sec_dividend_tasks_due on public.sec_dividend_tasks(next_sync_at,ticker);
create table public.sec_dividend_announcements (
 ticker text not null references public.assets(ticker) on delete cascade,cik text not null check(cik ~ '^[0-9]{10}$'),
 accession text not null check(accession ~ '^[0-9]{10}-[0-9]{2}-[0-9]{6}$'),
 declaration_date date not null,record_date date not null,payment_date date not null,filing_date date not null,
 value_per_share numeric(18,6) not null check(value_per_share>0),distribution text not null check(distribution in ('regular','special')),
 currency text not null default 'USD' check(currency='USD'),ex_status text not null default 'unconfirmed' check(ex_status='unconfirmed'),
 source_url text not null,discovered_at timestamptz not null default now(),primary key(ticker,accession),
 check(declaration_date<=record_date and record_date<=payment_date and declaration_date<=filing_date)
);
alter table public.sec_dividend_announcements enable row level security;
revoke all on public.sec_dividend_announcements from public,anon,authenticated;
grant select on public.sec_dividend_announcements to authenticated;
grant select,insert on public.sec_dividend_announcements to service_role;
create policy sec_announcements_read on public.sec_dividend_announcements for select to authenticated using(true);
create function public.claim_sec_dividends() returns setof public.sec_dividend_tasks
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 insert into public.sec_dividend_tasks(ticker) select ticker from public.assets
 where active and type='stock_us' and currency='USD' and ticker ~ '^[A-Z][A-Z0-9.-]{0,9}$' on conflict do nothing;
 return query update public.sec_dividend_tasks t set claim_token=gen_random_uuid(),next_sync_at=now()+interval '10 minutes'
 where t.ticker in(select j.ticker from public.sec_dividend_tasks j join public.assets a using(ticker)
 where a.active and a.type='stock_us' and a.currency='USD' and j.next_sync_at<=now()
 order by j.next_sync_at,j.ticker for update of j skip locked limit 1) returning t.*;
end $$;
create function public.finish_sec_dividends(p_ticker text,p_claim_token uuid,p_cik text,p_events jsonb,p_error text,p_inspected integer,p_partial boolean)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare task public.sec_dividend_tasks;e jsonb;old public.sec_dividend_announcements;amount numeric;declared date;rec date;pay date;filed date;link text;v_accession text;kind text;saved integer:=0;conflicts integer:=0;failure text:=p_error;
begin
 select * into task from public.sec_dividend_tasks where ticker=p_ticker for update;
 if not found or p_claim_token is null or task.claim_token is distinct from p_claim_token or task.next_sync_at<=now() then raise exception 'SEC lease unavailable';end if;
 if not exists(select 1 from public.assets where ticker=p_ticker and active and type='stock_us' and currency='USD')
 or jsonb_typeof(p_events) is distinct from 'array' or jsonb_array_length(p_events)>4
 or p_inspected is null or p_inspected<0 or p_inspected>4 or p_partial is null
 or (p_error is not null and (p_error !~ '^sec_[a-z0-9_]{1,60}$' or jsonb_array_length(p_events)<>0)) then raise exception 'Invalid SEC result';end if;
 if p_error is null then
  if p_cik is null or p_cik !~ '^[0-9]{10}$' or p_cik::bigint=0 or (task.cik is not null and task.cik<>p_cik) then raise exception 'SEC identity changed';end if;
  for e in select value from jsonb_array_elements(p_events) loop
   v_accession:=e->>'accession';kind:=e->>'distribution';link:=e->>'source_url';
   declared:=(e->>'declaration_date')::date;rec:=(e->>'record_date')::date;pay:=(e->>'payment_date')::date;filed:=(e->>'filing_date')::date;amount:=(e->>'value_per_share')::numeric;
   if v_accession is null or v_accession !~ '^[0-9]{10}-[0-9]{2}-[0-9]{6}$' or kind is null or kind not in('regular','special')
    or declared is null or rec is null or pay is null or filed is null or amount is null or amount<=0 or amount>=1e12 or amount::text in('NaN','Infinity','-Infinity') or amount<>trunc(amount,6)
    or declared>rec or rec>pay or declared>filed or filed>current_date or filed<current_date-120 or pay-rec>366
    or link is null or link !~ ('^https://www[.]sec[.]gov/Archives/edgar/data/'||p_cik::bigint::text||'/'||replace(v_accession,'-','')||'/[A-Za-z0-9_-]+[.]html?$') then raise exception 'Invalid SEC announcement';end if;
   select * into old from public.sec_dividend_announcements d where d.ticker=p_ticker and d.accession=v_accession;
   if found then
    if old.cik<>p_cik or old.declaration_date<>declared or old.record_date<>rec or old.payment_date<>pay or old.filing_date<>filed or old.value_per_share<>amount or old.distribution<>kind or old.source_url<>link then conflicts:=conflicts+1;end if;
   else
    insert into public.sec_dividend_announcements(ticker,cik,accession,declaration_date,record_date,payment_date,filing_date,value_per_share,distribution,source_url)
    values(p_ticker,p_cik,v_accession,declared,rec,pay,filed,amount,kind,link);saved:=saved+1;
   end if;
  end loop;
  if conflicts>0 then failure:='sec_event_conflict';elsif p_partial then failure:='sec_partial_coverage';end if;
 end if;
 update public.sec_dividend_tasks set cik=case when p_error is null then p_cik else cik end,claim_token=null,last_attempt_at=now(),last_error=failure,inspected=p_inspected,
 last_success_at=case when failure is null then now() else last_success_at end,
 next_sync_at=now()+case when failure is null or failure='sec_identity_unavailable' then interval '24 hours' else interval '6 hours' end where ticker=p_ticker;
 return jsonb_build_object('saved',saved,'conflicts',conflicts,'error',failure,'eligible_dividends_created',0,'received_income_created',0);
end $$;
revoke all on function public.claim_sec_dividends(),public.finish_sec_dividends(text,uuid,text,jsonb,text,integer,boolean) from public,anon,authenticated;
grant execute on function public.claim_sec_dividends(),public.finish_sec_dividends(text,uuid,text,jsonb,text,integer,boolean) to service_role;

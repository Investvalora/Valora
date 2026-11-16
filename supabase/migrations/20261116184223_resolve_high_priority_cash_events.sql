-- Bounded manual primary reviews. Nullable declaration is deliberate: an
-- announcement date must never silently become a board-decision date.
create table public.reviewed_cash_events(
 ticker text not null check(ticker ~ '^[A-Z][A-Z0-9.-]{0,9}$'),ex_date date not null,
 record_date date not null,payment_date date not null,declaration_date date,announcement_date date,
 declaration_basis text not null check(declaration_basis in('official','vendor_observation','unknown')),
 value_per_share numeric(20,8) not null check(value_per_share>0),
 prior_values numeric[] not null,prior_sources text[] not null,
 amount_basis text not null check(amount_basis in('original_payment_share','final_adr')),
 source_url text not null,ex_source_url text not null,note text not null,
 primary key(ticker,ex_date),check(ex_date<=record_date and record_date<=payment_date),
 check(declaration_date is null or declaration_date<=ex_date),
 check((declaration_date is null)=(declaration_basis='unknown'))
);
create table public.reviewed_cash_event_applications(
 ticker text not null,ex_date date not null,prior_row jsonb,applied_at timestamptz not null default now(),
 primary key(ticker,ex_date),foreign key(ticker,ex_date) references public.reviewed_cash_events
);
alter table public.reviewed_cash_events enable row level security;
alter table public.reviewed_cash_event_applications enable row level security;
revoke all on public.reviewed_cash_events,public.reviewed_cash_event_applications from public,anon,authenticated;
grant select on public.reviewed_cash_events to service_role;
grant select,insert on public.reviewed_cash_event_applications to service_role;

insert into public.reviewed_cash_events values
('ITA','2026-03-17','2026-03-17','2026-03-20',null,null,'unknown',0.151325,array[0.050333],array['yahoo'],'original_payment_share','https://www.ishares.com/us/products/239502/ishares-us-aerospace-defense-etf?ihpq=true','https://www.alphavantage.co/documentation/#dividends','Original per-payment-share amount in the indexed issuer distribution table; independently matches Alpha. Do not multiply the current split-adjusted table. Declaration unconfirmed.'),
('ITA','2026-06-15','2026-06-15','2026-06-18','2026-06-12','2026-06-12','official',0.16358,array[0.054667],array['yahoo'],'original_payment_share','https://www.cboe.com/us/equities/notices/dividends/details/?declaration_dt=2026-06-12&firm_name=iShares&symbols=ACWV%2CAQLT%2CBILT%2CCNYA%2CDIVB%2CECH%2CEDEN%2CEEMV%2CEFAV%2CEFG%2CEFNL%2CEFV%2CEGUS%2CEMGF%2CENOR%2CEQLT%2CESML%2CEVLU%2CEVUS%2CEWUS%2CEZU%2CGARP%2CICF%2CIDV%2CIEDI%2CIEFA%2CIEO%2CIETC%2CIFRA%2CIGE%2CIGRO%2CIGV%2CINDA%2CISVL%2CITA%2CITB%2CIYJ%2CIYT%2CIYZ%2CKWT%2CMTUM%2CPICK%2CQUAL%2CREM%2CSLVP%2CSMIN%2CSMMD%2CSMMV%2CSQLT%2CSVAL%2CUSMV%2CVLUE%2CXJH%2CXJR%2CXVV','https://www.alphavantage.co/documentation/#dividends','Exchange issuer notice, original payment-share basis. Vendor declaration remains immutable.'),
('ITA','2026-09-15','2026-09-15','2026-09-18','2026-09-14','2026-09-14','official',0.25052,array[0.083667],array['yahoo'],'original_payment_share','https://www.cboe.com/us/equities/notices/dividends/details/?declaration_dt=2026-09-14&firm_name=iShares&symbols=BILT%2CDIVB%2CEGUS%2CESML%2CEVUS%2CGARP%2CICF%2CIDV%2CIEO%2CIETC%2CIFRA%2CIGE%2CIGRO%2CITA%2CITB%2CIYJ%2CIYT%2CIYZ%2CMTUM%2CQUAL%2CREM%2CSMMD%2CSMMV%2CSQLT%2CSVAL%2CUSMV%2CVLUE%2CXJH%2CXJR%2CXVV','https://www.alphavantage.co/documentation/#dividends','Exchange issuer notice, original payment-share basis. Vendor declaration remains immutable.'),
('SAP','2026-05-05','2026-05-05','2026-05-15','2026-04-14',null,'vendor_observation',2.940725,array[2.929,2.929075,2.93],array['yahoo'],'final_adr','https://adr.db.com/drwebrebrand/api/druniverse/dividend-history/1109','https://www.alphavantage.co/documentation/#dividends','SAP SE CUSIP 803054204; final depositary gross. Declaration/ex separately observed by vendors, not asserted by the depositary. Tax/fee/net are not personal receipts.'),
('MRX','2026-11-16','2026-11-16','2026-12-02',null,'2026-11-05','unknown',0.16,array[0.16],array['yahoo','marketstack'],'original_payment_share','https://www.sec.gov/Archives/edgar/data/1997464/000199746426000075/q32026earningsrelease.htm','https://marketstack.com/documentation','Announcement 05/11; board declaration unknown. Vendor 03/11 and 05/11 are preserved as separate metadata.'),
('PR','2026-06-16','2026-06-16','2026-06-30','2026-05-06','2026-05-06','official',0.16,array[0.16],array['yahoo'],'original_payment_share','https://permianres.com/permian-resources-declares-quarterly-cash-dividend-13/','https://finance.yahoo.com/quote/PR/history/','Issuer common-stock base dividend. Separate from the unverified vendor 30/06 event; do not combine.'),
('PR','2026-12-17','2026-12-17','2026-12-31','2026-11-04','2026-11-04','official',0.16,array[0.16],array['yahoo','marketstack'],'original_payment_share','https://www.businesswire.com/news/home/20261104654343/en/','https://marketstack.com/documentation','Issuer announcement; future ex independently observed by Marketstack.');

create function public.apply_reviewed_cash_event(p_ticker text,p_ex date) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare r public.reviewed_cash_events;old public.dividends;prior public.issuer_dividend_reconciliations;
begin
 select * into r from public.reviewed_cash_events where ticker=p_ticker and ex_date=p_ex;
 if not found then raise exception 'Unreviewed cash event';end if;
 if not exists(select 1 from public.assets where ticker=p_ticker and active and type='stock_us' and currency='USD') then return jsonb_build_object('saved',0,'waiting','asset');end if;
 perform pg_advisory_xact_lock(hashtextextended('dividend-provider-ticker:'||p_ticker,0));
 if not exists(select 1 from public.dividend_provider_events o where o.ticker=p_ticker and o.ex_date=p_ex and o.record_date=r.record_date and o.payment_date=r.payment_date and (o.value_per_share=r.value_per_share or o.value_per_share=any(r.prior_values)))
 and not exists(select 1 from public.dividends o where o.ticker=p_ticker and o.ex_date=p_ex and o.type='dividend' and o.source='yahoo' and o.value_per_share=r.value_per_share)
 then return jsonb_build_object('saved',0,'waiting','independent_ex');end if;
 if exists(select 1 from public.dividends d where d.ticker=p_ticker and d.type='dividend' and d.payment_date=r.payment_date and d.ex_date<>p_ex) then raise exception 'Ambiguous payment';end if;
 if exists(select 1 from public.dividend_provider_events d where d.ticker=p_ticker and d.payment_date=r.payment_date and d.ex_date<>p_ex) then raise exception 'Conflicting independent ex';end if;
 select * into old from public.dividends where ticker=p_ticker and ex_date=p_ex and type='dividend' for update;
 if found and ((old.value_per_share<>r.value_per_share and not(old.value_per_share=any(r.prior_values) and old.source=any(r.prior_sources))) or (old.record_date is not null and old.record_date<>r.record_date) or (old.payment_date is not null and old.payment_date<>r.payment_date)) then raise exception 'Unreviewed public conflict';end if;
 select * into prior from public.issuer_dividend_reconciliations where ticker=p_ticker and ex_date=p_ex;
 if found and (prior.value_per_share<>r.value_per_share or prior.record_date<>r.record_date or prior.payment_date<>r.payment_date or prior.declaration_date is distinct from r.declaration_date) then raise exception 'Conflicting prior issuer review';end if;
 insert into public.reviewed_cash_event_applications(ticker,ex_date,prior_row) values(p_ticker,p_ex,to_jsonb(old)) on conflict do nothing;
 insert into public.dividends(ticker,ex_date,record_date,payment_date,value_per_share,type,source,source_url)
 values(p_ticker,p_ex,r.record_date,r.payment_date,r.value_per_share,'dividend','issuer_primary',r.source_url)
 on conflict(ticker,ex_date,type) do update set record_date=excluded.record_date,payment_date=excluded.payment_date,value_per_share=excluded.value_per_share,source=excluded.source,source_url=excluded.source_url;
 -- Only known/explicitly attributed declarations participate in legacy matching.
 if r.declaration_date is not null then
  insert into public.issuer_dividend_reconciliations(ticker,ex_date,declaration_date,record_date,payment_date,value_per_share,source_url,prior_row)
  values(p_ticker,p_ex,r.declaration_date,r.record_date,r.payment_date,r.value_per_share,r.source_url,to_jsonb(old)) on conflict do nothing;
 end if;
 insert into public.dividend_provider_adjudications(provider,ticker,ex_date,declaration_date,record_date,payment_date,observed_value,primary_value,primary_source_url,disposition)
 select c.provider,c.ticker,c.ex_date,c.declaration_date,c.record_date,c.payment_date,c.observed_value,r.value_per_share,r.source_url,case when c.observed_value=r.value_per_share then 'confirmed' else 'rejected' end
 from public.dividend_provider_conflicts c where c.ticker=p_ticker and c.ex_date=p_ex and c.record_date=r.record_date and c.payment_date=r.payment_date
 and (c.observed_value=r.value_per_share or c.observed_value=any(r.prior_values)) on conflict do nothing;
 update public.dividend_provider_conflicts c set issuer_reviewed_at=now() where c.ticker=p_ticker and c.ex_date=p_ex and c.record_date=r.record_date and c.payment_date=r.payment_date
 and (c.observed_value=r.value_per_share or c.observed_value=any(r.prior_values));
 -- MRX is a proven economic match, with unknown board-decision date. Existing
 -- strict metadata classifier still requires independent economic agreement.
 update public.dividend_provider_conflicts c set metadata_only=true,reviewed_at=now()
 where c.ticker=p_ticker and c.ex_date=p_ex and r.declaration_basis='unknown'
 and public.provider_declaration_metadata_only(c.provider,c.ticker,jsonb_build_object('ex_date',c.ex_date,'record_date',c.record_date,'payment_date',c.payment_date,'value_per_share',c.observed_value,'declaration_date',c.declaration_date));
 return jsonb_build_object('saved',1,'received_income_created',0);
end $$;
revoke all on function public.apply_reviewed_cash_event(text,date) from public,anon,authenticated;
grant execute on function public.apply_reviewed_cash_event(text,date) to service_role;
do $$ declare r record;begin for r in select ticker,ex_date from public.reviewed_cash_events order by ticker,ex_date loop perform public.apply_reviewed_cash_event(r.ticker,r.ex_date);end loop;end $$;

-- A mismatching date/amount is not a second installment of the issuer event.
-- Preserve the vendor snapshot and expose a coverage gap until classified.
create table public.reviewed_provider_holds(
 provider text not null,ticker text not null,ex_date date not null,declaration_date date not null,
 record_date date not null,payment_date date not null,value_per_share numeric(20,8) not null,
 reason text not null check(reason='distribution_unverified'),source_url text not null,
 primary key(provider,ticker,ex_date,declaration_date,record_date,payment_date,value_per_share)
);
alter table public.reviewed_provider_holds enable row level security;
revoke all on public.reviewed_provider_holds from public,anon,authenticated;
grant select on public.reviewed_provider_holds to service_role;
insert into public.reviewed_provider_holds values('marketstack','PR','2026-06-30','2026-04-21','2026-06-30','2026-07-10',0.03,'distribution_unverified','https://permianres.com/permian-resources-declares-quarterly-cash-dividend-13/');
alter function public.finish_dividend_provider(text,text,uuid,jsonb,text) rename to finish_dividend_provider_before_holds;
create function public.finish_dividend_provider(p_provider text,p_ticker text,p_claim_token uuid,p_events jsonb,p_error text) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare filtered jsonb:='[]';e jsonb;held integer:=0;result jsonb;previous_success timestamptz;
begin
 if jsonb_typeof(p_events) is distinct from 'array' or jsonb_array_length(p_events)>100 then raise exception 'Invalid provider result';end if;
 if p_error is null then
  for e in select value from jsonb_array_elements(p_events) loop
   if exists(select 1 from public.reviewed_provider_holds h where h.provider=p_provider and h.ticker=p_ticker and h.ex_date=(e->>'ex_date')::date and h.declaration_date=(e->>'declaration_date')::date and h.record_date=(e->>'record_date')::date and h.payment_date=(e->>'payment_date')::date and h.value_per_share=(e->>'value_per_share')::numeric) then held:=held+1;
   else filtered:=filtered||jsonb_build_array(e);end if;
  end loop;
 else filtered:=p_events;end if;
 select last_success_at into previous_success from public.dividend_provider_tasks where provider=p_provider and ticker=p_ticker for update;
 result:=public.finish_dividend_provider_before_holds(p_provider,p_ticker,p_claim_token,filtered,case when held>0 and jsonb_array_length(filtered)=0 then 'provider_distribution_unverified' else p_error end);
 if held>0 and (result->>'error' is null or result->>'error'='provider_distribution_unverified') then
  update public.dividend_provider_tasks set last_error='provider_distribution_unverified',last_success_at=previous_success where provider=p_provider and ticker=p_ticker;
  result:=result||jsonb_build_object('error','provider_distribution_unverified','held_events',held);
 end if;
 return result;
end $$;
revoke all on function public.finish_dividend_provider(text,text,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.finish_dividend_provider(text,text,uuid,jsonb,text) to service_role;

create function public.finish_partial_dividend_provider(p_provider text,p_ticker text,p_claim_token uuid,p_events jsonb,p_error text,p_missing integer) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare result jsonb;previous_success timestamptz;
begin
 if p_error is not null or p_missing is null or p_missing<1 or p_missing>1000 or jsonb_typeof(p_events) is distinct from 'array' or jsonb_array_length(p_events)=0 then raise exception 'Invalid partial provider result';end if;
 select last_success_at into previous_success from public.dividend_provider_tasks where provider=p_provider and ticker=p_ticker for update;
 result:=public.finish_dividend_provider(p_provider,p_ticker,p_claim_token,p_events,null);
 if result->>'error' is null then
  update public.dividend_provider_tasks set last_error='provider_partial_invalid_amount',last_success_at=previous_success where provider=p_provider and ticker=p_ticker;
  result:=result||jsonb_build_object('error','provider_partial_invalid_amount');
 end if;
 return result||jsonb_build_object('missing',p_missing);
end $$;
revoke all on function public.finish_partial_dividend_provider(text,text,uuid,jsonb,text,integer) from public,anon,authenticated;
grant execute on function public.finish_partial_dividend_provider(text,text,uuid,jsonb,text,integer) to service_role;

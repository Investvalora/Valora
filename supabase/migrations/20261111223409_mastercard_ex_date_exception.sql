-- Narrow, documented exchange-calendar exception; not a general ex>record rule.
create or replace function public.store_confirmed_dividend_payments(p_ticker text,p_events jsonb) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare provider_name text;e jsonb; matched uuid; candidates integer;enriched integer:=0;conflicts integer:=0;
 rec date;pay date;amount numeric;source_name text;source_link text;affected integer;
begin
 select s.provider into provider_name from public.dividend_payment_sources s join public.assets a using(ticker)
 where s.ticker=p_ticker and a.active and ((s.provider='fnet' and a.type='fii' and a.currency='BRL') or(s.provider='mastercard' and a.type='stock_us' and a.currency='USD'));
 if provider_name is null or jsonb_typeof(p_events) is distinct from 'array' or jsonb_array_length(p_events)>100 then raise exception 'Invalid payment events';end if;
 for e in select value from jsonb_array_elements(p_events) loop
  rec:=(e->>'record_date')::date;pay:=(e->>'payment_date')::date;amount:=(e->>'value_per_share')::numeric;source_link:=e->>'source_url';
  if rec is null or pay is null or pay<rec or amount is null or amount<=0 or amount::text in('NaN','Infinity','-Infinity') or source_link is null then raise exception 'Invalid payment event';end if;
  if provider_name='fnet' then
   if source_link !~ '^https://fnet[.]bmfbovespa[.]com[.]br/fnet/publico/exibirDocumento[?]cvm=true&id=[0-9]+$' then raise exception 'Invalid payment source';end if;
   source_name:='fnet';
  else
   if source_link<>'https://investor.mastercard.com/stock-information/dividend-history/default.aspx' then raise exception 'Invalid payment source';end if;
   source_name:='mastercard_ri';
  end if;
  -- Existing Yahoo ex-date is preserved. A record date is never invented as ex.
  select count(*),(array_agg(d.id))[1] into candidates,matched from public.dividends d
  where d.ticker=p_ticker and d.type='dividend' and abs(d.value_per_share-amount)<=0.000001
    and ((provider_name='fnet' and d.ex_date>rec and d.ex_date<=rec+7)
      or(provider_name='mastercard' and d.ex_date<=rec and d.ex_date>=rec-7)
      -- National Day of Mourning: exchange ex-dates moved to Jan 10 while
      -- the banking settlement/record date remained Jan 9. Do not move ex-date.
      -- https://www.nasdaqtrader.com/TraderNews.aspx?id=ECA2024-632
      or(provider_name='mastercard' and p_ticker='MA'
         and rec=date '2025-01-09' and d.ex_date=date '2025-01-10'));
  if candidates<>1 then conflicts:=conflicts+1;continue;end if;
  update public.dividends d set record_date=rec,payment_date=pay,source=source_name,source_url=source_link
  where d.id=matched and ((d.source='yahoo' and d.payment_date is null)
    or(d.source=source_name and d.payment_date=pay and d.record_date=rec));
  get diagnostics affected=row_count;
  if affected=1 then enriched:=enriched+1;else conflicts:=conflicts+1;end if;
 end loop;
 return jsonb_build_object('enriched',enriched,'conflicts',conflicts);
end $$;
revoke all on function public.claim_dividend_payment_sources(),public.store_confirmed_dividend_payments(text,jsonb) from public,anon,authenticated;
grant execute on function public.claim_dividend_payment_sources(),public.store_confirmed_dividend_payments(text,jsonb) to service_role;


-- Repair only the previously unmatched public announcement. Never touch
-- personal receipts, transactions, holdings, confirmed amounts or other dates.
-- Issuer declaration: Dec 17, 2024; USD0.76; record Jan 9; payable Feb 7, 2025.
update public.dividends d set record_date=date '2025-01-09',payment_date=date '2025-02-07',
 source='mastercard_ri',
 source_url='https://investor.mastercard.com/investor-news/investor-news-details/2024/Mastercard-Board-of-Directors-Announces-Quarterly-Dividend-and-12-Billion-Share-Repurchase-Program/default.aspx'
where d.ticker='MA' and d.type='dividend' and d.ex_date=date '2025-01-10'
 and d.value_per_share=0.76 and d.source='yahoo' and d.payment_date is null and d.record_date is null
 and exists(select 1 from public.assets a where a.ticker=d.ticker and a.active and a.type='stock_us' and a.currency='USD');

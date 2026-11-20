begin;
alter table public.alerts add column paused boolean not null default false;
comment on column public.alerts.paused is 'Price target monitoring paused by owner; distinct from ignored retention.';
create or replace function public.monitor_price_targets()
returns integer language plpgsql security invoker set search_path = '' as $$
declare affected integer;
begin
  with latest as (
    select distinct on (p.ticker) p.ticker,p.close,p.date
    from public.price_history p
    where p.close > 0 and p.date <= current_date and p.date >= current_date - 7
      and exists (select 1 from public.alerts a where a.ticker=p.ticker and a.type='price_target' and a.status='lido' and not a.paused)
    order by p.ticker,p.date desc
  )
  update public.alerts a set status='novo',last_quote_date=q.date
  from latest q
  where a.ticker=q.ticker and a.type='price_target' and a.status='lido' and not a.paused
    and a.last_quote_date is distinct from q.date and a.target_price > 0
    and ((a.condition='below' and q.close <= a.target_price) or (a.condition='above' and q.close >= a.target_price));
  get diagnostics affected = row_count;
  return affected;
end;
$$;
revoke all on function public.monitor_price_targets() from public,anon,authenticated;
grant execute on function public.monitor_price_targets() to service_role;
commit;

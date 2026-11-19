-- Validate new trade writes without rounding or rewriting historical records.
create or replace function public.validate_brazilian_trade_units()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.type in ('buy', 'sell') and new.quantity <> trunc(new.quantity)
     and exists (select 1 from public.assets a where a.ticker = new.ticker
       and a.type in ('stock_br', 'fii', 'bdr', 'etf_br')) then
    raise exception using errcode = '23514', message = 'whole_units_required',
      detail = 'Brazilian exchange trades require whole units.';
  end if;
  return new;
end;
$$;
revoke all on function public.validate_brazilian_trade_units() from public;
create trigger validate_brazilian_trade_units
before insert or update of quantity, ticker, type on public.transactions
for each row execute function public.validate_brazilian_trade_units();
-- Opening balances written directly must obey the same rule. Nested position
-- recalculation keeps legitimate corporate-action fractions (bonus rights).
create or replace function public.validate_brazilian_opening_units()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if pg_trigger_depth() = 1 and new.quantity <> trunc(new.quantity)
     and (tg_op = 'INSERT' or new.quantity is distinct from old.quantity)
     and exists (select 1 from public.assets a where a.ticker=new.ticker and a.type in ('stock_br','fii','bdr','etf_br')) then
    raise exception using errcode='23514', message='whole_units_required';
  end if;
  return new;
end;
$$;
revoke all on function public.validate_brazilian_opening_units() from public;
create trigger validate_brazilian_opening_units before insert or update of quantity on public.positions
for each row execute function public.validate_brazilian_opening_units();

begin;

-- Validate new operations, without deleting or rewriting historical test data.
create function public.validate_movement_date()
returns trigger language plpgsql set search_path = '' as $function$
declare
  operation_date date := (to_jsonb(new) ->> tg_argv[0])::date;
begin
  if tg_op = 'UPDATE' then
    if (to_jsonb(new) ->> tg_argv[0]) is not distinct from (to_jsonb(old) ->> tg_argv[0]) then
      return new;
    end if;
  end if;
  if operation_date > (statement_timestamp() at time zone 'America/Sao_Paulo')::date then
    raise exception using errcode = '23514', message = 'A data da operação não pode estar no futuro.';
  end if;
  return new;
end;
$function$;
revoke all on function public.validate_movement_date() from public, anon, authenticated;

create trigger validate_transaction_date
before insert or update of transaction_date on public.transactions
for each row execute function public.validate_movement_date('transaction_date');
create trigger validate_position_acquisition_date
before insert or update of acquisition_date on public.positions
for each row execute function public.validate_movement_date('acquisition_date');
create trigger validate_fixed_income_application_date
before insert or update of application_date on public.fixed_income_positions
for each row execute function public.validate_movement_date('application_date');

-- Automatic alerts keep the previous deduplication. Manual price conditions
-- may coexist for a ticker, but identical active configurations stay unique.
drop index public.alerts_active_user_type_ticker_idx;
create unique index alerts_active_user_type_ticker_idx
on public.alerts(user_id, type, ticker)
where status <> 'ignorado' and type <> 'price_target';
create unique index alerts_active_price_condition_idx
on public.alerts(user_id, ticker, condition, target_price)
where status <> 'ignorado' and type = 'price_target';

commit;

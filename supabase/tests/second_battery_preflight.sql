-- Read-only. Run against the intended target immediately before applying
-- 20261030171736_validate_movement_dates_and_distinct_price_alerts.sql.
select
  exists(select 1 from supabase_migrations.schema_migrations where version = '20261030171736') as already_applied,
  to_regprocedure('public.validate_movement_date()') is not null as function_exists,
  to_regclass('public.alerts_active_price_condition_idx') is not null as new_index_exists;

select indexdef from pg_indexes
where schemaname = 'public' and indexname = 'alerts_active_user_type_ticker_idx';

select count(*) as duplicate_active_price_configurations from (
  select user_id, ticker, condition, target_price from public.alerts
  where type = 'price_target' and status <> 'ignorado'
  group by user_id, ticker, condition, target_price having count(*) > 1
) duplicates;

select count(*) as incomplete_active_price_configurations from public.alerts
where type = 'price_target' and status <> 'ignorado'
and (condition is null or target_price is null);

-- These counts are informational. Never delete records to pass this check.
select 'transactions' as entity, count(*) as future_dates from public.transactions
where transaction_date > (statement_timestamp() at time zone 'America/Sao_Paulo')::date
union all select 'positions', count(*) from public.positions
where acquisition_date > (statement_timestamp() at time zone 'America/Sao_Paulo')::date
union all select 'fixed_income_positions', count(*) from public.fixed_income_positions
where application_date > (statement_timestamp() at time zone 'America/Sao_Paulo')::date;

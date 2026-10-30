-- Read-only. Expected: three enabled triggers, two unique/valid indexes,
-- security invoker, empty search_path, no direct client execution, RLS enabled.
select c.relname as table_name, t.tgname, t.tgenabled,
  pg_get_triggerdef(t.oid) as definition
from pg_trigger t join pg_class c on c.oid = t.tgrelid
where t.tgfoid = to_regprocedure('public.validate_movement_date()');

select c.relname as index_name, i.indisunique, i.indisvalid,
  pg_get_indexdef(c.oid) as definition
from pg_index i join pg_class c on c.oid = i.indexrelid
where i.indexrelid in (to_regclass('public.alerts_active_user_type_ticker_idx'), to_regclass('public.alerts_active_price_condition_idx'));

select p.prosecdef as security_definer, p.proconfig,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute
from pg_proc p where p.oid = to_regprocedure('public.validate_movement_date()');

select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('transactions','positions','fixed_income_positions','alerts');

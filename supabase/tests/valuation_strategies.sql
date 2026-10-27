-- Teste transacional: precisa de duas contas existentes; nenhum dado é mantido.
begin;
do $$ begin
  if not public.valid_custom_strategy_rules('[{"metric":"dy","operator":"gte","min":6}]') then
    raise exception 'valid custom rules rejected';
  end if;
  if public.valid_custom_strategy_rules('[]') or public.valid_custom_strategy_rules('[{"metric":"dy","operator":"between","min":8,"max":6}]') then
    raise exception 'invalid custom rules allowed';
  end if;
end $$;
create temp table strategy_test_users as
select id, row_number() over(order by id) n from auth.users limit 2;
do $$ begin
  if (select count(*) from strategy_test_users) <> 2 then
    raise exception 'O teste requer duas contas';
  end if;
end $$;
grant select on strategy_test_users to authenticated;
select set_config('request.jwt.claim.sub', (select id::text from strategy_test_users where n=1), true);
set local role authenticated;
insert into public.valuation_strategies(user_id,name,method)
select id,'__test_strategy_rollback__','bazin' from strategy_test_users where n=1;
do $$ begin
  if (select count(*) from public.valuation_strategies where name='__test_strategy_rollback__') <> 1 then
    raise exception 'owner read failed';
  end if;
  begin
    insert into public.valuation_strategies(user_id,name,method)
    select id,'__test_attack__','graham' from strategy_test_users where n=2;
    raise exception 'cross-owner insert allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.valuation_strategies set user_id=(select id from strategy_test_users where n=2)
    where name='__test_strategy_rollback__';
    raise exception 'ownership reassignment allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
update public.valuation_strategies set show_in_assets=true where name='__test_strategy_rollback__';
reset role;
select set_config('request.jwt.claim.sub', (select id::text from strategy_test_users where n=2), true);
set local role authenticated;
do $$ declare changed integer; begin
  if exists(select 1 from public.valuation_strategies where name='__test_strategy_rollback__') then
    raise exception 'cross-owner read allowed';
  end if;
  update public.valuation_strategies set show_in_assets=false where name='__test_strategy_rollback__';
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'cross-owner update allowed'; end if;
  delete from public.valuation_strategies where name='__test_strategy_rollback__';
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'cross-owner delete allowed'; end if;
end $$;
reset role;
do $$ begin
  if has_table_privilege('anon','public.valuation_strategies','select') then
    raise exception 'anon read allowed';
  end if;
end $$;
rollback;

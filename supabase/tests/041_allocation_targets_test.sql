-- Altera apenas uma carteira temporária, dentro de uma transação revertida.
begin;
select set_config('allocation_test.user', (select user_id::text from public.wallets limit 1), true);
select set_config('request.jwt.claim.sub', current_setting('allocation_test.user'), true);
with fixture as (
  insert into public.wallets(user_id,name) values(current_setting('allocation_test.user')::uuid,'Allocation test') returning id
) select set_config('allocation_test.wallet',id::text,true) from fixture;
set local role authenticated;
do $$
declare w uuid := current_setting('allocation_test.wallet')::uuid; rejected boolean; affected integer;
begin
  update public.wallets set allocation_targets='{"stock_br":33.33,"fii":33.33,"fixed_income":33.34}' where id=w;
  if not exists(select 1 from public.wallets where id=w and allocation_targets->>'stock_br'='33.33') then raise exception 'FAIL save'; end if;
  rejected := false;
  begin update public.wallets set allocation_targets='{"stock_br":99}' where id=w;
  exception when check_violation then rejected := true; end;
  if not rejected then raise exception 'FAIL incomplete accepted'; end if;
  if public.valid_allocation_targets('{"stock_br":101,"fii":-1}') or public.valid_allocation_targets('{"bogus":100}') or public.valid_allocation_targets('{"fii":"100"}') then raise exception 'FAIL invalid accepted'; end if;
  perform set_config('request.jwt.claim.sub', gen_random_uuid()::text,true);
  if exists(select 1 from public.wallets where id=w) then raise exception 'FAIL cross-user read'; end if;
  update public.wallets set allocation_targets='{"crypto":100}' where id=w;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FAIL cross-user update'; end if;
end $$;
rollback;
select 'PASS: owner save, bounds, 100% constraint and cross-user RLS; fixture rolled back' as result;

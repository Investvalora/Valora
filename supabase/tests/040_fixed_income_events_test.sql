-- Transactional integration test. Uses a temporary position owned by an
-- existing user and rolls back every data change. Does not send emails.
begin;
select set_config('fi_test.user', (select user_id::text from public.fixed_income_positions limit 1), true);
select set_config('request.jwt.claim.sub', current_setting('fi_test.user'), true);
with fixture as (
  insert into public.fixed_income_positions(user_id,wallet_id,name,type,indexer,rate,principal,application_date)
  select user_id,wallet_id,'FI transactional test','cdb_pre','pre',10,1000,'2026-08-01'
  from public.fixed_income_positions where user_id=current_setting('fi_test.user')::uuid limit 1
  returning id
) select set_config('fi_test.position',id::text,true) from fixture;
set local role authenticated;
do $$
declare p uuid := current_setting('fi_test.position')::uuid; rejected boolean; closed_event uuid;
begin
  insert into public.fixed_income_events(position_id,type,event_date,amount,principal_redeemed,balance_after)
  values(p,'coupon','2026-08-31',20,0,1010);
  insert into public.fixed_income_events(position_id,type,event_date,amount,principal_redeemed,balance_after)
  values(p,'redemption','2026-09-15',620,600,420);
  if not exists(select 1 from public.fixed_income_positions where id=p and active and remaining_principal=400 and current_value=420) then raise exception 'FAIL partial redemption'; end if;
  rejected := false;
  begin
    insert into public.fixed_income_events(position_id,type,event_date,amount,principal_redeemed,balance_after) values(p,'redemption','2026-09-16',1000,500,1);
  exception when others then rejected := true; end;
  if not rejected then raise exception 'FAIL excess principal accepted'; end if;
  rejected := false;
  begin
    insert into public.fixed_income_events(position_id,type,event_date,amount,principal_redeemed,balance_after) values(p,'coupon','2026-08-15',1,0,420);
  exception when others then rejected := true; end;
  if not rejected then raise exception 'FAIL retroactive event accepted'; end if;
  insert into public.fixed_income_events(position_id,type,event_date,amount,principal_redeemed,balance_after) values(p,'redemption','2026-10-01',420,400,0) returning id into closed_event;
  insert into public.fixed_income_events(id,position_id,type,event_date,amount,principal_redeemed,balance_after) values(closed_event,p,'redemption','2026-10-01',420,400,0);
  rejected := false;
  begin
    insert into public.fixed_income_events(id,position_id,type,event_date,amount,principal_redeemed,balance_after) values(closed_event,p,'redemption','2026-10-01',999,400,0);
  exception when others then rejected := true; end;
  if not rejected then raise exception 'FAIL reused ID with different payload'; end if;
  if not exists(select 1 from public.fixed_income_positions where id=p and not active and remaining_principal=0 and current_value=0) then raise exception 'FAIL full redemption'; end if;
  if (select count(*) from public.fixed_income_events where position_id=p) <> 3 then raise exception 'FAIL history lost'; end if;
  perform set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  if exists(select 1 from public.fixed_income_events where position_id=p) then raise exception 'FAIL RLS read'; end if;
  rejected := false;
  begin
    insert into public.fixed_income_events(position_id,type,event_date,amount,principal_redeemed,balance_after) values(p,'coupon','2026-10-02',1,0,1);
  exception when others then rejected := true; end;
  if not rejected then raise exception 'FAIL RLS write'; end if;
end $$;
rollback;
select 'PASS: partial/full redemption, coupon, chronology, bounds, idempotency and cross-user RLS; all fixtures rolled back' as result;

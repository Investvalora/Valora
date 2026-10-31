-- Run in one transaction; all fixtures, including Auth users, are rolled back.
begin;
select set_config('valora.profile_owner',gen_random_uuid()::text,true);
select set_config('valora.profile_other',gen_random_uuid()::text,true);
insert into auth.users(id,aud,role,email,raw_user_meta_data)
select current_setting(key)::uuid,'authenticated','authenticated',
       current_setting(key)||'@profile-test.invalid','{"full_name":"Teste perfil"}'::jsonb
from (values('valora.profile_owner'),('valora.profile_other')) settings(key);

-- Simulate a legacy Auth account that predates the public-profile trigger.
delete from public.users where id=current_setting('valora.profile_owner')::uuid;
update auth.users set last_sign_in_at=clock_timestamp()
where id=current_setting('valora.profile_owner')::uuid;
do $$ begin
  if (select count(*) from public.users where id=current_setting('valora.profile_owner')::uuid)<>1
     or (select count(*) from public.wallets where user_id=current_setting('valora.profile_owner')::uuid and is_default)<>1 then
    raise exception 'Sign-in did not recover profile and default wallet';
  end if;
end $$;
update public.users set full_name='Existing profile must survive'
where id=current_setting('valora.profile_owner')::uuid;
update auth.users set last_sign_in_at=clock_timestamp()
where id=current_setting('valora.profile_owner')::uuid;
do $$ begin
  if (select full_name from public.users where id=current_setting('valora.profile_owner')::uuid)<>'Existing profile must survive'
     or (select count(*) from public.wallets where user_id=current_setting('valora.profile_owner')::uuid)<>1 then
    raise exception 'Repeated sign-in overwrote profile or duplicated wallets';
  end if;
end $$;

-- A client already signed in can recover on wallet INSERT too.
delete from public.users where id=current_setting('valora.profile_owner')::uuid;
delete from public.users where id=current_setting('valora.profile_other')::uuid;
select set_config('request.jwt.claim.sub',current_setting('valora.profile_owner'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('valora.profile_owner'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
  begin
    insert into public.wallets(user_id,name) values(current_setting('valora.profile_other')::uuid,'Forbidden');
    raise exception 'Cross-account wallet INSERT was accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
insert into public.wallets(user_id,name) values(current_setting('valora.profile_owner')::uuid,'Requested wallet');
insert into public.wallets(user_id,name) values(current_setting('valora.profile_owner')::uuid,'Second wallet');
do $$ begin
  if (select count(*) from public.wallets where user_id=current_setting('valora.profile_owner')::uuid)<>3 then
    raise exception 'Recovery did not preserve requested wallet and a single default';
  end if;
  begin
    insert into public.wallets(user_id,name,is_default) values(current_setting('valora.profile_owner')::uuid,'Forbidden default',true);
    raise exception 'Default-wallet RLS was bypassed';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
do $$ begin
  if exists(select 1 from public.users where id=current_setting('valora.profile_other')::uuid) then
    raise exception 'Cross-account request repaired another profile';
  end if;
  if has_function_privilege('authenticated','public.recover_wallet_owner_profile()','execute')
     or has_function_privilege('anon','public.recover_wallet_owner_profile()','execute')
     or has_function_privilege('authenticated','public.recover_profile_on_sign_in()','execute')
     or has_function_privilege('anon','public.recover_profile_on_sign_in()','execute') then
    raise exception 'Internal recovery functions exposed';
  end if;
end $$;
set local role anon;
do $$ begin
  begin
    insert into public.wallets(user_id,name) values(current_setting('valora.profile_owner')::uuid,'Anonymous');
    raise exception 'Anonymous wallet INSERT was accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
rollback;

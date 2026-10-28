begin;
select set_config('valora.test_user_id', gen_random_uuid()::text, true);

-- Usuário sintético somente dentro desta transação; não envia email nem cria sessão.
insert into auth.users(id, aud, role, email, raw_user_meta_data)
values(current_setting('valora.test_user_id')::uuid, 'authenticated', 'authenticated',
  current_setting('valora.test_user_id') || '@trigger-test.invalid',
  '{"full_name":"Teste de trigger","phone":""}'::jsonb);

do $$ begin
  if not exists(select 1 from public.users where id=current_setting('valora.test_user_id')::uuid and full_name='Teste de trigger') then
    raise exception 'Trigger de cadastro não copiou o perfil';
  end if;
  if has_function_privilege('anon','public.handle_new_user()','execute') or has_function_privilege('authenticated','public.handle_new_user()','execute') then
    raise exception 'Execução direta continua permitida';
  end if;
  if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('handle_new_user','handle_updated_at')
    and not coalesce(p.proconfig @> array['search_path=""'], false)) then
    raise exception 'search_path não está fixado';
  end if;
end $$;

select set_config('request.jwt.claim.sub', current_setting('valora.test_user_id'), true);
select set_config('request.jwt.claims', jsonb_build_object('sub',current_setting('valora.test_user_id'),'role','authenticated')::text, true);
set local role authenticated;
update public.users set full_name='Perfil atualizado', updated_at='2000-01-01T00:00:00Z'
where id=current_setting('valora.test_user_id')::uuid;
reset role;
do $$ begin
  if not exists(select 1 from public.users where id=current_setting('valora.test_user_id')::uuid
    and full_name='Perfil atualizado' and updated_at=now()) then
    raise exception 'Atualização autenticada ou trigger updated_at falhou';
  end if;
end $$;
rollback;

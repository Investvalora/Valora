-- Synthetic users only; no email or session is created, and everything rolls back.
begin;
do $$
declare
  first_id uuid := gen_random_uuid();
  other_id uuid := gen_random_uuid();
  original_email text;
begin
  original_email := first_id::text || '@example.invalid';
  insert into auth.users(id, email, raw_user_meta_data) values
    (first_id, original_email, '{"full_name":"Perfil de teste","phone":"11999999999"}'),
    (other_id, other_id::text || '@example.invalid', '{"full_name":"Outro perfil","phone":"1133334444"}');

  update auth.users set raw_user_meta_data = raw_user_meta_data || '{"full_name":" Ana  Maria ","phone":null}'::jsonb where id=first_id;
  if not exists(select 1 from public.users where id=first_id and full_name='Ana  Maria' and phone is null and email=original_email) then
    raise exception 'Name/phone not synchronized';
  end if;
  if not exists(select 1 from public.users where id=other_id and full_name='Outro perfil' and phone='1133334444') then
    raise exception 'Another profile changed';
  end if;
  update auth.users set email_change='pending-' || original_email where id=first_id;
  if not exists(select 1 from public.users where id=first_id and email=original_email) then
    raise exception 'Pending email incorrectly exposed as confirmed';
  end if;
  update auth.users set email='confirmed-' || original_email where id=first_id;
  if not exists(select 1 from public.users where id=first_id and email='confirmed-' || original_email) then
    raise exception 'Confirmed email not synchronized';
  end if;
  if has_function_privilege('anon','public.sync_user_profile_updates()','EXECUTE') or has_function_privilege('authenticated','public.sync_user_profile_updates()','EXECUTE') then
    raise exception 'Trigger function callable from clients';
  end if;
end $$;
rollback;

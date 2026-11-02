-- Recover legacy account profiles without overwriting existing records.
-- Applied as 20261031171016 through the Supabase MCP.
create function public.recover_profile_on_sign_in()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.users(id,email,full_name,phone,created_at)
  select new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name',''),
         new.raw_user_meta_data->>'phone',new.created_at
  where new.email is not null
    and not exists(select 1 from public.users p where p.id=new.id)
  on conflict(id) do nothing;
  return new;
end;
$$;
revoke all on function public.recover_profile_on_sign_in() from public, anon, authenticated;

create trigger recover_missing_profile_on_sign_in
after update of last_sign_in_at on auth.users
for each row when (old.last_sign_in_at is distinct from new.last_sign_in_at)
execute function public.recover_profile_on_sign_in();

create function public.recover_wallet_owner_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Do not let the privileged trigger repair a different user's profile.
  -- The existing wallets RLS still validates the INSERT after this trigger.
  if auth.role() in ('anon','authenticated') and auth.uid() is distinct from new.user_id then
    raise exception 'A carteira deve pertencer à conta autenticada.' using errcode='42501';
  end if;
  insert into public.users(id,email,full_name,phone,created_at)
  select a.id,a.email,coalesce(a.raw_user_meta_data->>'full_name',''),
         a.raw_user_meta_data->>'phone',a.created_at
  from auth.users a
  where a.id=new.user_id and a.email is not null
    and not exists(select 1 from public.users p where p.id=a.id)
  on conflict(id) do nothing;
  return new;
end;
$$;
revoke all on function public.recover_wallet_owner_profile() from public, anon, authenticated;

create trigger recover_missing_wallet_owner_profile
before insert on public.wallets
for each row execute function public.recover_wallet_owner_profile();

-- Existing profiles are deliberately never overwritten.
insert into public.users(id,email,full_name,phone,created_at)
select a.id,a.email,coalesce(a.raw_user_meta_data->>'full_name',''),
       a.raw_user_meta_data->>'phone',a.created_at
from auth.users a
where a.email is not null
  and not exists(select 1 from public.users p where p.id=a.id)
on conflict(id) do nothing;

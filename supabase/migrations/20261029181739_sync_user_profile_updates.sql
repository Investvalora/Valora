-- Keep the public profile consistent with confirmed Auth data.
-- User-editable metadata is used only for display/contact fields, never roles.
create function public.sync_user_profile_updates()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  profile_name text;
  profile_phone text;
begin
  profile_name := nullif(btrim(new.raw_user_meta_data->>'full_name'), '');
  profile_phone := nullif(btrim(new.raw_user_meta_data->>'phone'), '');
  update public.users u set
    full_name = coalesce(profile_name, u.full_name),
    phone = case when new.raw_user_meta_data ? 'phone' then profile_phone else u.phone end,
    email = coalesce(new.email, u.email)
  where u.id = new.id;
  return new;
end;
$$;
revoke all on function public.sync_user_profile_updates() from public, anon, authenticated;

create trigger on_auth_user_profile_updated
after update of raw_user_meta_data, email on auth.users
for each row
when (old.raw_user_meta_data is distinct from new.raw_user_meta_data or old.email is distinct from new.email)
execute function public.sync_user_profile_updates();

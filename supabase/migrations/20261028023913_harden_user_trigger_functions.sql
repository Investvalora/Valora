begin;
-- Mantém corpo, SECURITY DEFINER e vínculo com auth.users.
alter function public.handle_new_user() set search_path = '';
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Mantém SECURITY INVOKER e os triggers de updated_at existentes.
alter function public.handle_updated_at() set search_path = '';
commit;

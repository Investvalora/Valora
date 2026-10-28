begin;
-- Valida somente igualdade com a credencial do agendador. O segredo não sai
-- do Vault; a RPC recebe seu SHA-256 e só devolve um booleano ao backend.
create function public.authorize_alert_push(token_digest text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from vault.decrypted_secrets s
    where s.name='service_role_key'
      and token_digest ~ '^[0-9a-f]{64}$'
      and pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(s.decrypted_secret,'UTF8')),'hex')=token_digest
  );
$$;
revoke all on function public.authorize_alert_push(text) from public, anon, authenticated;
grant execute on function public.authorize_alert_push(text) to service_role;
commit;

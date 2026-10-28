-- Daily at 20:15 UTC / 17:15 America/Sao_Paulo, after macro sync at 20:00 UTC.
create function public.authorize_fixed_income_job(token_digest text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from vault.decrypted_secrets s
    where s.name = 'service_role_key' and token_digest ~ '^[0-9a-f]{64}$'
      and pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(s.decrypted_secret, 'UTF8')), 'hex') = token_digest
  );
$$;
revoke all on function public.authorize_fixed_income_job(text) from public, anon, authenticated;
grant execute on function public.authorize_fixed_income_job(text) to service_role;

select cron.schedule('recalculate-fixed-income-daily', '15 20 * * *', $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url' limit 1) || '/functions/v1/calc-fixed-income',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1)),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
$job$);

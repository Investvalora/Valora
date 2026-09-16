-- Migration 017: agendamento diário do sync-macro-rates
-- 20h00 UTC (17h BRT) seg–sex — antes do sync-bolsai-fundamentals (21h) e COTAHIST (22h)

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-macro-rates-diario') THEN
    PERFORM cron.unschedule('sync-macro-rates-diario');
  END IF;
END;
$$;

SELECT cron.schedule(
  'sync-macro-rates-diario',
  '0 20 * * 1-5',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/sync-macro-rates',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

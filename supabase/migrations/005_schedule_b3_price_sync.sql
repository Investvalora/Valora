-- Agendamento da ingestão automática de preços B3 (Story 2.8)
--
-- Agenda a Edge Function sync-b3-prices para rodar em dias úteis após o
-- fechamento do pregão, atualizando price_history com o COTAHIST do mês
-- corrente. Como a function faz upsert idempotente por (ticker, date),
-- rodar todo dia útil mantém a série em dia sem duplicar.
--
-- ─── SEGREDOS ──────────────────────────────────────────────────────────
-- A chamada precisa da service role key no header Authorization. Ela NÃO
-- pode ser versionada aqui. Antes de aplicar esta migration, grave-a no
-- Vault do Supabase (uma vez, fora do controle de versão):
--
--   select vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key');
--   select vault.create_secret('https://<REF>.supabase.co', 'project_url');
--
-- A migration lê os valores do Vault em tempo de execução do job.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove agendamento anterior se existir (idempotência da migration)
SELECT cron.unschedule('sync-b3-prices-diario')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-b3-prices-diario');

-- Seg-Sex às 22:00 UTC (19:00 America/Sao_Paulo), depois do fechamento e da
-- publicação do COTAHIST do dia. `meses=1` = só o mês corrente (upsert).
SELECT cron.schedule(
  'sync-b3-prices-diario',
  '0 22 * * 1-5',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/sync-b3-prices?meses=1',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    timeout_milliseconds := 120000
  );
  $$
);

COMMIT;

-- Verificação (rodar manualmente após aplicar):
--   select jobname, schedule, active from cron.job where jobname = 'sync-b3-prices-diario';
--   select status, return_message from cron.job_run_details
--     where jobid = (select jobid from cron.job where jobname = 'sync-b3-prices-diario')
--     order by start_time desc limit 5;

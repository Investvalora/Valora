-- Agendamento da atualização intradiária de cotações BR via brapi.dev
--
-- PLANO FREE brapi.dev: 1 ativo por requisição, dados a cada 30 min, 15.000 req/ciclo.
--
-- Executa `sync-brapi-prices` a cada 30 minutos durante o pregão da B3:
--   Pregão: 10h00–16h55 BRT = 13h00–19h55 UTC (desde março de 2026)
--   14 slots: 13:00, 13:30, 14:00, …, 19:00, 19:30 UTC — seg a sex
--
-- Consumo estimado:
--   27 ativos × 1 req/ativo × 14 execuções/dia × 22 dias úteis ≈ 8.316 req/mês
--   (~55% da cota free de 15.000)
--
-- O fechamento oficial é coberto pelo COTAHIST noturno (sync-b3-prices, 22h UTC),
-- que sobrescreve source='b3_cotahist' após o encerramento do pregão.
--
-- ─── PRÉ-REQUISITO ──────────────────────────────────────────────────────
-- Vault deve ter os segredos: 'project_url', 'service_role_key', 'brapi_key'
-- (criados pelas migrations 005 e 013 anterior)

-- Extensões necessárias (idempotente)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove jobs anteriores desta function (idempotência ao reaplicar)
DO $$
DECLARE
  v_job TEXT;
BEGIN
  FOREACH v_job IN ARRAY ARRAY[
    -- jobs antigos (4x/dia)
    'sync-brapi-abertura','sync-brapi-manha','sync-brapi-tarde','sync-brapi-pre-fechamento',
    -- jobs novos (30 em 30 min) — para reaplicação idempotente
    'sync-brapi-1300','sync-brapi-1330','sync-brapi-1400','sync-brapi-1430',
    'sync-brapi-1500','sync-brapi-1530','sync-brapi-1600','sync-brapi-1630',
    'sync-brapi-1700','sync-brapi-1730','sync-brapi-1800','sync-brapi-1830',
    'sync-brapi-1900','sync-brapi-1930'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = v_job) THEN
      PERFORM cron.unschedule(v_job);
    END IF;
  END LOOP;
END;
$$;

-- 14 slots a cada 30min durante o pregão (13h–19h30 UTC = 10h–16h30 BRT)
SELECT cron.schedule('sync-brapi-1300', '0 13 * * 1-5',
  $$ SELECT net.http_post(url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/sync-brapi-prices', headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')), body := '{}'::jsonb, timeout_milliseconds := 60000); $$);

SELECT cron.schedule('sync-brapi-1330', '30 13 * * 1-5',
  $$ SELECT net.http_post(url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/sync-brapi-prices', headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')), body := '{}'::jsonb, timeout_milliseconds := 60000); $$);

SELECT cron.schedule('sync-brapi-1400', '0 14 * * 1-5',
  $$ SELECT net.http_post(url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/sync-brapi-prices', headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')), body := '{}'::jsonb, timeout_milliseconds := 60000); $$);

SELECT cron.schedule('sync-brapi-1430', '30 14 * * 1-5',
  $$ SELECT net.http_post(url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/sync-brapi-prices', headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')), body := '{}'::jsonb, timeout_milliseconds := 60000); $$);

SELECT cron.schedule('sync-brapi-1500', '0 15 * * 1-5',
  $$ SELECT net.http_post(url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/sync-brapi-prices', headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')), body := '{}'::jsonb, timeout_milliseconds := 60000); $$);

SELECT cron.schedule('sync-brapi-1530', '30 15 * * 1-5',
  $$ SELECT net.http_post(url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/sync-brapi-prices', headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')), body := '{}'::jsonb, timeout_milliseconds := 60000); $$);

SELECT cron.schedule('sync-brapi-1600', '0 16 * * 1-5',
  $$ SELECT net.http_post(url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/sync-brapi-prices', headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')), body := '{}'::jsonb, timeout_milliseconds := 60000); $$);

SELECT cron.schedule('sync-brapi-1630', '30 16 * * 1-5',
  $$ SELECT net.http_post(url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/sync-brapi-prices', headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')), body := '{}'::jsonb, timeout_milliseconds := 60000); $$);

SELECT cron.schedule('sync-brapi-1700', '0 17 * * 1-5',
  $$ SELECT net.http_post(url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/sync-brapi-prices', headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')), body := '{}'::jsonb, timeout_milliseconds := 60000); $$);

SELECT cron.schedule('sync-brapi-1730', '30 17 * * 1-5',
  $$ SELECT net.http_post(url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/sync-brapi-prices', headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')), body := '{}'::jsonb, timeout_milliseconds := 60000); $$);

SELECT cron.schedule('sync-brapi-1800', '0 18 * * 1-5',
  $$ SELECT net.http_post(url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/sync-brapi-prices', headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')), body := '{}'::jsonb, timeout_milliseconds := 60000); $$);

SELECT cron.schedule('sync-brapi-1830', '30 18 * * 1-5',
  $$ SELECT net.http_post(url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/sync-brapi-prices', headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')), body := '{}'::jsonb, timeout_milliseconds := 60000); $$);

SELECT cron.schedule('sync-brapi-1900', '0 19 * * 1-5',
  $$ SELECT net.http_post(url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/sync-brapi-prices', headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')), body := '{}'::jsonb, timeout_milliseconds := 60000); $$);

SELECT cron.schedule('sync-brapi-1930', '30 19 * * 1-5',
  $$ SELECT net.http_post(url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/sync-brapi-prices', headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')), body := '{}'::jsonb, timeout_milliseconds := 60000); $$);

-- ─── Verificação ─────────────────────────────────────────────────────────
--   SELECT jobname, schedule, active FROM cron.job
--    WHERE jobname LIKE 'sync-brapi-%' ORDER BY jobname;

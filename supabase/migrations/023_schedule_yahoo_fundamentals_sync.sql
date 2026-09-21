-- Migration 023 — Agendamento diário de fundamentais via Yahoo Finance
--
-- Substitui o sync-bolsai-fundamentals que falha para FIIs e muitos ativos BR.
-- O Yahoo Finance retorna LPA, VPA, P/L, P/VP, DY, ROE e margem líquida
-- gratuitamente para stock_br, fii, bdr, stock_us, etf_us e reit.
--
-- Horário: 21h UTC (18h BRT), seg–sex — mesmo slot do bolsai.
-- O job sync-bolsai-fundamentals-diario é desativado (não removido) para
-- permitir reativação futura se necessário.
--
-- ─── PRÉ-REQUISITOS ────────────────────────────────────────────────────────
-- Vault já deve ter as secrets criadas pelas migrations anteriores:
--   project_url      → 'https://<REF>.supabase.co'
--   service_role_key → '<SERVICE_ROLE_KEY>'

BEGIN;

-- Desativar o job bolsai (mantém o registro para auditoria)
UPDATE cron.job
SET active = false
WHERE jobname = 'sync-bolsai-fundamentals-diario';

-- Remover job anterior do Yahoo se existir (idempotência)
SELECT cron.unschedule('sync-yahoo-fundamentals-diario')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-yahoo-fundamentals-diario');

-- Novo job Yahoo Finance — 21h UTC seg–sex
SELECT cron.schedule(
  'sync-yahoo-fundamentals-diario',
  '0 21 * * 1-5',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/sync-yahoo-fundamentals',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 180000
  );
  $$
);

COMMIT;

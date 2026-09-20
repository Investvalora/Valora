-- Migration 022 — Agendamento diário de sincronização de dividendos via Yahoo Finance
--
-- Agenda a Edge Function sync-dividends-yahoo para rodar em dias úteis às
-- 23h UTC (20h BRT), depois do COTAHIST (22h) e dos fundamentais bolsai (21h).
--
-- A função processa todos os ativos ativos do catálogo (stock_br, fii, bdr,
-- stock_us, etf_us, reit) e faz upsert na tabela `dividends` com source='yahoo',
-- corrigindo os dados sintéticos do seed.
--
-- ─── PRÉ-REQUISITOS ────────────────────────────────────────────────────────
-- Vault já deve ter as secrets criadas pelas migrations 005 e 009:
--   project_url     → 'https://<REF>.supabase.co'
--   service_role_key → '<SERVICE_ROLE_KEY>'
--
-- ─── TIMEOUT ───────────────────────────────────────────────────────────────
-- Com ~45 ativos e pausa de 350ms entre cada um:
--   45 × (350ms fetch + 350ms pausa) ≈ 32s de execução
-- Timeout de 180s é mais do que suficiente.

BEGIN;

SELECT cron.unschedule('sync-yahoo-dividends-diario')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-yahoo-dividends-diario');

SELECT cron.schedule(
  'sync-yahoo-dividends-diario',
  '0 23 * * 1-5',   -- seg–sex às 23h UTC (20h BRT)
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/sync-dividends-yahoo',
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

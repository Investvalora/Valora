-- Migration 018: agendamento para sync-global-assets
--
-- Atualização de ativos internacionais (stocks US, REITs, cripto) via
-- Edge Function sync-global-assets.
--
-- FONTE
--   - finnhub: stocks US, REITs (cotação atual, sem histórico)
--   - coingecko: criptomoedas (USD)
--   - awesomeapi: USD/BRL (conversão para patrimônio em BRL)
--
-- AGENDAMENTO
--   Pregão da Bolsa de Nova York: 9h30–16h00 BRT = 12h30–19h00 UTC
--   Agendamento: a cada 5 minutos nesse intervalo, seg–sex
--   Consumo estimado:
--     ~20 tickers × 1 req/ativo × 12 execuções/hora × 7 horas × 22 dias ≈ 37k req/mês
--     (dentro da cota free do Twelvedata/Coingecko na prática)
--
-- SEGURANCA
--   verify_jwt=true. A anon key é pública, então qualquer um com o bundle
--   do app poderia invocar a function. No entanto, a function só lê assets
--   ativos e faz upsert em price_history (data de hoje), sem risco de vazamento
--   ou exfiltração. Para agendamento interno, usa a service role key.
--
-- PRÉ-REQUISITOS
--   Vault deve ter os segredos: 'project_url', 'service_role_key'
--   (criados pelas migrations anteriores)

BEGIN;

-- Extensões necessárias (idempotente)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove agendamento anterior se existir (idempotência ao reaplicar)
SELECT cron.unschedule('sync-global-assets-every-5min')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-global-assets-every-5min');

-- A cada 5 minutos entre 12h30 e 19h00 UTC (9h30–16h00 BRT), seg a sex
-- Slots: 12:30, 12:35, ..., 18:55 (67 slots/dia)
DO $$
DECLARE
  hour INT;
  minute INT;
BEGIN
  FOR hour IN 12..18 LOOP
    FOR minute IN 0..59 BY 5 LOOP
      -- Pula horários fora do intervalo (antes das 12h30 ou após as 19h)
      IF (hour = 12 AND minute < 30) OR (hour = 19 AND minute > 0) THEN
        CONTINUE;
      END IF;
      -- Executa apenas se estivermos dentro do intervalo útil (ajuste fino)
      IF hour = 18 AND minute >= 55 THEN
        CONTINUE;
      END IF;
      PERFORM cron.schedule(
        'sync-global-assets-' || LPAD(hour::TEXT, 2, '0') || LPAD(minute::TEXT, 2, '0'),
        minute::TEXT || ' ' || hour::TEXT || ' * * 1-5',
        $$ SELECT net.http_post(
              url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
                     || '/functions/v1/sync-global-assets',
              headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
              ),
              timeout_milliseconds := 60000
            ); $$
      );
    END LOOP;
  END LOOP;
END;
$$;

COMMIT;

-- ─── Verificação ─────────────────────────────────────────────────────────
--   SELECT jobname, schedule, active FROM cron.job
--    WHERE jobname LIKE 'sync-global-assets-%' ORDER BY jobname;
--   SELECT status, return_message FROM cron.job_run_details
--     WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'sync-global-assets-1230')
--     ORDER BY start_time DESC LIMIT 5;

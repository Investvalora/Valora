-- Story price_target — Alertas de Preço-Alvo
-- Adiciona o tipo price_target ao ENUM e as colunas target_price/condition à tabela alerts.
-- Cria um índice UNIQUE específico para price_target que permite múltiplos preços-alvo
-- para o mesmo ticker (diferente do índice genérico de inconsistências/Bazin).

BEGIN;

-- 1. Novo valor no ENUM (idempotente)
ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'price_target';

COMMIT;

-- ALTER TYPE ADD VALUE não pode rodar dentro de transaction junto com DDL que
-- referencia o novo valor — commitar antes e abrir nova transação.

BEGIN;

-- 2. Colunas adicionais (nullable para não quebrar linhas existentes dos outros tipos)
ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS target_price NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS condition    TEXT CHECK (condition IN ('above', 'below'));

-- 3. Índice UNIQUE para price_target: permite MXRF11@9,00 below + MXRF11@10,00 below
--    mas bloqueia duplicata exata do mesmo ticker+preço+condição enquanto não ignorado.
CREATE UNIQUE INDEX IF NOT EXISTS alerts_active_price_target_idx
  ON public.alerts (user_id, ticker, target_price, condition)
  WHERE type = 'price_target' AND status <> 'ignorado';

COMMIT;

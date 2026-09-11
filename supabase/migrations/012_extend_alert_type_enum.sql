-- Story 6.2 — Alertas de Oportunidade e Sobrevalorização (Bazin)
-- Adiciona os novos tipos ao ENUM sem recriar a tabela.
-- `IF NOT EXISTS` torna a migration idempotente em re-execução.
ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'opportunity';
ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'overvalued';

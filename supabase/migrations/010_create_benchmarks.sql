-- Tabela pública de benchmarks de mercado (CDI, IBOV, IFIX).
-- Dados de mercado compartilhados — sem RLS por usuário,
-- mas com policy permissiva de SELECT para autenticados (padrão AD-6 para
-- tabelas de mercado: RLS habilitado + policy de leitura para authenticated).

BEGIN;

CREATE TABLE public.benchmarks (
  id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name   TEXT NOT NULL,           -- 'CDI' | 'IBOV' | 'IFIX'
  date   DATE NOT NULL,
  value  NUMERIC(18, 4) NOT NULL,
  source TEXT NOT NULL DEFAULT 'seed',
  CONSTRAINT benchmarks_value_positive CHECK (value > 0),
  CONSTRAINT benchmarks_name_valid CHECK (name IN ('CDI', 'IBOV', 'IFIX')),
  CONSTRAINT benchmarks_name_date_key UNIQUE (name, date)
);

CREATE INDEX idx_benchmarks_name_date ON public.benchmarks(name, date DESC);

-- RLS: padrão das tabelas de mercado (dividends, fundamentals, price_history)
ALTER TABLE public.benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Benchmarks legiveis por usuario autenticado"
  ON public.benchmarks FOR SELECT TO authenticated USING (true);

-- Revoga os default privileges do Supabase e concede apenas o necessário
REVOKE ALL ON public.benchmarks FROM anon, authenticated;
GRANT SELECT ON public.benchmarks TO authenticated;
GRANT ALL   ON public.benchmarks TO service_role;

COMMIT;

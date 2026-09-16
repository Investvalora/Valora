-- Migration 015: tabela de posições de renda fixa
BEGIN;

CREATE TABLE public.fixed_income_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  type TEXT NOT NULL CHECK (type IN (
    'tesouro_selic','tesouro_ipca','tesouro_pre',
    'cdb_cdi','cdb_pre','lci_cdi','lca_cdi','lci_pre','lca_pre'
  )),
  indexer TEXT NOT NULL CHECK (indexer IN ('selic','ipca','cdi','pre')),
  rate NUMERIC(10,4) NOT NULL CHECK (rate >= 0),
  principal NUMERIC(18,4) NOT NULL CHECK (principal > 0),
  application_date DATE NOT NULL,
  maturity_date DATE,
  current_value NUMERIC(18,4),
  last_updated_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fi_maturity_after_application
    CHECK (maturity_date IS NULL OR maturity_date > application_date)
);

CREATE INDEX fi_positions_user_active_idx ON public.fixed_income_positions (user_id, active) WHERE active;
CREATE INDEX fi_positions_user_type_idx   ON public.fixed_income_positions (user_id, type);

DROP TRIGGER IF EXISTS set_fi_positions_updated_at ON public.fixed_income_positions;
CREATE TRIGGER set_fi_positions_updated_at
  BEFORE UPDATE ON public.fixed_income_positions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.fixed_income_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário acessa apenas suas próprias posições de renda fixa"
  ON public.fixed_income_positions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

REVOKE ALL ON public.fixed_income_positions FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fixed_income_positions TO authenticated;
GRANT ALL ON public.fixed_income_positions TO service_role;

COMMIT;

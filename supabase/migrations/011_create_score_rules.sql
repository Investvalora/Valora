-- Score Fundamentalista Customizável — Story 5.1
-- Tabelas: score_rules (regras de score por usuário) e user_preferences (configurações/score ativo)
BEGIN;

-- ENUMs de métricas e operadores de score
-- IF NOT EXISTS previne erro em re-execução em ambientes de dev.
DO $$ BEGIN
  CREATE TYPE public.score_metric AS ENUM (
    'pl', 'pvp', 'roe', 'dy', 'debt_equity', 'net_margin'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.score_operator AS ENUM (
    'lt', 'lte', 'gt', 'gte', 'between'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Regras de Score Fundamentalista (privadas por usuário)
CREATE TABLE public.score_rules (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID          NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name         TEXT          NOT NULL,
  metric       score_metric  NOT NULL,
  operator     score_operator NOT NULL,
  threshold_min NUMERIC(18, 4) NOT NULL,
  threshold_max NUMERIC(18, 4),
  points        INTEGER       NOT NULL,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  -- Operador 'between' exige threshold_max; demais operadores proíbem threshold_max.
  CONSTRAINT score_rules_between_check CHECK (
    (operator = 'between' AND threshold_max IS NOT NULL)
    OR
    (operator <> 'between' AND threshold_max IS NULL)
  ),
  -- Garante que threshold_max > threshold_min quando operator = 'between'.
  -- Protege contra bypass da validação client-side via chamada direta à API.
  CONSTRAINT score_rules_threshold_order_check CHECK (
    operator <> 'between' OR threshold_max > threshold_min
  )
);

CREATE INDEX idx_score_rules_user ON public.score_rules(user_id);

ALTER TABLE public.score_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário gerencia próprias regras de score"
  ON public.score_rules FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

REVOKE ALL ON public.score_rules FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.score_rules TO authenticated;
GRANT ALL ON public.score_rules TO service_role;

-- Preferências de usuário (score ativo, método de valuation, etc.)
CREATE TABLE public.user_preferences (
  user_id              UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  default_score_rule_id UUID REFERENCES public.score_rules(id) ON DELETE SET NULL,
  valuation_method     TEXT NOT NULL DEFAULT 'bazin',
  preferred_currency   TEXT NOT NULL DEFAULT 'BRL',
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário gerencia próprias preferências"
  ON public.user_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

REVOKE ALL ON public.user_preferences FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;

COMMIT;

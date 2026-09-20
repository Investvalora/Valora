-- Migration 021 — Tabela insights
-- Salva resultados de análises Bazin/Graham para um ticker arbitrário escolhido
-- pelo usuário (não necessariamente da carteira). Cada insight pertence ao usuário
-- que o criou; RLS garante isolamento total.

BEGIN;

CREATE TYPE public.insight_strategy AS ENUM ('bazin', 'graham');

CREATE TABLE public.insights (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ticker        TEXT        NOT NULL REFERENCES public.assets(ticker) ON DELETE CASCADE,
  strategy      public.insight_strategy NOT NULL,

  -- Parâmetros usados no cálculo
  min_dy        NUMERIC(8, 4),      -- DY mínimo (apenas Bazin), ex: 0.06 para 6%

  -- Resultado calculado (snapshot no momento da criação)
  annual_dividend  NUMERIC(18, 4),  -- Dividendo anual em BRL (Bazin)
  ceiling_price    NUMERIC(18, 4),  -- Preço-teto Bazin em BRL
  graham_price     NUMERIC(18, 4),  -- Preço justo Graham em BRL
  current_price    NUMERIC(18, 4),  -- Cotação em BRL no momento do cálculo
  margin           NUMERIC(8, 4),   -- Margem de segurança (%)
  lpa              NUMERIC(18, 4),  -- LPA (Graham)
  vpa              NUMERIC(18, 4),  -- VPA (Graham)
  currency         TEXT NOT NULL DEFAULT 'BRL' CHECK (currency IN ('BRL', 'USD')),

  -- Notas opcionais do usuário
  notes         TEXT,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX insights_user_id_created_at_idx ON public.insights(user_id, created_at DESC);
CREATE INDEX insights_user_id_ticker_idx     ON public.insights(user_id, ticker);

DROP TRIGGER IF EXISTS set_insights_updated_at ON public.insights;
CREATE TRIGGER set_insights_updated_at
  BEFORE UPDATE ON public.insights
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Insights legiveis pelo proprio usuario"
  ON public.insights FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Insights inseriveis pelo proprio usuario"
  ON public.insights FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Insights removiveis pelo proprio usuario"
  ON public.insights FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

REVOKE ALL ON public.insights FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.insights TO authenticated;

COMMIT;

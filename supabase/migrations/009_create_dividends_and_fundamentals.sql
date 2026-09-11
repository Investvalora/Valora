-- Dados de mercado trimestrais para proventos e indicadores.

BEGIN;

CREATE TABLE public.dividends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL REFERENCES public.assets(ticker) ON DELETE CASCADE,
  ex_date DATE NOT NULL,
  payment_date DATE,
  value_per_share NUMERIC(18, 6) NOT NULL,
  type TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'seed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT dividends_value_positive CHECK (value_per_share > 0),
  CONSTRAINT dividends_type_valid CHECK (type IN ('dividend', 'jcp', 'interest')),
  CONSTRAINT dividends_payment_after_ex_date CHECK (payment_date IS NULL OR payment_date >= ex_date),
  CONSTRAINT dividends_ticker_ex_date_type_key UNIQUE (ticker, ex_date, type)
);

CREATE INDEX dividends_ticker_ex_date_idx ON public.dividends(ticker, ex_date DESC);

DROP TRIGGER IF EXISTS set_dividends_updated_at ON public.dividends;
CREATE TRIGGER set_dividends_updated_at
  BEFORE UPDATE ON public.dividends
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.fundamentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL REFERENCES public.assets(ticker) ON DELETE CASCADE,
  reference_date DATE NOT NULL,
  pl NUMERIC(18, 4) NOT NULL,
  pvp NUMERIC(18, 4) NOT NULL,
  roe NUMERIC(18, 4) NOT NULL,
  dy NUMERIC(18, 4) NOT NULL,
  debt_equity NUMERIC(18, 4) NOT NULL,
  net_margin NUMERIC(18, 4) NOT NULL,
  lpa NUMERIC(18, 4) NOT NULL,
  vpa NUMERIC(18, 4) NOT NULL,
  source TEXT NOT NULL DEFAULT 'seed',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fundamentals_pl_non_negative CHECK (pl >= 0),
  CONSTRAINT fundamentals_pvp_positive CHECK (pvp > 0),
  CONSTRAINT fundamentals_roe_valid CHECK (roe BETWEEN -100 AND 100),
  CONSTRAINT fundamentals_dy_non_negative CHECK (dy >= 0),
  CONSTRAINT fundamentals_debt_equity_non_negative CHECK (debt_equity >= 0),
  CONSTRAINT fundamentals_net_margin_valid CHECK (net_margin BETWEEN -100 AND 100),
  CONSTRAINT fundamentals_vpa_positive CHECK (vpa > 0),
  CONSTRAINT fundamentals_ticker_reference_date_key UNIQUE (ticker, reference_date)
);

CREATE INDEX fundamentals_ticker_reference_date_idx ON public.fundamentals(ticker, reference_date DESC);

DROP TRIGGER IF EXISTS set_fundamentals_updated_at ON public.fundamentals;
CREATE TRIGGER set_fundamentals_updated_at
  BEFORE UPDATE ON public.fundamentals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.dividends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fundamentals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dividendos legiveis por usuario autenticado"
  ON public.dividends FOR SELECT TO authenticated USING (true);
CREATE POLICY "Fundamentos legiveis por usuario autenticado"
  ON public.fundamentals FOR SELECT TO authenticated USING (true);

REVOKE ALL ON public.dividends FROM anon, authenticated;
REVOKE ALL ON public.fundamentals FROM anon, authenticated;
GRANT SELECT ON public.dividends, public.fundamentals TO authenticated;
GRANT ALL ON public.dividends, public.fundamentals TO service_role;

COMMIT;
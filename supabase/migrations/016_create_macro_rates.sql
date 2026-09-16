-- Migration 016: cache de taxas macroeconômicas (CDI, Selic, IPCA)
BEGIN;

CREATE TABLE public.macro_rates (
  series TEXT    NOT NULL CHECK (series IN ('cdi','selic','ipca')),
  date   DATE    NOT NULL,
  value  NUMERIC(18,8) NOT NULL,
  PRIMARY KEY (series, date)
);

CREATE INDEX macro_rates_series_date_idx ON public.macro_rates (series, date DESC);

ALTER TABLE public.macro_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Taxas macro legíveis por usuário autenticado"
  ON public.macro_rates FOR SELECT TO authenticated USING (true);

REVOKE ALL ON public.macro_rates FROM anon, authenticated;
GRANT SELECT ON public.macro_rates TO authenticated;
GRANT ALL    ON public.macro_rates TO service_role;

COMMIT;

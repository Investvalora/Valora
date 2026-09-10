BEGIN;

CREATE TYPE public.alert_status AS ENUM ('novo', 'lido', 'ignorado');
CREATE TYPE public.alert_type AS ENUM ('position_no_transactions', 'stale_quote');

CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type public.alert_type NOT NULL,
  ticker TEXT NOT NULL REFERENCES public.assets(ticker) ON DELETE RESTRICT,
  status public.alert_status NOT NULL DEFAULT 'novo',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  last_quote_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX alerts_user_id_created_at_idx ON public.alerts(user_id, created_at DESC);
CREATE INDEX alerts_user_id_status_idx ON public.alerts(user_id, status);
CREATE UNIQUE INDEX alerts_active_user_type_ticker_idx
  ON public.alerts(user_id, type, ticker)
  WHERE status <> 'ignorado';

DROP TRIGGER IF EXISTS set_alerts_updated_at ON public.alerts;
CREATE TRIGGER set_alerts_updated_at
  BEFORE UPDATE ON public.alerts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alertas legiveis pelo proprio usuario"
  ON public.alerts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Alertas inseriveis pelo proprio usuario"
  ON public.alerts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Alertas editaveis pelo proprio usuario"
  ON public.alerts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Alertas removiveis pelo proprio usuario"
  ON public.alerts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

REVOKE ALL ON public.alerts FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alerts TO authenticated;

COMMIT;
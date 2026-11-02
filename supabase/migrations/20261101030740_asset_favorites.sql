CREATE TABLE public.asset_favorites (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker text NOT NULL REFERENCES public.assets(ticker) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, ticker)
);
ALTER TABLE public.asset_favorites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.asset_favorites FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.asset_favorites TO authenticated;
CREATE POLICY favorites_select ON public.asset_favorites FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY favorites_insert ON public.asset_favorites FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY favorites_delete ON public.asset_favorites FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

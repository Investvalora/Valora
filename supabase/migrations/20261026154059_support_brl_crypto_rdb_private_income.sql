BEGIN;

-- Separate quote-currency pairs preserve all existing USD positions and costs.
INSERT INTO public.assets (ticker, name, type, currency, provider_symbol, quote_provider, active)
SELECT ticker || '-BRL', name || ' (BRL)', type, 'BRL', provider_symbol, quote_provider, active
FROM public.assets WHERE type = 'crypto' AND currency = 'USD'
  AND quote_provider = 'coingecko' AND ticker NOT LIKE '%-BRL'
ON CONFLICT (ticker) DO NOTHING;

ALTER TABLE public.fixed_income_positions DROP CONSTRAINT fixed_income_positions_type_check;
ALTER TABLE public.fixed_income_positions ADD CONSTRAINT fixed_income_positions_type_check CHECK (type IN (
  'tesouro_selic','tesouro_ipca','tesouro_pre','cdb_cdi','cdb_pre',
  'rdb_cdi','rdb_pre','lci_cdi','lca_cdi','lci_pre','lca_pre'
));

-- A complete paid-history import replaces estimates only inside its coverage.
CREATE TABLE public.wallet_income_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  wallet_id uuid NOT NULL,
  source text NOT NULL CHECK (length(btrim(source)) BETWEEN 1 AND 80),
  source_key text NOT NULL CHECK (length(btrim(source_key)) BETWEEN 1 AND 200),
  covered_from date NOT NULL,
  covered_until date NOT NULL CHECK (covered_until >= covered_from),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (wallet_id, user_id) REFERENCES public.wallets(id, user_id) ON DELETE CASCADE,
  UNIQUE (id, wallet_id, user_id),
  UNIQUE (wallet_id, source, source_key)
);
CREATE TABLE public.wallet_income (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  wallet_id uuid NOT NULL,
  import_id uuid NOT NULL,
  source_key text NOT NULL CHECK (length(btrim(source_key)) BETWEEN 1 AND 200),
  ticker text NOT NULL REFERENCES public.assets(ticker),
  type text NOT NULL CHECK (length(btrim(type)) BETWEEN 1 AND 80),
  record_date date,
  payment_date date NOT NULL,
  quantity numeric(18,8) NOT NULL CHECK (quantity >= 0),
  value_per_share numeric(24,10) NOT NULL CHECK (value_per_share >= 0),
  gross_amount numeric(24,8) NOT NULL CHECK (gross_amount >= 0),
  net_amount numeric(24,8) NOT NULL CHECK (net_amount >= 0 AND net_amount <= gross_amount),
  currency text NOT NULL CHECK (currency = 'BRL'),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (import_id, wallet_id, user_id)
    REFERENCES public.wallet_income_imports(id, wallet_id, user_id) ON DELETE CASCADE,
  UNIQUE (import_id, source_key)
);
CREATE INDEX wallet_income_owner_payment_idx ON public.wallet_income(user_id, wallet_id, payment_date, id);
CREATE INDEX wallet_income_imports_owner_idx ON public.wallet_income_imports(user_id, wallet_id);
ALTER TABLE public.wallet_income_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_income ENABLE ROW LEVEL SECURITY;
CREATE POLICY income_imports_owner ON public.wallet_income_imports FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY income_owner ON public.wallet_income FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
REVOKE ALL ON public.wallet_income_imports, public.wallet_income FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallet_income_imports, public.wallet_income TO authenticated;
GRANT ALL ON public.wallet_income_imports, public.wallet_income TO service_role;

COMMIT;

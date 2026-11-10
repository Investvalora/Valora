CREATE TABLE public.treasury_prices (
 type text NOT NULL CHECK(type IN ('tesouro_ipca','tesouro_pre','tesouro_selic')),
 maturity_date date NOT NULL,
 date date NOT NULL,
 base_price numeric(20,8) NOT NULL CHECK(base_price>0 AND base_price::text NOT IN ('NaN','Infinity','-Infinity')),
 source text NOT NULL DEFAULT 'tesouro_transparente' CHECK(source='tesouro_transparente'),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(type,maturity_date,date)
);
ALTER TABLE public.treasury_prices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.treasury_prices FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.treasury_prices TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.treasury_prices TO service_role;
CREATE POLICY treasury_prices_read ON public.treasury_prices FOR SELECT TO authenticated USING(true);
ALTER TABLE public.fixed_income_positions
 ADD COLUMN treasury_quantity numeric(20,8),
 ADD COLUMN valuation_method text NOT NULL DEFAULT 'contract' CHECK(valuation_method IN ('contract','market')),
 ADD COLUMN valuation_price_date date,
 ADD CONSTRAINT treasury_quantity_valid CHECK(treasury_quantity IS NULL OR
 (treasury_quantity>0 AND treasury_quantity::text NOT IN ('NaN','Infinity','-Infinity') AND type IN ('tesouro_ipca','tesouro_pre','tesouro_selic') AND maturity_date IS NOT NULL AND maturity_date>application_date AND name !~* 'juros|renda[+]|educa'));
SELECT cron.schedule('sync-treasury-prices-daily','30 11,22 * * 1-5',$job$
 SELECT net.http_post(
 url:=(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='project_url' LIMIT 1)||'/functions/v1/sync-treasury-prices',
 headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='service_role_key' LIMIT 1)),
 body:='{}'::jsonb,timeout_milliseconds:=180000);
$job$);

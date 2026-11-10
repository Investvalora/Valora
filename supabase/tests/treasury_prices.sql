BEGIN;
SET LOCAL ROLE service_role;
INSERT INTO public.treasury_prices(type,maturity_date,date,base_price) VALUES('tesouro_selic','2099-03-01','2026-10-30',1000);
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF (SELECT base_price FROM public.treasury_prices WHERE type='tesouro_selic' AND maturity_date='2099-03-01' AND date='2026-10-30')<>1000 THEN RAISE EXCEPTION 'read failed'; END IF;
 IF has_table_privilege('authenticated','public.treasury_prices','INSERT') OR has_table_privilege('anon','public.treasury_prices','SELECT') THEN RAISE EXCEPTION 'unsafe privileges'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
SELECT 'PASS treasury RLS, read and ingestion privileges; rolled back' result;

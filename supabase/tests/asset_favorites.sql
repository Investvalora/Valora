BEGIN;
SELECT set_config('favorites.owner',gen_random_uuid()::text,true),set_config('favorites.other',gen_random_uuid()::text,true);
INSERT INTO auth.users(id,aud,role,email,raw_user_meta_data)
SELECT current_setting(key)::uuid,'authenticated','authenticated',current_setting(key)||'@favorites-test.invalid','{}'::jsonb
FROM (VALUES('favorites.owner'),('favorites.other')) v(key);
SELECT set_config('request.jwt.claim.sub',current_setting('favorites.owner'),true);
SET LOCAL ROLE authenticated;
INSERT INTO public.asset_favorites(ticker) VALUES('AAPL');
DO $$ BEGIN
 IF (SELECT count(*) FROM public.asset_favorites)<>1 THEN RAISE EXCEPTION 'FAIL insert/read'; END IF;
 BEGIN
  INSERT INTO public.asset_favorites(ticker) VALUES('AAPL');
  RAISE EXCEPTION 'FAIL duplicate allowed';
 EXCEPTION WHEN unique_violation THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub',current_setting('favorites.other'),true);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.asset_favorites) THEN RAISE EXCEPTION 'FAIL leaked favorites'; END IF;
 DELETE FROM public.asset_favorites WHERE user_id=current_setting('favorites.owner')::uuid;
 IF FOUND THEN RAISE EXCEPTION 'FAIL cross-owner deletion'; END IF;
 BEGIN
  INSERT INTO public.asset_favorites(user_id,ticker) VALUES(current_setting('favorites.owner')::uuid,'MSFT');
  RAISE EXCEPTION 'FAIL owner spoof accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 INSERT INTO public.asset_favorites(ticker) VALUES('AAPL');
END $$;
SELECT set_config('request.jwt.claim.sub',current_setting('favorites.owner'),true);
DELETE FROM public.asset_favorites WHERE ticker='AAPL';
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.asset_favorites) THEN RAISE EXCEPTION 'FAIL removal'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.asset_favorites WHERE user_id=current_setting('favorites.other')::uuid)<>1 THEN RAISE EXCEPTION 'FAIL other owner changed'; END IF;
 IF has_table_privilege('anon','public.asset_favorites','select') OR has_table_privilege('anon','public.asset_favorites','insert') THEN RAISE EXCEPTION 'FAIL anon grant'; END IF;
END $$;
ROLLBACK;
SELECT 'PASS favorites persistence, duplicate prevention, removal and owner isolation; rolled back' AS result;

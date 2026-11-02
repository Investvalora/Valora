-- Run after the migration, or combine migration + this script in one BEGIN.
BEGIN;
SELECT set_config('wallet_delete.owner',gen_random_uuid()::text,true),
       set_config('wallet_delete.other',gen_random_uuid()::text,true),
       set_config('wallet_delete.target',gen_random_uuid()::text,true),
       set_config('wallet_delete.sibling',gen_random_uuid()::text,true),
       set_config('wallet_delete.foreign',gen_random_uuid()::text,true);
INSERT INTO auth.users(id,aud,role,email,raw_user_meta_data)
SELECT current_setting(key)::uuid,'authenticated','authenticated',current_setting(key)||'@wallet-delete-test.invalid','{"full_name":"Wallet deletion fixture"}'::jsonb
FROM (VALUES('wallet_delete.owner'),('wallet_delete.other')) settings(key);
INSERT INTO public.wallets(id,user_id,name) VALUES
 (current_setting('wallet_delete.target')::uuid,current_setting('wallet_delete.owner')::uuid,'Delete fixture'),
 (current_setting('wallet_delete.sibling')::uuid,current_setting('wallet_delete.owner')::uuid,'Sibling fixture'),
 (current_setting('wallet_delete.foreign')::uuid,current_setting('wallet_delete.other')::uuid,'Other fixture');
SELECT set_config('request.jwt.claim.sub',current_setting('wallet_delete.owner'),true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('wallet_delete.owner'),'role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
INSERT INTO public.transactions(user_id,wallet_id,ticker,type,quantity,price,transaction_date)
SELECT current_setting('wallet_delete.owner')::uuid,current_setting(key)::uuid,'BBAS3','buy',10,20,'2026-01-05'
FROM (VALUES('wallet_delete.target'),('wallet_delete.sibling')) settings(key);
-- Legacy manual position fixture seeded by test admin, not client privilege.
RESET ROLE;
INSERT INTO public.positions(user_id,wallet_id,ticker,quantity,average_price,acquisition_date)
VALUES(current_setting('wallet_delete.owner')::uuid,current_setting('wallet_delete.target')::uuid,'BBSE3',1,20,'2026-01-05');
SET LOCAL ROLE authenticated;
INSERT INTO public.fixed_income_positions(user_id,wallet_id,name,type,indexer,rate,principal,application_date)
VALUES(current_setting('wallet_delete.owner')::uuid,current_setting('wallet_delete.target')::uuid,'RDB fixture','rdb_cdi','cdi',115,100,'2026-01-01');
INSERT INTO public.fixed_income_events(user_id,wallet_id,position_id,type,event_date,amount,principal_redeemed,balance_after)
SELECT user_id,wallet_id,id,'coupon','2026-02-01',1,0,100 FROM public.fixed_income_positions
WHERE wallet_id=current_setting('wallet_delete.target')::uuid;
INSERT INTO public.wallet_income_imports(user_id,wallet_id,source,source_key,covered_from,covered_until)
VALUES(current_setting('wallet_delete.owner')::uuid,current_setting('wallet_delete.target')::uuid,'test','batch','2026-01-01','2026-02-28');
INSERT INTO public.wallet_income(user_id,wallet_id,import_id,source_key,ticker,type,payment_date,quantity,value_per_share,gross_amount,net_amount,currency)
SELECT user_id,wallet_id,id,'receipt','BBAS3','dividend','2026-02-01',10,1,10,10,'BRL' FROM public.wallet_income_imports
WHERE wallet_id=current_setting('wallet_delete.target')::uuid;
DO $$ DECLARE v_default uuid; BEGIN
  SELECT id INTO v_default FROM public.wallets WHERE user_id=auth.uid() AND is_default;
  BEGIN
    PERFORM public.delete_owned_wallet(v_default,'Minha Carteira');
    RAISE EXCEPTION 'FAIL default deletion';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  DELETE FROM public.wallets WHERE id=v_default;
  IF FOUND THEN RAISE EXCEPTION 'FAIL direct default deletion'; END IF;
  BEGIN
    PERFORM public.delete_owned_wallet(current_setting('wallet_delete.foreign')::uuid,'Other fixture');
    RAISE EXCEPTION 'FAIL cross-account deletion';
  EXCEPTION WHEN no_data_found THEN NULL; END;
  BEGIN
    PERFORM public.delete_owned_wallet(current_setting('wallet_delete.target')::uuid,'wrong name');
    RAISE EXCEPTION 'FAIL name confirmation';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  IF (SELECT count(*) FROM public.transactions WHERE wallet_id=current_setting('wallet_delete.target')::uuid)<>1 THEN
    RAISE EXCEPTION 'FAIL records changed by rejected request';
  END IF;
  PERFORM public.delete_owned_wallet(current_setting('wallet_delete.target')::uuid,'Delete fixture');
  IF EXISTS(SELECT 1 FROM public.wallets WHERE id=current_setting('wallet_delete.target')::uuid)
    OR EXISTS(SELECT 1 FROM public.transactions WHERE wallet_id=current_setting('wallet_delete.target')::uuid)
    OR EXISTS(SELECT 1 FROM public.positions WHERE wallet_id=current_setting('wallet_delete.target')::uuid)
    OR EXISTS(SELECT 1 FROM public.fixed_income_positions WHERE wallet_id=current_setting('wallet_delete.target')::uuid)
    OR EXISTS(SELECT 1 FROM public.fixed_income_events WHERE wallet_id=current_setting('wallet_delete.target')::uuid)
    OR EXISTS(SELECT 1 FROM public.wallet_income_imports WHERE wallet_id=current_setting('wallet_delete.target')::uuid)
    OR EXISTS(SELECT 1 FROM public.wallet_income WHERE wallet_id=current_setting('wallet_delete.target')::uuid) THEN
    RAISE EXCEPTION 'FAIL related records survived';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.wallets WHERE id=v_default)
    OR (SELECT count(*) FROM public.positions WHERE wallet_id=current_setting('wallet_delete.sibling')::uuid)<>1
    OR (SELECT count(*) FROM public.transactions WHERE wallet_id=current_setting('wallet_delete.sibling')::uuid)<>1 THEN
    RAISE EXCEPTION 'FAIL sibling/default changed';
  END IF;
END $$;
RESET ROLE;
-- Force a late failure after child deletion: the RPC must restore all children.
CREATE FUNCTION pg_temp.reject_fixture_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Fixture late failure' USING ERRCODE='23514'; END $$;
CREATE TRIGGER wallet_delete_fixture_failure BEFORE DELETE ON public.wallets
FOR EACH ROW WHEN (OLD.id=current_setting('wallet_delete.sibling')::uuid)
EXECUTE FUNCTION pg_temp.reject_fixture_delete();
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN
    PERFORM public.delete_owned_wallet(current_setting('wallet_delete.sibling')::uuid,'Sibling fixture');
    RAISE EXCEPTION 'FAIL forced failure not raised';
  EXCEPTION WHEN check_violation THEN NULL; END;
  IF NOT EXISTS(SELECT 1 FROM public.wallets WHERE id=current_setting('wallet_delete.sibling')::uuid)
    OR (SELECT count(*) FROM public.positions WHERE wallet_id=current_setting('wallet_delete.sibling')::uuid)<>1
    OR (SELECT count(*) FROM public.transactions WHERE wallet_id=current_setting('wallet_delete.sibling')::uuid)<>1 THEN
    RAISE EXCEPTION 'FAIL RPC was not atomic';
  END IF;
END $$;
RESET ROLE;
DROP TRIGGER wallet_delete_fixture_failure ON public.wallets;
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.wallets WHERE id=current_setting('wallet_delete.foreign')::uuid) THEN
    RAISE EXCEPTION 'FAIL other owner wallet missing';
  END IF;
  IF has_function_privilege('anon','public.delete_owned_wallet(uuid,text)','execute') THEN
    RAISE EXCEPTION 'FAIL anonymous RPC privilege';
  END IF;
END $$;
SET LOCAL ROLE anon;
DO $$ BEGIN
  BEGIN
    PERFORM public.delete_owned_wallet(current_setting('wallet_delete.sibling')::uuid,'Sibling fixture');
    RAISE EXCEPTION 'FAIL anonymous deletion';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
SELECT 'PASS wallet deletion, ownership, default protection, confirmation, cascade, sibling preservation and anon denial; rolled back' AS result;

-- Uses an existing wallet only as an owner fixture. Everything is rolled back.
BEGIN;
SELECT set_config('income_test.user', user_id::text, true), set_config('income_test.wallet', id::text, true)
FROM public.wallets ORDER BY created_at LIMIT 1;
SELECT set_config('request.jwt.claim.sub', current_setting('income_test.user'), true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE batch uuid := gen_random_uuid(); receipt uuid := gen_random_uuid(); rejected boolean;
  owner_id uuid := current_setting('income_test.user')::uuid;
  wallet uuid := current_setting('income_test.wallet')::uuid;
BEGIN
  INSERT INTO public.fixed_income_positions(user_id,wallet_id,name,type,indexer,rate,principal,application_date)
  VALUES(owner_id,wallet,'RDB fixture','rdb_cdi','cdi',115,100,'2026-01-01');
  INSERT INTO public.wallet_income_imports(id,user_id,wallet_id,source,source_key,covered_from,covered_until)
  VALUES(batch,owner_id,wallet,'test',batch::text,'2024-01-01','2026-10-26');
  INSERT INTO public.wallet_income(id,user_id,wallet_id,import_id,source_key,ticker,type,record_date,payment_date,quantity,value_per_share,gross_amount,net_amount,currency)
  VALUES(receipt,owner_id,wallet,batch,'one','BBAS3','jcp','2026-01-01','2026-01-15',10,0.2,2,1.7,'BRL');
  IF NOT EXISTS(SELECT 1 FROM public.wallet_income WHERE id=receipt AND net_amount=1.7) THEN RAISE EXCEPTION 'FAIL receipt'; END IF;
  rejected := false;
  BEGIN
    INSERT INTO public.wallet_income(user_id,wallet_id,import_id,source_key,ticker,type,payment_date,quantity,value_per_share,gross_amount,net_amount,currency)
    VALUES(owner_id,wallet,batch,'one','BBAS3','jcp','2026-01-15',10,0.2,2,1.7,'BRL');
  EXCEPTION WHEN unique_violation THEN rejected:=true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'FAIL duplicate source payment'; END IF;
  rejected := false;
  BEGIN
    UPDATE public.wallet_income SET wallet_id=gen_random_uuid() WHERE id=receipt;
  EXCEPTION WHEN foreign_key_violation THEN rejected:=true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'FAIL forged wallet'; END IF;
  PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  IF EXISTS(SELECT 1 FROM public.wallet_income WHERE id=receipt) OR EXISTS(SELECT 1 FROM public.wallet_income_imports WHERE id=batch) THEN RAISE EXCEPTION 'FAIL cross-user read'; END IF;
  UPDATE public.wallet_income SET net_amount=0 WHERE id=receipt;
  IF FOUND THEN RAISE EXCEPTION 'FAIL cross-user update'; END IF;
  rejected := false;
  BEGIN
    INSERT INTO public.wallet_income_imports(user_id,wallet_id,source,source_key,covered_from,covered_until)
    VALUES(owner_id,wallet,'test',gen_random_uuid()::text,'2024-01-01','2026-10-26');
  EXCEPTION WHEN insufficient_privilege THEN rejected:=true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'FAIL cross-user insert'; END IF;
END $$;
ROLLBACK;
SELECT 'PASS RDB, receipt amounts, duplicate protection, wallet FK and cross-user RLS; all changes rolled back' AS result;

BEGIN;
SELECT set_config('tx_edit.owner',gen_random_uuid()::text,true),set_config('tx_edit.other',gen_random_uuid()::text,true),
       set_config('tx_edit.wallet',gen_random_uuid()::text,true),set_config('tx_edit.first',gen_random_uuid()::text,true),set_config('tx_edit.second',gen_random_uuid()::text,true);
INSERT INTO auth.users(id,aud,role,email,raw_user_meta_data)
SELECT current_setting(key)::uuid,'authenticated','authenticated',current_setting(key)||'@transaction-edit-test.invalid','{"full_name":"Transaction edit fixture"}'::jsonb
FROM (VALUES('tx_edit.owner'),('tx_edit.other')) settings(key);
INSERT INTO public.wallets(id,user_id,name) VALUES(current_setting('tx_edit.wallet')::uuid,current_setting('tx_edit.owner')::uuid,'Edit fixture');
SELECT set_config('request.jwt.claim.sub',current_setting('tx_edit.owner'),true);
SET LOCAL ROLE authenticated;
-- Same ticker in another wallet must not enter the edited position's basis.
INSERT INTO public.transactions(user_id,wallet_id,ticker,type,quantity,price,transaction_date)
SELECT auth.uid(),id,'BBAS3','buy',7,99,'2026-01-01' FROM public.wallets WHERE user_id=auth.uid() AND is_default;
INSERT INTO public.transactions(id,user_id,wallet_id,ticker,type,quantity,price,transaction_date) VALUES
 (current_setting('tx_edit.first')::uuid,auth.uid(),current_setting('tx_edit.wallet')::uuid,'BBAS3','buy',10,10,'2026-01-01'),
 (current_setting('tx_edit.second')::uuid,auth.uid(),current_setting('tx_edit.wallet')::uuid,'BBAS3','buy',10,20,'2026-01-02');
INSERT INTO public.transactions(user_id,wallet_id,ticker,type,quantity,price,transaction_date)
VALUES(auth.uid(),current_setting('tx_edit.wallet')::uuid,'BBAS3','sell',5,30,'2026-01-03');
DO $$ DECLARE t public.transactions; expected jsonb; original_snapshot jsonb; qty numeric; pm numeric; BEGIN
 SELECT * INTO t FROM public.transactions WHERE id=current_setting('tx_edit.first')::uuid;
 expected:=to_jsonb(t)-ARRAY['id','seq','user_id','wallet_id','ticker','created_at']; original_snapshot:=expected;
 PERFORM public.edit_owned_transaction(t.id,expected,'buy','2026-01-01',20,12,1,2);
 SELECT quantity,average_price INTO qty,pm FROM public.positions WHERE wallet_id=t.wallet_id AND ticker=t.ticker;
 IF qty<>25 OR pm<>14.6667 THEN RAISE EXCEPTION 'FAIL quantity/average after edit: %, %',qty,pm; END IF;
 BEGIN
   PERFORM public.edit_owned_transaction(t.id,original_snapshot,'buy','2026-01-01',10,10,0,0);
   RAISE EXCEPTION 'FAIL stale overwrite accepted';
 EXCEPTION WHEN serialization_failure THEN NULL; END;
 SELECT * INTO t FROM public.transactions WHERE id=t.id;
 expected:=to_jsonb(t)-ARRAY['id','seq','user_id','wallet_id','ticker','created_at'];
 PERFORM public.edit_owned_transaction(t.id,expected,'buy','2026-01-04',20,12,1,2);
 SELECT quantity,average_price INTO qty,pm FROM public.positions WHERE wallet_id=t.wallet_id AND ticker=t.ticker;
 IF qty<>25 OR pm<>13.6 THEN RAISE EXCEPTION 'FAIL chronological recalculation: %, %',qty,pm; END IF;
 SELECT * INTO t FROM public.transactions WHERE id=t.id;
 expected:=to_jsonb(t)-ARRAY['id','seq','user_id','wallet_id','ticker','created_at'];
 BEGIN
   PERFORM public.edit_owned_transaction(t.id,expected,'sell',t.transaction_date,20,12,1,2);
   RAISE EXCEPTION 'FAIL oversold history accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
   PERFORM public.edit_owned_transaction(t.id,expected,'buy','2999-01-01',20,12,1,2);
   RAISE EXCEPTION 'FAIL future edit accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
   PERFORM public.edit_owned_transaction(t.id,expected,'buy',t.transaction_date,0,12,1,2);
   RAISE EXCEPTION 'FAIL zero quantity accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
   PERFORM public.edit_owned_transaction(t.id,expected,'buy',t.transaction_date,20,12.12345,1,2);
   RAISE EXCEPTION 'FAIL monetary rounding accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN
   UPDATE public.transactions SET ticker='BBSE3' WHERE id=t.id;
   RAISE EXCEPTION 'FAIL ticker mutation accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 -- Direct API UPDATE must also respect the historical-balance guard.
 BEGIN
   UPDATE public.transactions SET quantity=2 WHERE id=current_setting('tx_edit.second')::uuid;
   RAISE EXCEPTION 'FAIL direct update bypass';
 EXCEPTION WHEN check_violation THEN NULL; END;
 SELECT quantity,average_price INTO qty,pm FROM public.positions WHERE wallet_id=t.wallet_id AND ticker=t.ticker;
 IF qty<>25 OR pm<>13.6 THEN RAISE EXCEPTION 'FAIL rejected edit changed position'; END IF;
 IF (SELECT brokerage_fee<>1 OR tax<>2 FROM public.transactions WHERE id=t.id) THEN RAISE EXCEPTION 'FAIL costs not persisted'; END IF;
 PERFORM set_config('request.jwt.claim.sub',current_setting('tx_edit.other'),true);
 BEGIN
   PERFORM public.edit_owned_transaction(t.id,expected,'buy',t.transaction_date,20,12,1,2);
   RAISE EXCEPTION 'FAIL cross-account edit';
 EXCEPTION WHEN serialization_failure THEN NULL; END;
 PERFORM set_config('request.jwt.claim.sub',current_setting('tx_edit.owner'),true);
 -- Editing a sell recomputes the remaining basis, including an intraday close.
 SELECT * INTO t FROM public.transactions WHERE wallet_id=current_setting('tx_edit.wallet')::uuid AND type='sell';
 expected:=to_jsonb(t)-ARRAY['id','seq','user_id','wallet_id','ticker','created_at'];
 PERFORM public.edit_owned_transaction(t.id,expected,'sell','2026-01-03',10,30,0,0);
 SELECT quantity,average_price INTO qty,pm FROM public.positions WHERE wallet_id=t.wallet_id AND ticker=t.ticker;
 IF qty<>20 OR pm<>12 THEN RAISE EXCEPTION 'FAIL sale edit/intraday closing: %, %',qty,pm; END IF;
 SELECT * INTO t FROM public.transactions WHERE id=current_setting('tx_edit.first')::uuid;
 expected:=to_jsonb(t)-ARRAY['id','seq','user_id','wallet_id','ticker','created_at'];
 PERFORM public.edit_owned_transaction(t.id,expected,'buy','2026-01-03',20,12,1,2);
 SELECT quantity,average_price INTO qty,pm FROM public.positions WHERE wallet_id=t.wallet_id AND ticker=t.ticker;
 IF qty<>20 OR pm<>14.6667 THEN RAISE EXCEPTION 'FAIL same-day sequence: %, %',qty,pm; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.positions WHERE user_id=auth.uid() AND wallet_id<>t.wallet_id
     AND ticker='BBAS3' AND quantity=7 AND average_price=99) THEN
   RAISE EXCEPTION 'FAIL another wallet changed';
 END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF has_function_privilege('anon','public.edit_owned_transaction(uuid,jsonb,text,date,numeric,numeric,numeric,numeric)','execute') THEN RAISE EXCEPTION 'FAIL anon privilege'; END IF;
END $$;
ROLLBACK;
SELECT 'PASS editing, chronological recalculation, stale-write protection, invalid history/date/value rollback and account isolation; rolled back' AS result;

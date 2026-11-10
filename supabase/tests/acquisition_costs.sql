-- Run against a disposable database after the acquisition-cost migration.
BEGIN;
DO $test$
DECLARE owner_id uuid:=gen_random_uuid(); wallet uuid; position record;
BEGIN
 INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES(owner_id,owner_id::text||'@cost-test.invalid','{"full_name":"Cost fixture"}');
 SELECT id INTO wallet FROM public.wallets WHERE user_id=owner_id LIMIT 1;
 IF wallet IS NULL THEN INSERT INTO public.wallets(user_id,name) VALUES(owner_id,'Cost test') RETURNING id INTO wallet; END IF;
 INSERT INTO public.transactions(user_id,wallet_id,ticker,type,quantity,price,brokerage_fee,tax,transaction_date)
 VALUES(owner_id,wallet,'PETR4','buy',10,10,2,1,'2026-01-02'),(owner_id,wallet,'PETR4','buy',10,20,1,1,'2026-01-03');
 SELECT * INTO position FROM public.positions WHERE wallet_id=wallet AND ticker='PETR4';
 IF position.quantity<>20 OR position.average_price<>15.25 THEN RAISE EXCEPTION 'Purchase costs omitted'; END IF;
 INSERT INTO public.transactions(user_id,wallet_id,ticker,type,quantity,price,brokerage_fee,tax,transaction_date)
 VALUES(owner_id,wallet,'PETR4','sell',5,30,20,5,'2026-01-04');
 SELECT * INTO position FROM public.positions WHERE wallet_id=wallet AND ticker='PETR4';
 IF position.quantity<>15 OR position.average_price<>15.25 THEN RAISE EXCEPTION 'Sale expenses changed remaining unit cost'; END IF;
 IF has_function_privilege('authenticated','public.recalculate_wallet_position(uuid,uuid,text)','execute') THEN RAISE EXCEPTION 'Private RPC exposed'; END IF;
END $test$;
ROLLBACK;

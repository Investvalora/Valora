BEGIN;
INSERT INTO public.assets(ticker,name,type,quote_provider) VALUES ('QASIX','Week six guard','stock_br','brapi') ON CONFLICT DO NOTHING;
SELECT set_config('week6.owner',gen_random_uuid()::text,true),set_config('week6.wallet',gen_random_uuid()::text,true);
INSERT INTO auth.users(id,aud,role,email,raw_user_meta_data) VALUES(current_setting('week6.owner')::uuid,'authenticated','authenticated',current_setting('week6.owner')||'@week6.invalid','{"full_name":"Week six fixture"}');
INSERT INTO public.wallets(id,user_id,name) VALUES(current_setting('week6.wallet')::uuid,current_setting('week6.owner')::uuid,'Week Six');
SELECT set_config('request.jwt.claim.sub',current_setting('week6.owner'),true);
SET LOCAL ROLE authenticated;
SET CONSTRAINTS complete_transaction_history IMMEDIATE;
DO $$ DECLARE other_wallet uuid; BEGIN
 INSERT INTO public.wallets(user_id,name) VALUES(auth.uid(),'Week Six alternate') RETURNING id INTO other_wallet;
 INSERT INTO public.transactions(user_id,wallet_id,ticker,type,quantity,price,transaction_date) VALUES(auth.uid(),other_wallet,'QASIX','buy',20,40,'2026-10-01');
 INSERT INTO public.transactions(user_id,wallet_id,ticker,type,quantity,price,transaction_date)
 VALUES(auth.uid(),current_setting('week6.wallet')::uuid,'QASIX','buy',2,40,'2026-11-03');
 BEGIN
  INSERT INTO public.transactions(user_id,wallet_id,ticker,type,quantity,price,transaction_date)
  VALUES(auth.uid(),current_setting('week6.wallet')::uuid,'QASIX','sell',1,45,'2026-11-01');
  RAISE EXCEPTION 'Backdated sale accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 INSERT INTO public.transactions(user_id,wallet_id,ticker,type,quantity,price,transaction_date)
 VALUES(auth.uid(),current_setting('week6.wallet')::uuid,'QASIX','sell',1,45,'2026-11-04');
 BEGIN
  DELETE FROM public.transactions WHERE user_id=auth.uid() AND ticker='QASIX' AND type='buy';
  RAISE EXCEPTION 'Purchase supporting a sale deleted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  INSERT INTO public.wallets(user_id,name) VALUES(auth.uid(),' week   SIX ');
  RAISE EXCEPTION 'Duplicate wallet name accepted';
 EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN
  INSERT INTO public.wallets(user_id,name) VALUES(auth.uid(),repeat('x',61));
  RAISE EXCEPTION 'Long wallet name accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 INSERT INTO public.wallets(user_id,name) VALUES(auth.uid(),'Ações & FIIs');
END $$;
-- An import may list a dated sale before a dated purchase: validate final history.
SET CONSTRAINTS complete_transaction_history DEFERRED;
INSERT INTO public.transactions(user_id,wallet_id,ticker,type,quantity,price,transaction_date) VALUES
(auth.uid(),current_setting('week6.wallet')::uuid,'QASIX','sell',1,45,'2026-11-06'),
(auth.uid(),current_setting('week6.wallet')::uuid,'QASIX','buy',1,40,'2026-11-05');
SET CONSTRAINTS complete_transaction_history IMMEDIATE;
ROLLBACK;

BEGIN;
INSERT INTO public.assets(ticker,name,type,currency,quote_provider) VALUES
 ('QAFIVEBR','QA BR','stock_br','BRL','brapi'),('QAFIVEUS','QA US','stock_us','USD','brapi'),
 ('QAFIVEFII','QA FII','fii','BRL','brapi'),('QAFIVEBDR','QA BDR','bdr','BRL','brapi'),('QAFIVEETF','QA ETF','etf_br','BRL','brapi');
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('ad000000-0000-4000-8000-000000000001','qa-five-a@test.invalid','{"full_name":"Five A"}'),
 ('ad000000-0000-4000-8000-000000000002','qa-five-b@test.invalid','{"full_name":"Five B"}');
SELECT set_config('request.jwt.claim.sub','ad000000-0000-4000-8000-000000000001',true);
SET LOCAL ROLE authenticated;
DO $test$
DECLARE wallet uuid; other_wallet uuid; ticker text; snapshot jsonb; baseline int; row public.transactions;
BEGIN
 SELECT id INTO wallet FROM public.wallets WHERE user_id=auth.uid() LIMIT 1;
 PERFORM set_config('qa.five.wallet',wallet::text,true);
 FOR ticker IN SELECT unnest(ARRAY['QAFIVEBR','QAFIVEFII','QAFIVEBDR','QAFIVEETF']) LOOP
  BEGIN
   INSERT INTO public.transactions(user_id,wallet_id,ticker,type,quantity,price,transaction_date) VALUES(auth.uid(),wallet,ticker,'buy',0.5,10,'2026-01-01');
   RAISE EXCEPTION 'Fractional Brazilian buy accepted: %',ticker;
  EXCEPTION WHEN check_violation THEN NULL; END;
 END LOOP;
 INSERT INTO public.transactions(user_id,wallet_id,ticker,type,quantity,price,transaction_date) VALUES(auth.uid(),wallet,'QAFIVEBR','buy',1,10,'2026-01-01') RETURNING * INTO row;
 BEGIN
  PERFORM public.edit_owned_transaction(row.id,jsonb_build_object('type',row.type,'transaction_date',row.transaction_date,'quantity',row.quantity,'price',row.price,'brokerage_fee',row.brokerage_fee,'tax',row.tax),'buy','2026-01-01',0.5,10,0,0);
  RAISE EXCEPTION 'Fractional edit accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  INSERT INTO public.transactions(user_id,wallet_id,ticker,type,quantity,price,transaction_date) VALUES(auth.uid(),wallet,'QAFIVEBR','sell',0.5,10,'2026-01-02');
  RAISE EXCEPTION 'Fractional sale accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 SELECT count(*) INTO baseline FROM public.transactions;
 BEGIN
  PERFORM public.import_owned_transactions(wallet,'fraction.csv','[{"ticker":"QAFIVEBR","type":"buy","quantity":"1","price":"10","brokerage_fee":"0","transaction_date":"2026-01-02"},{"ticker":"QAFIVEBR","type":"buy","quantity":"0.5","price":"10","brokerage_fee":"0","transaction_date":"2026-01-02"}]'::jsonb);
  RAISE EXCEPTION 'Fractional CSV accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 IF (SELECT count(*) FROM public.transactions)<>baseline OR EXISTS(SELECT 1 FROM public.transaction_import_batches WHERE wallet_id=wallet) THEN RAISE EXCEPTION 'Failed batch left records'; END IF;
 INSERT INTO public.transactions(user_id,wallet_id,ticker,type,quantity,price,transaction_date) VALUES(auth.uid(),wallet,'QAFIVEUS','buy',0.5,10,'2026-01-01');
 BEGIN
  INSERT INTO public.positions(user_id,wallet_id,ticker,quantity,average_price,acquisition_date) VALUES(auth.uid(),wallet,'QAFIVEFII',0.5,10,'2026-01-01');
  RAISE EXCEPTION 'Fractional opening accepted';
 EXCEPTION WHEN check_violation OR insufficient_privilege THEN NULL; END;
 UPDATE public.wallets SET passive_income_goal=100 WHERE id=wallet;
 BEGIN
  UPDATE public.wallets SET passive_income_goal=-1 WHERE id=wallet;
  RAISE EXCEPTION 'Negative goal accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 snapshot:=public.export_owned_wallet(wallet);
 IF jsonb_typeof(snapshot->'transactions'->0->'quantity') <> 'string' OR snapshot->>'decimal_encoding' <> 'exact-string' THEN RAISE EXCEPTION 'Export lost exact decimals'; END IF;
 IF snapshot->>'format'<>'valora-wallet' OR jsonb_array_length(snapshot->'transactions')<>2 OR jsonb_array_length(snapshot->'assets')<>2 OR (snapshot->'wallet'->>'passive_income_goal')::numeric<>100 THEN RAISE EXCEPTION 'Invalid export snapshot'; END IF;
 INSERT INTO public.transactions(user_id,wallet_id,ticker,type,quantity,price,transaction_date) VALUES(auth.uid(),wallet,'QAFIVEBR','bonus',0.5,0,'2026-01-02');
 IF has_function_privilege('anon','public.export_owned_wallet(uuid)','EXECUTE') THEN RAISE EXCEPTION 'Anonymous export granted'; END IF;
END $test$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','ad000000-0000-4000-8000-000000000002',true);
SET LOCAL ROLE authenticated;
DO $test$ DECLARE affected int; BEGIN
 UPDATE public.wallets SET passive_income_goal=999 WHERE id=current_setting('qa.five.wallet')::uuid;
 GET DIAGNOSTICS affected = ROW_COUNT;
 IF affected <> 0 THEN RAISE EXCEPTION 'Cross-owner goal update accepted'; END IF;
 BEGIN
  PERFORM public.export_owned_wallet(current_setting('qa.five.wallet')::uuid);
  RAISE EXCEPTION 'Cross-owner export accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF EXISTS (SELECT 1 FROM public.wallets WHERE user_id='ad000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'Wallet isolation broken'; END IF;
END $test$;
ROLLBACK;

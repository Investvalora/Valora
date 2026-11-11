-- Disposable Supabase only. All fixtures are rolled back.
BEGIN;
INSERT INTO public.assets(ticker,name,type,quote_provider) VALUES('QAIMPORT','Import fixture','stock_br','brapi');
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('ab000000-0000-4000-8000-000000000001','qa-import-a@test.invalid','{"full_name":"Import A"}'),
 ('ab000000-0000-4000-8000-000000000002','qa-import-b@test.invalid','{"full_name":"Import B"}');
SELECT set_config('request.jwt.claim.sub','ab000000-0000-4000-8000-000000000001',true);
SET LOCAL ROLE authenticated;
DO $test$
DECLARE wallet uuid; other_wallet uuid; result jsonb; payload jsonb; before_count integer; invalid_row jsonb;
BEGIN
 SELECT id INTO wallet FROM public.wallets WHERE user_id=auth.uid() LIMIT 1;
 payload:='[{"ticker":"QAIMPORT","type":"buy","quantity":1,"price":10,"brokerage_fee":0,"transaction_date":"2026-01-02"},{"ticker":"QAIMPORT","type":"buy","quantity":1,"price":10,"brokerage_fee":0,"transaction_date":"2026-01-02"}]';
 result:=public.import_owned_transactions(wallet,'first.csv',payload);
 IF (result->>'duplicate')::boolean OR (result->>'count')::int<>2 THEN RAISE EXCEPTION 'Initial receipt invalid'; END IF;
 result:=public.import_owned_transactions(wallet,'renamed.csv',payload);
 IF NOT (result->>'duplicate')::boolean THEN RAISE EXCEPTION 'Same payload duplicated'; END IF;
 IF (SELECT count(*) FROM public.transactions WHERE wallet_id=wallet)<>2 THEN RAISE EXCEPTION 'Identical rows not preserved or batch repeated'; END IF;
 IF (SELECT count(*) FROM public.transaction_import_batches WHERE wallet_id=wallet)<>1 THEN RAISE EXCEPTION 'Receipt duplicated'; END IF;
 IF (SELECT quantity FROM public.positions WHERE wallet_id=wallet AND ticker='QAIMPORT')<>2 THEN RAISE EXCEPTION 'Position changed incorrectly'; END IF;
 before_count:=(SELECT count(*) FROM public.transaction_import_batches);
 FOR invalid_row IN SELECT value FROM jsonb_array_elements('[
   {"quantity":0.000000001,"price":10,"brokerage_fee":0},
   {"quantity":10000000000,"price":10,"brokerage_fee":0},
   {"quantity":1,"price":10.12345,"brokerage_fee":0},
   {"quantity":1,"price":10,"brokerage_fee":0.00001}
 ]'::jsonb) LOOP
   BEGIN
     PERFORM public.import_owned_transactions(wallet,'precision.csv',payload||jsonb_build_array(
       invalid_row||'{"ticker":"QAIMPORT","type":"buy","transaction_date":"2026-01-02"}'::jsonb));
     RAISE EXCEPTION 'Silent numeric rounding accepted';
   EXCEPTION WHEN invalid_parameter_value THEN NULL;
   END;
 END LOOP;
 IF (SELECT count(*) FROM public.transaction_import_batches)<>before_count
    OR (SELECT count(*) FROM public.transactions WHERE wallet_id=wallet)<>2 THEN
   RAISE EXCEPTION 'Invalid precision changed receipts or transactions';
 END IF;
 BEGIN
   PERFORM public.import_owned_transactions(wallet,'invalid.csv',payload||'[{"ticker":"MISSING_QA","type":"buy","quantity":1,"price":10,"brokerage_fee":0,"transaction_date":"2026-01-02"}]'::jsonb);
   RAISE EXCEPTION 'Invalid batch accepted';
 EXCEPTION WHEN foreign_key_violation THEN NULL;
 END;
 IF (SELECT count(*) FROM public.transaction_import_batches)<>before_count THEN RAISE EXCEPTION 'Failed batch left receipt'; END IF;
 IF (SELECT count(*) FROM public.transactions WHERE wallet_id=wallet)<>2 THEN RAISE EXCEPTION 'Partial batch committed'; END IF;
 BEGIN
   PERFORM public.import_owned_transactions(gen_random_uuid(),'foreign.csv',payload);
   RAISE EXCEPTION 'Foreign destination accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $test$;
SELECT set_config('request.jwt.claim.sub','ab000000-0000-4000-8000-000000000002',true);
DO $test$ BEGIN
 IF EXISTS(SELECT 1 FROM public.transaction_import_batches) THEN RAISE EXCEPTION 'Other account can read receipts'; END IF;
END $test$;
RESET ROLE;
DO $test$ BEGIN
 IF has_function_privilege('anon','public.import_owned_transactions(uuid,text,jsonb)','EXECUTE') THEN RAISE EXCEPTION 'Anonymous RPC exposed'; END IF;
 IF public.validated_indicator_value('debt_equity','brapi',76) IS NOT NULL THEN RAISE EXCEPTION 'Unconfirmed debt unit accepted'; END IF;
 IF public.validated_indicator_value('debt_equity','yahoo',76)<>76 THEN RAISE EXCEPTION 'Raw percent converted'; END IF;
 IF public.validated_indicator_value('dy','seed',7) IS NOT NULL THEN RAISE EXCEPTION 'Synthetic indicator accepted'; END IF;
END $test$;
ROLLBACK;

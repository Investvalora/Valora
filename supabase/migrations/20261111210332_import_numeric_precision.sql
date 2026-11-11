-- Reject precision loss before recording an import receipt. Existing entries are preserved.
CREATE OR REPLACE FUNCTION public.import_owned_transactions(p_wallet_id uuid,p_file_name text,p_rows jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $function$
DECLARE
 owner_id uuid:=auth.uid();
 receipt public.transaction_import_batches;
 fingerprint text;
 n integer;
BEGIN
 IF owner_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.wallets WHERE id=p_wallet_id AND user_id=owner_id) THEN
   RAISE EXCEPTION 'Carteira indisponível' USING ERRCODE='42501';
 END IF;
 IF jsonb_typeof(p_rows) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Lote inválido' USING ERRCODE='22023'; END IF;
 n:=jsonb_array_length(p_rows);
 IF n<1 OR n>1000 THEN RAISE EXCEPTION 'Lote deve conter de 1 a 1000 linhas' USING ERRCODE='22023'; END IF;
 SELECT jsonb_agg(jsonb_build_object('ticker',upper(btrim(r.ticker)),'type',r.type,
   'quantity',trim_scale(r.quantity),'price',trim_scale(r.price),'brokerage_fee',trim_scale(r.brokerage_fee),
   'transaction_date',r.transaction_date) ORDER BY e.ordinality) INTO p_rows
 FROM jsonb_array_elements(p_rows) WITH ORDINALITY AS e(value,ordinality)
 CROSS JOIN LATERAL jsonb_to_record(e.value) AS r(ticker text,type text,quantity numeric,price numeric,brokerage_fee numeric,transaction_date date);
 -- Validate unconstrained numerics BEFORE insertion into numeric(18,s).
 -- PostgreSQL otherwise silently rounds excess decimal places.
 IF EXISTS (
   SELECT 1 FROM jsonb_to_recordset(p_rows) AS r(quantity numeric,price numeric,brokerage_fee numeric)
   WHERE r.quantity IS NULL OR r.quantity<=0 OR r.quantity>=10000000000
      OR r.quantity<>trunc(r.quantity,8) OR r.quantity::text IN ('NaN','Infinity','-Infinity')
      OR r.price IS NULL OR r.price<0 OR r.price>=100000000000000
      OR r.price<>trunc(r.price,4) OR r.price::text IN ('NaN','Infinity','-Infinity')
      OR r.brokerage_fee IS NULL OR r.brokerage_fee<0 OR r.brokerage_fee>=100000000000000
      OR r.brokerage_fee<>trunc(r.brokerage_fee,4) OR r.brokerage_fee::text IN ('NaN','Infinity','-Infinity')
 ) THEN
   RAISE EXCEPTION 'Precisão inválida: quantidade até 8 casas; preço e corretagem até 4 casas. Nenhum lançamento importado.' USING ERRCODE='22023';
 END IF;
 -- Same selected payload, including its order; identical rows inside a batch remain legitimate.
 fingerprint:=encode(sha256(convert_to(p_rows::text,'UTF8')),'hex');
 INSERT INTO public.transaction_import_batches(user_id,wallet_id,file_name,content_hash,row_count)
 VALUES(owner_id,p_wallet_id,p_file_name,fingerprint,n)
 ON CONFLICT(user_id,wallet_id,content_hash) DO NOTHING RETURNING * INTO receipt;
 IF receipt.id IS NULL THEN
   SELECT * INTO STRICT receipt FROM public.transaction_import_batches
   WHERE user_id=owner_id AND wallet_id=p_wallet_id AND content_hash=fingerprint;
   RETURN jsonb_build_object('count',receipt.row_count,'duplicate',true,'batch_id',receipt.id);
 END IF;
 INSERT INTO public.transactions(user_id,wallet_id,ticker,type,quantity,price,brokerage_fee,tax,transaction_date,import_batch_id)
 SELECT owner_id,p_wallet_id,r.ticker,r.type::public.transaction_type,r.quantity,r.price,r.brokerage_fee,0,r.transaction_date,receipt.id
 FROM jsonb_array_elements(p_rows) WITH ORDINALITY AS e(value,ordinality)
 CROSS JOIN LATERAL jsonb_to_record(e.value) AS r(ticker text,type text,quantity numeric,price numeric,brokerage_fee numeric,transaction_date date)
 ORDER BY e.ordinality;
 RETURN jsonb_build_object('count',n,'duplicate',false,'batch_id',receipt.id);
END
$function$;
REVOKE ALL ON FUNCTION public.import_owned_transactions(uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.import_owned_transactions(uuid,text,jsonb) TO authenticated;

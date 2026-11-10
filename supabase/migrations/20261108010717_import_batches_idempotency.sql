-- Atomic receipt + transactions. The database, not a browser cache, deduplicates.
CREATE TABLE public.transaction_import_batches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
 wallet_id uuid NOT NULL,
 file_name text NOT NULL CHECK(length(file_name) BETWEEN 1 AND 255),
 content_hash text NOT NULL CHECK(content_hash ~ '^[a-f0-9]{64}$'),
 row_count integer NOT NULL CHECK(row_count BETWEEN 1 AND 1000),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(wallet_id,user_id) REFERENCES public.wallets(id,user_id) ON DELETE CASCADE,
 UNIQUE(user_id,wallet_id,content_hash),
 UNIQUE(id,user_id,wallet_id)
);
ALTER TABLE public.transaction_import_batches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.transaction_import_batches FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.transaction_import_batches TO authenticated;
GRANT ALL ON public.transaction_import_batches TO service_role;
CREATE POLICY import_batches_read ON public.transaction_import_batches FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));
CREATE POLICY import_batches_insert ON public.transaction_import_batches FOR INSERT TO authenticated WITH CHECK(user_id=(SELECT auth.uid()));
ALTER TABLE public.transactions ADD COLUMN import_batch_id uuid;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_import_batch_owner
 FOREIGN KEY(import_batch_id,user_id,wallet_id) REFERENCES public.transaction_import_batches(id,user_id,wallet_id);
CREATE INDEX transactions_import_batch_idx ON public.transactions(import_batch_id) WHERE import_batch_id IS NOT NULL;

CREATE FUNCTION public.import_owned_transactions(p_wallet_id uuid,p_file_name text,p_rows jsonb)
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

\set ALERT_USER_A 55555555-5555-4555-8555-555555555555
\set ALERT_USER_B 66666666-6666-4666-8666-666666666666

CREATE OR REPLACE FUNCTION public.assert(condition BOOLEAN, description TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  IF condition IS TRUE THEN RAISE NOTICE 'PASS  %', description;
  ELSE RAISE EXCEPTION 'FAIL  %', description;
  END IF;
END $$;

INSERT INTO auth.users (id, email) VALUES
  (:'ALERT_USER_A', 'alert-a@valora.test'),
  (:'ALERT_USER_B', 'alert-b@valora.test');
INSERT INTO public.assets (ticker, name, type, currency, quote_provider) VALUES
  ('ALRT4', 'Alerta PN', 'stock_br', 'BRL', 'brapi')
ON CONFLICT (ticker) DO NOTHING;

DO $$
BEGIN
  PERFORM public.assert((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.alerts'::regclass), 'RLS habilitada em alerts');
  PERFORM public.assert((SELECT count(*) = 4 FROM pg_policies WHERE tablename = 'alerts'), 'alerts tem quatro policies');
  PERFORM public.assert((SELECT count(*) = 4 FROM pg_indexes WHERE tablename = 'alerts'), 'alerts tem chave primaria e indices de consulta e idempotencia');
END $$;

SET ROLE authenticated;
SET request.jwt.claim.sub = '55555555-5555-4555-8555-555555555555';
INSERT INTO public.alerts (user_id, type, ticker, title, description) VALUES
  (:'ALERT_USER_A', 'position_no_transactions', 'ALRT4', 'Sem transações', 'Teste');

DO $$
DECLARE observed TEXT := 'nenhum erro';
BEGIN
  BEGIN
    INSERT INTO public.alerts (user_id, type, ticker, title, description)
    VALUES ('66666666-6666-4666-8666-666666666666', 'position_no_transactions', 'ALRT4', 'Invasão', 'Teste');
  EXCEPTION WHEN OTHERS THEN observed := SQLSTATE;
  END;
  PERFORM public.assert(observed = '42501', 'A nao insere alerta de B');
  PERFORM public.assert((SELECT count(*) = 1 FROM public.alerts), 'A ve o proprio alerta');
END $$;

DO $$
DECLARE observed TEXT := 'nenhum erro';
BEGIN
  BEGIN
    INSERT INTO public.alerts (user_id, type, ticker, title, description)
    VALUES ('55555555-5555-4555-8555-555555555555', 'position_no_transactions', 'ALRT4', 'Duplicado', 'Teste');
  EXCEPTION WHEN OTHERS THEN observed := SQLSTATE;
  END;
  PERFORM public.assert(observed = '23505', 'idempotencia impede alerta ativo duplicado');
END $$;

RESET ROLE;
RESET request.jwt.claim.sub;
SET ROLE authenticated;
SET request.jwt.claim.sub = '66666666-6666-4666-8666-666666666666';
DO $$ BEGIN PERFORM public.assert((SELECT count(*) = 0 FROM public.alerts), 'B nao ve alertas de A'); END $$;
RESET ROLE;
RESET request.jwt.claim.sub;
DROP FUNCTION public.assert(BOOLEAN, TEXT);
CREATE OR REPLACE FUNCTION public.assert(condition BOOLEAN, description TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  IF condition IS TRUE THEN RAISE NOTICE 'PASS  %', description;
  ELSE RAISE EXCEPTION 'FAIL  %', description;
  END IF;
END $$;

DO $$
BEGIN
  PERFORM public.assert((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.dividends'::regclass), 'RLS habilitada em dividends');
  PERFORM public.assert((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.fundamentals'::regclass), 'RLS habilitada em fundamentals');
  PERFORM public.assert((SELECT count(*) = 1 FROM pg_policies WHERE tablename = 'dividends'), 'dividends tem policy de leitura');
  PERFORM public.assert((SELECT count(*) = 1 FROM pg_policies WHERE tablename = 'fundamentals'), 'fundamentals tem policy de leitura');
  PERFORM public.assert((SELECT count(*) = (SELECT count(*) FROM public.assets WHERE type <> 'crypto') * 4 FROM public.dividends), 'seed cria dividendos trimestrais nos ativos elegiveis');
  PERFORM public.assert((SELECT count(*) = (SELECT count(*) FROM public.assets) * 4 FROM public.fundamentals), 'seed cria fundamentos trimestrais por ativo');
  PERFORM public.assert((SELECT count(*) = 0 FROM public.dividends WHERE value_per_share <= 0), 'seed nao cria dividendos zerados');
  PERFORM public.assert((SELECT count(*) = 0 FROM public.dividends WHERE source <> 'seed'), 'dividendos seed sao rastreaveis');
  PERFORM public.assert((SELECT count(*) = 0 FROM public.fundamentals WHERE source <> 'seed'), 'fundamentos seed sao rastreaveis');
  PERFORM public.assert((SELECT count(DISTINCT ex_date) = 4 FROM public.dividends), 'dividendos tem quatro trimestres');
  PERFORM public.assert((SELECT max(ex_date) < CURRENT_DATE FROM public.dividends), 'dividendos nao tem datas futuras');
  PERFORM public.assert((SELECT count(*) = 0 FROM public.dividends WHERE payment_date < ex_date), 'pagamento nao antecede ex-date');
  PERFORM public.assert((SELECT count(*) = 0 FROM public.fundamentals WHERE pl IS NULL OR pvp IS NULL OR roe IS NULL OR dy IS NULL OR debt_equity IS NULL OR net_margin IS NULL OR lpa IS NULL OR vpa IS NULL), 'fundamentos tem todos os indicadores');
  PERFORM public.assert(NOT has_table_privilege('anon', 'public.dividends', 'SELECT'), 'anon nao consulta dividends');
  PERFORM public.assert(NOT has_table_privilege('anon', 'public.fundamentals', 'SELECT'), 'anon nao consulta fundamentals');
  PERFORM public.assert(NOT has_table_privilege('anon', 'public.dividends', 'INSERT'), 'anon nao insere dividends');
  PERFORM public.assert(NOT has_table_privilege('anon', 'public.dividends', 'UPDATE'), 'anon nao atualiza dividends');
  PERFORM public.assert(NOT has_table_privilege('anon', 'public.dividends', 'DELETE'), 'anon nao remove dividends');
  PERFORM public.assert(NOT has_table_privilege('anon', 'public.dividends', 'TRUNCATE'), 'anon nao trunca dividends');
  PERFORM public.assert(has_table_privilege('authenticated', 'public.dividends', 'SELECT'), 'authenticated consulta dividends');
  PERFORM public.assert(has_table_privilege('authenticated', 'public.fundamentals', 'SELECT'), 'authenticated consulta fundamentals');
  PERFORM public.assert(NOT has_table_privilege('authenticated', 'public.dividends', 'INSERT'), 'authenticated nao tem INSERT em dividends');
  PERFORM public.assert(NOT has_table_privilege('authenticated', 'public.fundamentals', 'INSERT'), 'authenticated nao tem INSERT em fundamentals');
  PERFORM public.assert(NOT has_table_privilege('authenticated', 'public.dividends', 'UPDATE'), 'authenticated nao tem UPDATE em dividends');
  PERFORM public.assert(NOT has_table_privilege('authenticated', 'public.dividends', 'DELETE'), 'authenticated nao tem DELETE em dividends');
  PERFORM public.assert(NOT has_table_privilege('authenticated', 'public.dividends', 'TRUNCATE'), 'authenticated nao tem TRUNCATE em dividends');
END $$;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '55555555-5555-4555-8555-555555555555', false);

DO $$
BEGIN
  PERFORM public.assert((SELECT count(*) > 0 FROM public.dividends), 'authenticated le dividends');
  PERFORM public.assert((SELECT count(*) > 0 FROM public.fundamentals), 'authenticated le fundamentals');
END $$;

DO $$
DECLARE observed TEXT := 'nenhum erro';
BEGIN
  BEGIN
    INSERT INTO public.dividends (ticker, ex_date, payment_date, value_per_share, type)
    VALUES ('PETR4', DATE '2025-03-15', DATE '2025-03-20', 0.10, 'dividend');
  EXCEPTION WHEN OTHERS THEN observed := SQLSTATE;
  END;
  PERFORM public.assert(observed = '42501', 'authenticated nao insere dividendos');
END $$;

DO $$
DECLARE observed TEXT := 'nenhum erro';
BEGIN
  BEGIN
    INSERT INTO public.fundamentals (ticker, reference_date, pl, pvp, roe, dy, debt_equity, net_margin, lpa, vpa)
    VALUES ('TICKER_INEXISTENTE', DATE '2025-03-31', 10, 1, 10, 2, 0.5, 5, 1, 10);
  EXCEPTION WHEN OTHERS THEN observed := SQLSTATE;
  END;
  PERFORM public.assert(observed = '42501', 'authenticated nao insere fundamentos');
END $$;

RESET ROLE;
RESET request.jwt.claim.sub;

SET ROLE service_role;
DO $$
DECLARE observed TEXT := 'nenhum erro';
BEGIN
  BEGIN
    INSERT INTO public.dividends (ticker, ex_date, payment_date, value_per_share, type)
    VALUES ('TICKER_INEXISTENTE', DATE '2025-03-15', DATE '2025-03-20', 0.10, 'dividend');
  EXCEPTION WHEN OTHERS THEN observed := SQLSTATE;
  END;
  PERFORM public.assert(observed = '23503', 'FK impede dividendo sem asset');
END $$;

DO $$
DECLARE observed TEXT := 'nenhum erro';
BEGIN
  BEGIN
    INSERT INTO public.fundamentals (ticker, reference_date, pl, pvp, roe, dy, debt_equity, net_margin, lpa, vpa)
    VALUES ('TICKER_INEXISTENTE', DATE '2025-03-31', 10, 1, 10, 2, 0.5, 5, 1, 10);
  EXCEPTION WHEN OTHERS THEN observed := SQLSTATE;
  END;
  PERFORM public.assert(observed = '23503', 'FK impede fundamento sem asset');
END $$;
RESET ROLE;

DO $$
BEGIN
  PERFORM public.assert((SELECT count(*) = (SELECT count(*) FROM public.assets WHERE type <> 'crypto') * 4 FROM public.dividends), 'reexecucao nao duplica dividendos');
  PERFORM public.assert((SELECT count(*) = (SELECT count(*) FROM public.assets) * 4 FROM public.fundamentals), 'reexecucao nao duplica fundamentos');
END $$;

DROP FUNCTION public.assert(BOOLEAN, TEXT);
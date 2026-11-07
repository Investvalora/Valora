-- Broker-confirmed income preserves the original settlement currency.
ALTER TABLE public.wallet_income DROP CONSTRAINT wallet_income_currency_check;
ALTER TABLE public.wallet_income ADD CONSTRAINT wallet_income_currency_check
  CHECK (currency IN ('BRL', 'USD'));

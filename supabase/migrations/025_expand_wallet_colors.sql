-- Amplia a paleta das carteiras existentes sem alterar seus dados.
BEGIN;

ALTER TABLE public.wallets
  DROP CONSTRAINT wallets_color_check;

ALTER TABLE public.wallets
  ADD CONSTRAINT wallets_color_check
  CHECK (color IN (
    'gold', 'green', 'blue', 'gray',
    'pink', 'red', 'purple', 'orange'
  ));

COMMIT;

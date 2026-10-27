alter table public.valuation_strategies drop constraint valuation_strategies_method_check;
alter table public.valuation_strategies add constraint valuation_strategies_method_check check(method in ('bazin','graham','custom','fii'));
alter table public.valuation_strategies
  add column fii_inflation numeric,
  add column fii_treasury numeric,
  add column fii_tax numeric,
  add column fii_premium numeric;
alter table public.valuation_strategies add constraint valuation_strategies_fii_parameters_check check (
  method <> 'fii' or (
    fii_inflation is not null and fii_inflation between 0 and 1
    and fii_treasury is not null and fii_treasury between 0 and 1
    and fii_tax is not null and fii_tax >= 0 and fii_tax < 1
    and fii_premium is not null and fii_premium between 0 and 1
    and (1 + (((1 + fii_inflation) * (1 + fii_treasury) - 1) * (1 - fii_tax))) * (1 + fii_premium) - 1 > 0
    and (1 + (((1 + fii_inflation) * (1 + fii_treasury) - 1) * (1 - fii_tax))) * (1 + fii_premium) - 1 <= 1
  )
);

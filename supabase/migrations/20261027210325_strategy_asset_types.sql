alter table public.valuation_strategies add column asset_types text[];
alter table public.valuation_strategies add constraint valuation_strategies_asset_types_check check (
  asset_types is null or (
    cardinality(asset_types) > 0 and array_position(asset_types, null) is null
    and asset_types <@ array['stock_br','stock_us','bdr','fii','reit','etf_br','etf_us','crypto']::text[]
    and (method <> 'fii' or asset_types <@ array['fii']::text[])
    and (method <> 'graham' or asset_types <@ array['stock_br','stock_us','bdr']::text[])
    and (method <> 'bazin' or not ('crypto' = any(asset_types)))
  )
);

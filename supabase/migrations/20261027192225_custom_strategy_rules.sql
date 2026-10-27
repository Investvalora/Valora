create function public.valid_custom_strategy_rules(rules jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare item jsonb;
begin
  if jsonb_typeof(rules) <> 'array' then return false; end if;
  if jsonb_array_length(rules) not between 1 and 20 then return false; end if;
  for item in select value from jsonb_array_elements(rules) loop
    if jsonb_typeof(item) <> 'object' then return false; end if;
    if not (item ?& array['metric','operator','min']) then return false; end if;
    if item->>'metric' not in ('pl','pvp','dy','roe','netMargin','quotePrice','weightPercent') then return false; end if;
    if item->>'operator' not in ('lt','lte','gt','gte','between') then return false; end if;
    if jsonb_typeof(item->'metric') <> 'string' or jsonb_typeof(item->'operator') <> 'string'
      or jsonb_typeof(item->'min') <> 'number' then return false; end if;
    if item->>'operator' = 'between' then
      if not (item ? 'max') or jsonb_typeof(item->'max') <> 'number' then return false; end if;
      if (item->>'max')::numeric < (item->>'min')::numeric then return false; end if;
    end if;
  end loop;
  return true;
end;
$$;
alter table public.valuation_strategies drop constraint valuation_strategies_method_check;
alter table public.valuation_strategies add constraint valuation_strategies_method_check check (method in ('bazin','graham','custom'));
alter table public.valuation_strategies add column custom_rules jsonb not null default '[]'::jsonb;
alter table public.valuation_strategies add column rule_match text not null default 'all' check (rule_match in ('all','any'));
alter table public.valuation_strategies add constraint valuation_strategies_custom_rules_check
check (method <> 'custom' or public.valid_custom_strategy_rules(custom_rules));

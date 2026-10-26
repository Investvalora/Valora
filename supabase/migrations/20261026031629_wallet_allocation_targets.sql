create function public.valid_allocation_targets(targets jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare item record; total numeric := 0;
begin
  if jsonb_typeof(targets) <> 'object' then return false; end if;
  if targets = '{}'::jsonb then return true; end if;
  for item in select key, value from jsonb_each(targets) loop
    if item.key not in ('stock_br','fii','bdr','stock_us','reit','crypto','etf_br','etf_us','fixed_income','unknown')
      or jsonb_typeof(item.value) <> 'number' then return false; end if;
    if item.value::numeric < 0 or item.value::numeric > 100 then return false; end if;
    total := total + item.value::numeric;
  end loop;
  return total = 100;
end;
$$;

alter table public.wallets add column allocation_targets jsonb not null default '{}'::jsonb
  constraint wallets_allocation_targets_valid check (public.valid_allocation_targets(allocation_targets));
comment on column public.wallets.allocation_targets is 'Metas percentuais por classe: objeto vazio ou soma exata de 100. Protegido pelo RLS de wallets.';
grant update (allocation_targets) on public.wallets to authenticated;

create table public.valuation_strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (name = btrim(name) and char_length(name) between 1 and 60),
  method text not null check (method in ('bazin', 'graham')),
  min_dy numeric not null default 0.06 check (min_dy > 0 and min_dy <= 1),
  safety_discount numeric not null default 0 check (safety_discount >= 0 and safety_discount < 1),
  show_in_assets boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index valuation_strategies_user_name_idx on public.valuation_strategies (user_id, lower(name));
alter table public.valuation_strategies enable row level security;
revoke all on public.valuation_strategies from anon, authenticated;
grant select, insert, update, delete on public.valuation_strategies to authenticated;
create policy strategies_select on public.valuation_strategies for select to authenticated using ((select auth.uid()) = user_id);
create policy strategies_insert on public.valuation_strategies for insert to authenticated with check ((select auth.uid()) = user_id);
create policy strategies_update on public.valuation_strategies for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy strategies_delete on public.valuation_strategies for delete to authenticated using ((select auth.uid()) = user_id);

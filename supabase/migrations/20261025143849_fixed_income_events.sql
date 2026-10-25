-- Journal of receipts; amounts are portfolio records, not brokerage orders.
alter table public.fixed_income_positions
  add column remaining_principal numeric(18,4)
  check (remaining_principal >= 0 and remaining_principal <= principal);

create table public.fixed_income_events (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity unique,
  user_id uuid not null references auth.users(id),
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  position_id uuid not null references public.fixed_income_positions(id) on delete cascade,
  type text not null check (type in ('coupon', 'redemption')),
  event_date date not null,
  amount numeric(18,4) not null check (amount > 0 and amount < 1e14),
  principal_redeemed numeric(18,4) not null default 0 check (principal_redeemed >= 0 and principal_redeemed < 1e14),
  balance_after numeric(18,4) not null check (balance_after >= 0 and balance_after < 1e14),
  created_at timestamptz not null default now(),
  check ((type = 'coupon' and principal_redeemed = 0) or (type = 'redemption' and principal_redeemed > 0))
);
create index fixed_income_events_owner_wallet on public.fixed_income_events(user_id, wallet_id, event_date, seq);
create index fixed_income_events_position on public.fixed_income_events(position_id, event_date, seq);
alter table public.fixed_income_events enable row level security;
revoke all on public.fixed_income_events from anon, authenticated;
grant select, insert on public.fixed_income_events to authenticated;
grant usage on sequence public.fixed_income_events_seq_seq to authenticated;
create policy fi_events_read on public.fixed_income_events for select to authenticated using ((select auth.uid()) = user_id);
create policy fi_events_insert on public.fixed_income_events for insert to authenticated with check ((select auth.uid()) = user_id and exists (
  select 1 from public.fixed_income_positions p where p.id = position_id and p.user_id = (select auth.uid()) and p.wallet_id = fixed_income_events.wallet_id
));

create function public.record_fixed_income_event() returns trigger
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  position public.fixed_income_positions;
  remaining numeric;
  last_date date;
begin
  select * into position from public.fixed_income_positions
  where id = new.position_id and user_id = auth.uid() for update;
  if not found then raise exception 'Título não encontrado ou sem acesso'; end if;
  if not position.active then raise exception 'Título já encerrado'; end if;
  if new.event_date < position.application_date or new.event_date > current_date then
    raise exception 'Data fora do período do título';
  end if;
  select max(event_date) into last_date from public.fixed_income_events where position_id = new.position_id;
  if new.event_date < last_date then raise exception 'Registre movimentos em ordem de data'; end if;
  remaining := coalesce(position.remaining_principal, position.principal) - new.principal_redeemed;
  if remaining < 0 then raise exception 'Resgate excede o principal restante'; end if;
  if (remaining = 0 and new.balance_after <> 0) or (remaining > 0 and new.balance_after <= 0) then
    raise exception 'Saldo após o movimento incompatível com o principal restante';
  end if;
  new.user_id := position.user_id;
  new.wallet_id := position.wallet_id;
  update public.fixed_income_positions set remaining_principal = remaining,
    active = remaining > 0, current_value = new.balance_after, last_updated_at = now()
  where id = position.id;
  return new;
end $$;
revoke all on function public.record_fixed_income_event() from public, anon, authenticated;
create trigger record_fixed_income_event before insert on public.fixed_income_events
for each row execute function public.record_fixed_income_event();

comment on table public.fixed_income_events is 'Cupons e resgates registrados com saldo do extrato após cada evento. Histórico imutável; inclusão em ordem cronológica.';

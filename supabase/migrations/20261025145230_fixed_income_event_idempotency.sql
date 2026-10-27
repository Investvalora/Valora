create or replace function public.record_fixed_income_event() returns trigger
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  position public.fixed_income_positions;
  remaining numeric;
  last_date date;
  previous public.fixed_income_events;
begin
  select * into position from public.fixed_income_positions
  where id = new.position_id and user_id = auth.uid() for update;
  if not found then raise exception 'Título não encontrado ou sem acesso'; end if;
  select * into previous from public.fixed_income_events where id = new.id;
  if found then
    if row(previous.position_id,previous.type,previous.event_date,previous.amount,previous.principal_redeemed,previous.balance_after)
      is distinct from row(new.position_id,new.type,new.event_date,new.amount,new.principal_redeemed,new.balance_after) then
      raise exception 'Event ID reused with different content';
    end if;
    return null;
  end if;
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

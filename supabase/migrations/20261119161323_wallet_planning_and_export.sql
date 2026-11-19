alter table public.wallets add column passive_income_goal numeric(18,2) not null default 0
  check (passive_income_goal >= 0 and passive_income_goal <= 9999999999999999);

grant update (passive_income_goal) on public.wallets to authenticated;

-- One statement snapshot; caller RLS remains in force for every relation.
create or replace function public.export_owned_wallet(p_wallet_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare result jsonb;
begin
  if auth.uid() is null or not exists (select 1 from public.wallets where id=p_wallet_id and user_id=auth.uid()) then
    raise exception using errcode='42501', message='Wallet unavailable';
  end if;
  select jsonb_build_object(
    'format', 'valora-wallet', 'version', 1, 'exported_at', now(), 'decimal_encoding', 'exact-string', 'fixed_income_currency', 'BRL',
    'wallet', (select to_jsonb(w)||jsonb_build_object('passive_income_goal',w.passive_income_goal::text) from public.wallets w where w.id=p_wallet_id and w.user_id=auth.uid()),
    'transactions', coalesce((select jsonb_agg(to_jsonb(t)||jsonb_build_object('seq',t.seq::text,'quantity',t.quantity::text,'price',t.price::text,'brokerage_fee',t.brokerage_fee::text,'tax',t.tax::text) order by t.seq) from public.transactions t where t.wallet_id=p_wallet_id and t.user_id=auth.uid()), '[]'::jsonb),
    'positions', coalesce((select jsonb_agg(to_jsonb(p)||jsonb_build_object('quantity',p.quantity::text,'average_price',p.average_price::text) order by p.id) from public.positions p where p.wallet_id=p_wallet_id and p.user_id=auth.uid()), '[]'::jsonb),
    'fixed_income_positions', coalesce((select jsonb_agg(to_jsonb(p)||jsonb_build_object('principal',p.principal::text,'remaining_principal',p.remaining_principal::text,'rate',p.rate::text,'current_value',p.current_value::text,'treasury_quantity',p.treasury_quantity::text) order by p.id) from public.fixed_income_positions p where p.wallet_id=p_wallet_id and p.user_id=auth.uid()), '[]'::jsonb),
    'fixed_income_events', coalesce((select jsonb_agg(to_jsonb(e)||jsonb_build_object('seq',e.seq::text,'amount',e.amount::text,'principal_redeemed',e.principal_redeemed::text,'balance_after',e.balance_after::text) order by e.seq) from public.fixed_income_events e where e.wallet_id=p_wallet_id and e.user_id=auth.uid()), '[]'::jsonb),
    'wallet_income', coalesce((select jsonb_agg(to_jsonb(i)||jsonb_build_object('quantity',i.quantity::text,'value_per_share',i.value_per_share::text,'gross_amount',i.gross_amount::text,'net_amount',i.net_amount::text,'withholding_amount',i.withholding_amount::text,'fees_amount',i.fees_amount::text) order by i.id) from public.wallet_income i where i.wallet_id=p_wallet_id and i.user_id=auth.uid()), '[]'::jsonb),
    'wallet_income_imports', coalesce((select jsonb_agg(to_jsonb(i) order by i.id) from public.wallet_income_imports i where i.wallet_id=p_wallet_id and i.user_id=auth.uid()), '[]'::jsonb),
    'transaction_import_batches', coalesce((select jsonb_agg(to_jsonb(i) order by i.id) from public.transaction_import_batches i where i.wallet_id=p_wallet_id and i.user_id=auth.uid()), '[]'::jsonb),
    'assets', coalesce((select jsonb_agg(to_jsonb(a) order by a.ticker) from public.assets a where a.ticker in (
      select t.ticker from public.transactions t where t.wallet_id=p_wallet_id and t.user_id=auth.uid()
      union select p.ticker from public.positions p where p.wallet_id=p_wallet_id and p.user_id=auth.uid()
      union select i.ticker from public.wallet_income i where i.wallet_id=p_wallet_id and i.user_id=auth.uid()
    )), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function public.export_owned_wallet(uuid) from public, anon;
grant execute on function public.export_owned_wallet(uuid) to authenticated;

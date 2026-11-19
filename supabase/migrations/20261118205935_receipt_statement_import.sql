-- Private statement credits. No public announcement or portfolio position is changed.
alter table public.wallet_income
 add column quantity_known boolean not null default true,
 add column unit_value_known boolean not null default true,
 add column withholding_amount numeric(24,8),
 add column fees_amount numeric(24,8),
 add column statement_broker text,
 add column statement_reference text,
 add constraint statement_receipt_amounts check (
  (withholding_amount is null and fees_amount is null) or
  (withholding_amount is not null and fees_amount is not null and withholding_amount>=0 and fees_amount>=0
   and withholding_amount::text not in ('NaN','Infinity','-Infinity') and fees_amount::text not in ('NaN','Infinity','-Infinity')
   and gross_amount-withholding_amount-fees_amount=net_amount)
 );
create unique index wallet_income_statement_reference on public.wallet_income(user_id,wallet_id,statement_broker,statement_reference)
 where statement_broker is not null and statement_reference is not null;

create function public.import_income_statement(p_wallet uuid,p_rows jsonb,p_commit boolean default false)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare owner_id uuid:=auth.uid(); item jsonb; field text; broker text; ref text; paid date; record_day date; batch uuid;
 existing public.wallet_income%rowtype; asset_currency text; n integer:=0; duplicates integer:=0; new_rows integer:=0;
 gross numeric; tax numeric; fees numeric; net numeric; qty numeric; unit_value numeric; seen text[]:='{}'; row_key text;
begin
 if owner_id is null then raise exception 'Authentication required' using errcode='42501';end if;
 perform 1 from public.wallets where id=p_wallet and user_id=owner_id for update;
 if not found then raise exception 'Wallet unavailable' using errcode='42501';end if;
 if jsonb_typeof(p_rows) is distinct from 'array' then raise exception 'Invalid receipt list';end if;
 if jsonb_array_length(p_rows) not between 1 and 500 or octet_length(p_rows::text)>500000 then raise exception 'Receipt batch limit';end if;
 for item in select value from jsonb_array_elements(p_rows) loop
  n:=n+1;
  broker:=item->>'broker'; ref:=item->>'reference';
  if broker is null or broker<>lower(broker) or length(broker) not between 1 and 60
   or broker !~ '^[[:alnum:] ._-]+$' or ref is null or ref !~ '^[A-Za-z0-9_.:/-]{1,100}$' then raise exception 'Invalid broker/reference on row %',n;end if;
  row_key:=broker||'|'||ref;
  if row_key=any(seen) then raise exception 'Repeated reference on row %',n;end if;seen:=array_append(seen,row_key);
  if coalesce(item->>'payment_date','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Invalid payment date on row %',n;end if;
  paid:=(item->>'payment_date')::date;
  if paid<'1900-01-01' or paid>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'Future/invalid payment on row %',n;end if;
  record_day:=null;
  if item->>'record_date' is not null then
   if item->>'record_date' !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Invalid record date on row %',n;end if;
   record_day:=(item->>'record_date')::date;
   if record_day<'1900-01-01' or record_day>paid then raise exception 'Invalid record date on row %',n;end if;
  end if;
  if coalesce(item->>'type','') not in ('dividend','jcp') or coalesce(item->>'currency','') not in ('BRL','USD') then raise exception 'Invalid receipt type/currency on row %',n;end if;
  select currency into asset_currency from public.assets where ticker=item->>'ticker';
  if not found or asset_currency is distinct from item->>'currency' then raise exception 'Ticker/currency mismatch on row %',n;end if;
  foreach field in array array['gross_amount','withholding_amount','fees_amount','net_amount'] loop
   if coalesce(item->>field,'') !~ '^\d{1,12}(\.\d{1,8})?$' then raise exception 'Invalid amount on row %',n;end if;
  end loop;
  gross:=(item->>'gross_amount')::numeric; tax:=(item->>'withholding_amount')::numeric;
  fees:=(item->>'fees_amount')::numeric;net:=(item->>'net_amount')::numeric;
  if gross<=0 or gross-tax-fees<>net then raise exception 'Net reconciliation mismatch on row %',n;end if;
  if item->>'quantity' is not null and item->>'quantity' !~ '^\d{1,10}(\.\d{1,8})?$' then raise exception 'Invalid quantity on row %',n;end if;
  if item->>'value_per_share' is not null and item->>'value_per_share' !~ '^\d{1,14}(\.\d{1,10})?$' then raise exception 'Invalid unit value on row %',n;end if;
  qty:=coalesce((item->>'quantity')::numeric,0);unit_value:=coalesce((item->>'value_per_share')::numeric,0);
  if item->>'quantity' is not null and qty<=0 then raise exception 'Invalid zero quantity on row %',n;end if;
  select * into existing from public.wallet_income where user_id=owner_id and wallet_id=p_wallet and statement_broker=broker and statement_reference=ref;
  if found then
   if existing.ticker is distinct from item->>'ticker' or existing.type is distinct from item->>'type'
    or existing.currency is distinct from item->>'currency' or existing.payment_date<>paid or existing.record_date is distinct from record_day
    or existing.gross_amount<>gross or existing.net_amount<>net or existing.withholding_amount is distinct from tax or existing.fees_amount is distinct from fees
    or existing.quantity<>qty or existing.value_per_share<>unit_value
    or existing.quantity_known is distinct from (item->>'quantity' is not null) or existing.unit_value_known is distinct from (item->>'value_per_share' is not null)
   then raise exception 'Reference conflicts with existing credit on row %',n;end if;
   duplicates:=duplicates+1;continue;
  end if;
  -- Legacy credits lack a statement ID: refuse an ambiguous overlap instead of overwriting or summing.
  if exists(select 1 from public.wallet_income where user_id=owner_id and wallet_id=p_wallet and ticker=item->>'ticker'
   and type=item->>'type' and currency=item->>'currency' and (payment_date=paid or (record_day is not null and record_date=record_day)) and statement_reference is null)
  then raise exception 'Existing credit needs manual reconciliation on row %',n;end if;
  new_rows:=new_rows+1;
  if p_commit then
   if batch is null then
    insert into public.wallet_income_imports(user_id,wallet_id,source,source_key,covered_from,covered_until)
    values(owner_id,p_wallet,'statement_csv_partial',gen_random_uuid()::text,paid,paid) returning id into batch;
   end if;
   insert into public.wallet_income(user_id,wallet_id,import_id,source_key,ticker,type,record_date,payment_date,quantity,value_per_share,gross_amount,net_amount,currency,
    quantity_known,unit_value_known,withholding_amount,fees_amount,statement_broker,statement_reference)
   values(owner_id,p_wallet,batch,row_key,item->>'ticker',item->>'type',record_day,paid,qty,unit_value,gross,net,item->>'currency',
    item->>'quantity' is not null,item->>'value_per_share' is not null,tax,fees,broker,ref);
   update public.wallet_income_imports set covered_from=least(covered_from,paid),covered_until=greatest(covered_until,paid) where id=batch;
  end if;
 end loop;
 return jsonb_build_object('new_rows',new_rows,'duplicates',duplicates,'committed',coalesce(p_commit,false));
end $$;
revoke all on function public.import_income_statement(uuid,jsonb,boolean) from public,anon;
grant execute on function public.import_income_statement(uuid,jsonb,boolean) to authenticated;

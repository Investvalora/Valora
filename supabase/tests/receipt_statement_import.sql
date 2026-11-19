begin;
select set_config('qa.receipt.owner',gen_random_uuid()::text,true),set_config('qa.receipt.other',gen_random_uuid()::text,true),set_config('qa.receipt.wallet',gen_random_uuid()::text,true);
insert into auth.users(id,aud,role,email,raw_user_meta_data)
select current_setting(k)::uuid,'authenticated','authenticated',current_setting(k)||'@receipt.invalid','{}'::jsonb
from (values('qa.receipt.owner'),('qa.receipt.other')) v(k);
insert into public.wallets(id,user_id,name) values(current_setting('qa.receipt.wallet')::uuid,current_setting('qa.receipt.owner')::uuid,'Receipt QA');
insert into public.assets(ticker,name,type,currency,quote_provider) values('QARECEIPT','QA receipt','stock_us','USD','brapi');
select set_config('qa.receipt.rows','[{"broker":"qa","reference":"one","payment_date":"2026-01-05","ticker":"QARECEIPT","type":"dividend","currency":"USD","gross_amount":"0.06","withholding_amount":"0.02","fees_amount":"0","net_amount":"0.04","quantity":null,"value_per_share":null}]',true);
select set_config('request.jwt.claim.sub',current_setting('qa.receipt.owner'),true);
set local role authenticated;
do $$ declare result jsonb; payload jsonb:=current_setting('qa.receipt.rows')::jsonb;begin
 result:=public.import_income_statement(current_setting('qa.receipt.wallet')::uuid,payload,false);
 if (result->>'new_rows')::int<>1 or exists(select 1 from public.wallet_income where ticker='QARECEIPT') then raise exception 'Preview wrote credit';end if;
 result:=public.import_income_statement(current_setting('qa.receipt.wallet')::uuid,payload,true);
 if (result->>'new_rows')::int<>1 then raise exception 'Credit missing';end if;
 if not exists(select 1 from public.wallet_income where ticker='QARECEIPT' and net_amount=0.04 and gross_amount=0.06 and withholding_amount=0.02 and fees_amount=0 and currency='USD' and not quantity_known and not unit_value_known) then raise exception 'Wrong receipt basis';end if;
 result:=public.import_income_statement(current_setting('qa.receipt.wallet')::uuid,payload,true);
 if (result->>'duplicates')::int<>1 or (result->>'new_rows')::int<>0 then raise exception 'Duplicate imported';end if;
 begin
  perform public.import_income_statement(current_setting('qa.receipt.wallet')::uuid,jsonb_set(payload,'{0,net_amount}','"0.03"'),true);
  raise exception 'Wrong net accepted';
 exception when raise_exception then if SQLERRM='Wrong net accepted' then raise;end if;end;
 begin
  perform public.import_income_statement(current_setting('qa.receipt.wallet')::uuid,jsonb_set(jsonb_set(payload,'{0,net_amount}','"0.03"'),'{0,withholding_amount}','"0.03"'),true);
  raise exception 'Changed reference accepted';
 exception when raise_exception then if SQLERRM='Changed reference accepted' then raise;end if;end;
 begin
  perform public.import_income_statement(current_setting('qa.receipt.wallet')::uuid,
   jsonb_set(payload,'{0,reference}','"two"')||jsonb_set(jsonb_set(payload,'{0,reference}','"three"'),'{0,net_amount}','"0.03"'),true);
  raise exception 'Invalid batch partially accepted';
 exception when raise_exception then if SQLERRM='Invalid batch partially accepted' then raise;end if;end;
 if (select count(*) from public.wallet_income where ticker='QARECEIPT')<>1 then raise exception 'Partial batch persisted';end if;
 if (select count(*) from public.wallet_income_imports where source='statement_csv_partial' and wallet_id=current_setting('qa.receipt.wallet')::uuid)<>1 then raise exception 'Duplicate batch header';end if;
end $$;
do $$ declare payload jsonb:=current_setting('qa.receipt.rows')::jsonb; changed jsonb; result jsonb;begin
 -- Even direct RPC callers must not rely on the browser parser for date/precision checks.
 foreach changed in array array[
  jsonb_set(payload,'{0,payment_date}',to_jsonb(((now() at time zone 'America/Sao_Paulo')::date+1)::text)),
  jsonb_set(payload,'{0,record_date}','"2026-01-06"'),
  jsonb_set(payload,'{0,gross_amount}','"0.060000001"'),
  jsonb_set(payload,'{0,quantity}','"0"'),
  jsonb_set(payload,'{0,currency}','"BRL"')
 ] loop
  begin
   perform public.import_income_statement(current_setting('qa.receipt.wallet')::uuid,changed,false);
   raise exception 'Invalid direct RPC input accepted';
  exception when raise_exception then if SQLERRM='Invalid direct RPC input accepted' then raise;end if;end;
 end loop;
 changed:=jsonb_set(jsonb_set(jsonb_set(jsonb_set(payload,'{0,reference}','"fees"'),'{0,gross_amount}','"1"'),'{0,withholding_amount}','"0.30"'),'{0,fees_amount}','"0.05"');
 changed:=jsonb_set(jsonb_set(jsonb_set(changed,'{0,net_amount}','"0.65"'),'{0,record_date}','"2026-01-02"'),'{0,quantity}','"2"');
 result:=public.import_income_statement(current_setting('qa.receipt.wallet')::uuid,changed,true);
 if (result->>'new_rows')::int<>1 or not exists(select 1 from public.wallet_income where statement_reference='fees' and net_amount=0.65 and fees_amount=0.05 and withholding_amount=0.30 and record_date='2026-01-02' and quantity_known and not unit_value_known) then raise exception 'Fee/record date lost';end if;
 -- A legacy credit with no reference is ambiguous; never silently replace it.
 update public.wallet_income set statement_reference=null,statement_broker=null where statement_reference='fees';
 changed:=jsonb_set(changed,'{0,reference}','"legacy-overlap"');
 begin
  perform public.import_income_statement(current_setting('qa.receipt.wallet')::uuid,changed,true);
  raise exception 'Legacy overlap accepted';
 exception when raise_exception then
  if SQLERRM not like 'Existing credit needs manual reconciliation%' then raise;end if;
 end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('qa.receipt.other'),true);
do $$ begin
 if exists(select 1 from public.wallet_income where ticker='QARECEIPT') then raise exception 'Cross-owner read';end if;
 begin
  perform public.import_income_statement(current_setting('qa.receipt.wallet')::uuid,current_setting('qa.receipt.rows')::jsonb,true);
  raise exception 'Cross-owner write';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
do $$ begin if has_function_privilege('anon','public.import_income_statement(uuid,jsonb,boolean)','execute') then raise exception 'Anonymous import';end if;end $$;
rollback;

-- Synthetic fixtures only. No email/session is created. All changes roll back.
-- Executed against production after explicit authorization for verification.
begin;
do $qa$
declare
  qa_user uuid := gen_random_uuid();
  qa_other uuid := gen_random_uuid();
  qa_wallet uuid;
begin
  insert into auth.users(id,email,raw_user_meta_data) values
    (qa_user,qa_user::text||'@example.invalid','{"full_name":"QA transacional SB"}'),
    (qa_other,qa_other::text||'@example.invalid','{"full_name":"QA transacional SB outro"}');
  select id into qa_wallet from public.wallets where user_id=qa_user and is_default limit 1;
  if qa_wallet is null then
    insert into public.wallets(user_id,name,color,is_default) values(qa_user,'QA transacional','blue',true) returning id into qa_wallet;
  end if;
  insert into public.alerts(user_id,type,ticker,status,title,description,condition,target_price) values
    (qa_user,'price_target','MXRF11','lido','QA transacional','Sem disparo','above',24),
    (qa_user,'price_target','MXRF11','lido','QA transacional','Sem disparo','below',20),
    (qa_other,'price_target','MXRF11','lido','QA transacional','Sem disparo','above',24);
  if (select count(*) from public.alerts where user_id=qa_user and type='price_target') <> 2 then
    raise exception 'Condições distintas não coexistiram';
  end if;
  begin
    insert into public.alerts(user_id,type,ticker,status,title,description,condition,target_price)
    values(qa_user,'price_target','MXRF11','lido','QA transacional','Sem disparo','above',24);
    raise exception 'Duplicidade exata foi aceita';
  exception when unique_violation then null;
  end;
  insert into public.alerts(user_id,type,ticker,status,title,description)
    values(qa_user,'stale_quote','MXRF11','lido','QA transacional','Sem disparo');
  begin
    insert into public.alerts(user_id,type,ticker,status,title,description)
      values(qa_user,'stale_quote','MXRF11','lido','QA transacional','Sem disparo');
    raise exception 'Duplicidade automática foi aceita';
  exception when unique_violation then null;
  end;
  begin
    insert into public.transactions(user_id,wallet_id,ticker,type,quantity,price,brokerage_fee,tax,transaction_date)
      values(qa_user,qa_wallet,'MXRF11','buy',1,1,0,0,((statement_timestamp() at time zone 'America/Sao_Paulo')::date)+1);
    raise exception 'Data futura foi aceita';
  exception when check_violation then
    if sqlerrm <> 'A data da operação não pode estar no futuro.' then raise; end if;
  end;
end $qa$;
rollback;
select 'Alertas distintos, duplicidade exata/automática e data futura conferidos; fixtures revertidas.' as result;

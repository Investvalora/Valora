begin;
do $$
declare sample public.alerts; inserted public.alerts; saved_time timestamptz;
begin
  select * into sample from public.alerts limit 1;
  if sample.id is null then raise exception 'Precisa de um alerta existente para testar o trigger'; end if;
  insert into public.alerts(user_id,type,ticker,status,title,description,ignored_at)
  values(sample.user_id,sample.type,sample.ticker,'ignorado','Teste de retenção','Rollback ao concluir',now()-interval '10 days') returning * into inserted;
  if inserted.ignored_at <> now() then raise exception 'Timestamp do cliente foi aceito'; end if;
  saved_time := inserted.ignored_at;
  update public.alerts set title='Editado', ignored_at=now()-interval '20 days' where id=inserted.id;
  if (select ignored_at from public.alerts where id=inserted.id) <> saved_time then raise exception 'Editar reiniciou a retenção'; end if;
end;
$$;
create temporary table retention_cases(status text, ignored_at timestamptz);
insert into retention_cases values ('ignorado',now()-interval '3 days'),('ignorado',now()-interval '71 hours'),('lido',now()-interval '4 days'),('novo',now()-interval '4 days');
delete from retention_cases where status='ignorado' and ignored_at <= now()-interval '3 days';
do $$ begin if (select count(*) from retention_cases) <> 3 then raise exception 'Limite de retenção incorreto'; end if; end $$;
rollback;

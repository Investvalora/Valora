begin;
insert into auth.users(id,email) values ('ab185000-0000-4000-8000-000000000001','qa-lifecycle@valora.test');
insert into public.assets(ticker,name,type,currency,quote_provider) values ('QAPAUSE','QA lifecycle','stock_br','BRL','brapi');
insert into public.price_history(ticker,date,close) values ('QAPAUSE',current_date,10);
insert into public.alerts(id,user_id,ticker,type,status,title,description,target_price,condition,paused)
values ('ab185000-0000-4000-8000-000000000002','ab185000-0000-4000-8000-000000000001','QAPAUSE','price_target','lido','QA pause','Rollback',20,'below',true);
select public.monitor_price_targets();
do $$ begin
 if (select status <> 'lido' or ignored_at is not null from public.alerts where ticker='QAPAUSE') then raise exception 'Paused alert triggered or entered retention'; end if;
end $$;
set local role authenticated;
set local request.jwt.claim.sub = 'ab185000-0000-4000-8000-000000000003';
delete from public.alerts where ticker='QAPAUSE';
update public.alerts set paused=false where ticker='QAPAUSE';
reset role;
do $$ begin if not (select paused from public.alerts where ticker='QAPAUSE') then raise exception 'Cross-owner pause/delete allowed'; end if; end $$;
set local role authenticated;
set local request.jwt.claim.sub = 'ab185000-0000-4000-8000-000000000001';
update public.alerts set paused=false where ticker='QAPAUSE';
reset role;
select public.monitor_price_targets();
do $$ begin if (select status <> 'novo' from public.alerts where ticker='QAPAUSE') then raise exception 'Resumed alert did not trigger'; end if; end $$;
set local role authenticated;
delete from public.alerts where ticker='QAPAUSE';
reset role;
do $$ begin if exists(select 1 from public.alerts where ticker='QAPAUSE') then raise exception 'Owner delete failed'; end if; end $$;
rollback;

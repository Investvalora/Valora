-- Synthetic accounts and market fixtures. Everything, including pg_net queue, rolls back.
begin;
select set_config('qa.owner',gen_random_uuid()::text,true),set_config('qa.other',gen_random_uuid()::text,true);
insert into auth.users(id,aud,role,email,raw_user_meta_data)
select current_setting(key)::uuid,'authenticated','authenticated',current_setting(key)||'@configured-alert-test.invalid','{}'::jsonb
from (values('qa.owner'),('qa.other')) v(key);
insert into public.assets(ticker,name,type,currency,quote_provider)
values ('QATESTALERT','QA only','stock_br','BRL','brapi');
insert into public.fundamentals(ticker,reference_date,pl,pvp,roe,dy,debt_equity,net_margin,lpa,vpa,source)
values('QATESTALERT',current_date,10,1,10,7,1,10,1,1,'qa_test');
select set_config('request.jwt.claim.sub',current_setting('qa.owner'),true);
set local role authenticated;
insert into public.configured_alert_rules(user_id,ticker,kind,metric,operator,threshold)
values(current_setting('qa.owner')::uuid,'QATESTALERT','indicator','dy','gte',6);
do $$ begin
  if (select count(*) from public.configured_alert_rules)<>1 then raise exception 'FAIL owner read'; end if;
  begin
    insert into public.configured_alert_rules(user_id,ticker,kind,metric,operator,threshold)
    values(current_setting('qa.owner')::uuid,'BTC','indicator','dy','gte',6);
    raise exception 'FAIL crypto accepted';
  exception when check_violation then null; end;
  begin
    insert into public.configured_alert_rules(user_id,ticker,kind,metric,operator,threshold)
    values(current_setting('qa.owner')::uuid,'QATESTALERT','indicator','dy','gte',null);
    raise exception 'FAIL missing threshold accepted';
  exception when check_violation then null; end;
  begin
    perform public.monitor_configured_alerts();
    raise exception 'FAIL browser can run monitor';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('qa.other'),true);
do $$ begin
  if exists(select 1 from public.configured_alert_rules) then raise exception 'FAIL leaked rules'; end if;
  update public.configured_alert_rules set enabled=false where user_id=current_setting('qa.owner')::uuid;
  if found then raise exception 'FAIL cross owner update'; end if;
  begin
    insert into public.configured_alert_rules(user_id,ticker,kind,metric,operator,threshold)
    values(current_setting('qa.owner')::uuid,'QATESTALERT','indicator','dy','gte',8);
    raise exception 'FAIL owner spoof accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
-- Restrict this test run to synthetic rules; the update rolls back too.
update public.configured_alert_rules set enabled=false where user_id not in (current_setting('qa.owner')::uuid,current_setting('qa.other')::uuid);
do $$ begin
  if public.monitor_configured_alerts()<>1 then raise exception 'FAIL first indicator'; end if;
  if public.monitor_configured_alerts()<>0 then raise exception 'FAIL duplicate indicator'; end if;
end $$;
update public.fundamentals set dy=null where ticker='QATESTALERT';
do $$ begin if public.monitor_configured_alerts()<>0 then raise exception 'FAIL missing indicator'; end if; end $$;
update public.fundamentals set dy=5 where ticker='QATESTALERT';
select public.monitor_configured_alerts();
update public.fundamentals set dy=8 where ticker='QATESTALERT';
do $$ begin if public.monitor_configured_alerts()<>1 then raise exception 'FAIL rearmed indicator'; end if; end $$;
update public.configured_alert_rules set threshold=7 where ticker='QATESTALERT';
do $$ begin if public.monitor_configured_alerts()<>1 then raise exception 'FAIL edited condition'; end if; end $$;
update public.configured_alert_rules set enabled=false where ticker='QATESTALERT';
update public.fundamentals set dy=2 where ticker='QATESTALERT';
do $$ begin if public.monitor_configured_alerts()<>0 then raise exception 'FAIL paused rule ran'; end if; end $$;
update public.configured_alert_rules set enabled=true where ticker='QATESTALERT';
select public.monitor_configured_alerts();
update public.fundamentals set dy=8,source='seed' where ticker='QATESTALERT';
do $$ begin if public.monitor_configured_alerts()<>0 then raise exception 'FAIL seed triggered'; end if; end $$;
update public.fundamentals set source='qa_test',reference_date=current_date+1 where ticker='QATESTALERT';
do $$ begin if public.monitor_configured_alerts()<>0 then raise exception 'FAIL future reference triggered'; end if; end $$;
update public.fundamentals set reference_date=current_date-401 where ticker='QATESTALERT';
do $$ begin if public.monitor_configured_alerts()<>0 then raise exception 'FAIL stale reference triggered'; end if; end $$;
update public.fundamentals set reference_date=current_date,dy=2 where ticker='QATESTALERT';
insert into public.configured_alert_rules(user_id,ticker,kind)
values(current_setting('qa.owner')::uuid,'QATESTALERT','dividend_announced'),
      (current_setting('qa.owner')::uuid,'QATESTALERT','dividend_payment');
insert into public.dividends(ticker,ex_date,payment_date,type,value_per_share,source)
values('QATESTALERT',(now() at time zone 'America/Sao_Paulo')::date,(now() at time zone 'America/Sao_Paulo')::date,'dividend',1,'qa_test');
do $$ begin
  if public.monitor_configured_alerts()<>2 then raise exception 'FAIL dividend events'; end if;
  if public.monitor_configured_alerts()<>0 then raise exception 'FAIL duplicate events'; end if;
  if (select count(*) from public.alerts where user_id=current_setting('qa.owner')::uuid)<>5 then raise exception 'FAIL notification count'; end if;
  if has_table_privilege('anon','public.configured_alert_rules','select') then raise exception 'FAIL anon access'; end if;
  if has_table_privilege('authenticated','public.configured_alert_state','update') then raise exception 'FAIL client state write'; end if;
end $$;
delete from public.configured_alert_rules where user_id=current_setting('qa.owner')::uuid;
do $$ begin
  if exists(select 1 from public.configured_alert_state s join public.configured_alert_rules r on r.id=s.rule_id where r.ticker='QATESTALERT') then raise exception 'FAIL cascade'; end if;
end $$;
rollback;
select 'PASS configured alerts: ownership, validation, crossing, deduplication, editing and events; rolled back' as result;

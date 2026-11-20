begin;
select set_config('qa.indicator_owner',gen_random_uuid()::text,true);
insert into auth.users(id,aud,role,email,raw_user_meta_data)
values(current_setting('qa.indicator_owner')::uuid,'authenticated','authenticated',current_setting('qa.indicator_owner')||'@indicator.invalid','{}');
insert into public.assets(ticker,name,type,currency,quote_provider) values('QAINDCLASS','QA','stock_br','BRL','brapi');
insert into public.fundamentals(ticker,reference_date,roe,dy,source) values('QAINDCLASS',(now() at time zone 'America/Sao_Paulo')::date,20,7,'yahoo');
update public.configured_alert_rules set enabled=false;
insert into public.configured_alert_rules(user_id,ticker,kind,metric,operator,threshold)
values(current_setting('qa.indicator_owner')::uuid,'QAINDCLASS','indicator','roe','gte',1);
-- An existing rule must stop using company metrics after an asset reclassification.
update public.assets set type='fii' where ticker='QAINDCLASS';
do $$ begin
 if public.monitor_configured_alerts()<>0 then raise exception 'Incompatible existing rule triggered'; end if;
 if public.validated_indicator_value('roe','yahoo',20,'fii') is not null then raise exception 'FII ROE accepted';end if;
 if public.validated_indicator_value('dy','yahoo',7,'fii')<>7 then raise exception 'FII DY rejected';end if;
 if public.validated_indicator_value('debt_equity','brapi',150,'stock_us') is not null then raise exception 'Invalid debt source';end if;
 if public.validated_indicator_value('debt_equity','yahoo',150,'stock_us')<>150 then raise exception 'Debt units changed';end if;
 if public.validated_indicator_value('dy','seed',7,'stock_br') is not null then raise exception 'Seed accepted';end if;
 if public.supports_indicator_class('dy','crypto') or public.supports_indicator_class('dy',null) then raise exception 'Unknown class accepted';end if;
 if has_function_privilege('anon','public.supports_indicator_class(text,text)','execute') then raise exception 'Public helper exposed';end if;
 begin
  insert into public.configured_alert_rules(user_id,ticker,kind,metric,operator,threshold)
  values(current_setting('qa.indicator_owner')::uuid,'QAINDCLASS','indicator','roe','gte',2);
  raise exception 'New incompatible rule accepted';
 exception when check_violation then null;end;
end $$;
insert into public.configured_alert_rules(user_id,ticker,kind,metric,operator,threshold)
values(current_setting('qa.indicator_owner')::uuid,'QAINDCLASS','indicator','dy','gte',1);
do $$ begin
 if public.monitor_configured_alerts()<>1 then raise exception 'Compatible DY not triggered';end if;
 if public.monitor_configured_alerts()<>0 then raise exception 'Duplicate DY';end if;
end $$;
rollback;

begin;
select set_config('qa.payout_owner',gen_random_uuid()::text,true);
insert into auth.users(id,email,raw_user_meta_data) values(current_setting('qa.payout_owner')::uuid,current_setting('qa.payout_owner')||'@payout.invalid','{}');
insert into public.assets(ticker,name,type,currency,quote_provider) values('QAPAYOUT','QA payout','stock_br','BRL','brapi');
insert into public.fundamentals(ticker,reference_date,lpa,payout_ratio,source) values('QAPAYOUT',current_date,2,45,'yahoo');
update public.configured_alert_rules set enabled=false;
insert into public.configured_alert_rules(user_id,ticker,kind,metric,operator,threshold)
 values(current_setting('qa.payout_owner')::uuid,'QAPAYOUT','indicator','payout_ratio','lte',50);
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('qa.payout_owner'),true);
insert into public.score_rules(user_id,name,metric,operator,threshold_min,points)
 values(auth.uid(),'QA payout','payout_ratio','lte',50,2);
do $$ begin
 if public.validated_indicator_value('payout_ratio','brapi',45,'stock_br') is not null then raise exception 'Payout source was ignored';end if;
 if public.validated_indicator_value('payout_ratio','yahoo',45,'fii') is not null then raise exception 'FII payout accepted';end if;
 if public.validated_indicator_value('payout_ratio','yahoo',45,'stock_br')<>45 then raise exception 'Payout scale changed';end if;
 if not public.valid_custom_strategy_rules('[{"metric":"payoutPercent","operator":"lte","min":50}]') then raise exception 'Custom payout rejected';end if;
 if has_function_privilege('anon','public.supports_indicator_class(text,text)','execute') then raise exception 'Anonymous helper exposed';end if;
 if (select count(*) from public.score_rules where name='QA payout')<>1 then raise exception 'Own payout score unavailable';end if;
end $$;
reset role;
do $$ begin
 if public.monitor_configured_alerts()<>1 then raise exception 'Payout not observed';end if;
 if public.monitor_configured_alerts()<>0 then raise exception 'Repeated payout alert';end if;
end $$;
update public.fundamentals set lpa=0 where ticker='QAPAYOUT';
delete from public.configured_alert_state where rule_id in(select id from public.configured_alert_rules where ticker='QAPAYOUT');
do $$ begin
 if public.monitor_configured_alerts()<>0 then raise exception 'Zero earnings payout accepted';end if;
end $$;
update public.fundamentals set lpa=2,source='brapi' where ticker='QAPAYOUT';
do $$ begin
 if public.monitor_configured_alerts()<>0 then raise exception 'Wrong provider payout accepted';end if;
end $$;
do $$ begin
 begin
  update public.fundamentals set source='yahoo',payout_ratio=-1 where ticker='QAPAYOUT';
  raise exception 'Negative payout accepted';
 exception when check_violation then null;end;
end $$;
update public.fundamentals set source='yahoo',payout_ratio=45 where ticker='QAPAYOUT';
update public.assets set type='fii' where ticker='QAPAYOUT';
do $$ begin
 if public.monitor_configured_alerts()<>0 then raise exception 'Reclassified FII payout accepted';end if;
end $$;
rollback;

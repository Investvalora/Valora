-- Synthetic identities only. No real data or sessions remain after rollback.
begin;
select set_config('test.owner',gen_random_uuid()::text,true),set_config('test.other',gen_random_uuid()::text,true),
 set_config('test.score_a',gen_random_uuid()::text,true),set_config('test.score_b',gen_random_uuid()::text,true);
insert into auth.users(id,aud,role,email,raw_user_meta_data)
select current_setting(key)::uuid,'authenticated','authenticated',current_setting(key)||'@security-fixture.invalid','{"full_name":"Security fixture"}'::jsonb
from (values('test.owner'),('test.other')) settings(key);
insert into public.score_rules(id,user_id,name,metric,operator,threshold_min,points) values
 (current_setting('test.score_a')::uuid,current_setting('test.owner')::uuid,'Own','dy','gte',6,1),
 (current_setting('test.score_b')::uuid,current_setting('test.other')::uuid,'Other','dy','gte',6,1);
select set_config('request.jwt.claim.sub',current_setting('test.owner'),true),
 set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.owner'),'role','authenticated')::text,true);
set local role authenticated;
delete from public.user_preferences where user_id=auth.uid();
do $$ begin
 begin
  insert into public.user_preferences(user_id,default_score_rule_id) values(auth.uid(),current_setting('test.score_b')::uuid);
  raise exception 'FAIL foreign insert accepted';
 exception when foreign_key_violation then null; end;
 insert into public.user_preferences(user_id,default_score_rule_id) values(auth.uid(),current_setting('test.score_a')::uuid);
 begin
  update public.user_preferences set default_score_rule_id=current_setting('test.score_b')::uuid where user_id=auth.uid();
  raise exception 'FAIL foreign update accepted';
 exception when foreign_key_violation then null; end;
 begin
  update public.user_preferences set default_score_rule_id=gen_random_uuid() where user_id=auth.uid();
  raise exception 'FAIL nonexistent reference accepted';
 exception when foreign_key_violation then null; end;
 delete from public.score_rules where id=current_setting('test.score_a')::uuid;
 if not exists(select 1 from public.user_preferences where user_id=auth.uid() and default_score_rule_id is null) then
  raise exception 'FAIL deleting own score did not preserve preference owner';
 end if;
end $$;
reset role;
select 'PASS: owned reference, foreign INSERT/UPDATE rejection, missing UUID rejection, delete SET NULL' as result;
rollback;

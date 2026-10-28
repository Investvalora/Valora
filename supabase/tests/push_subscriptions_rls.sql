-- Tudo é revertido; não registra navegador real nem envia push.
begin;
select set_config('valora.push_owner',gen_random_uuid()::text,true);
select set_config('valora.push_other',gen_random_uuid()::text,true);
insert into auth.users(id,aud,role,email,raw_user_meta_data)
select current_setting(key)::uuid,'authenticated','authenticated',current_setting(key)||'@push-test.invalid','{"full_name":"Teste push"}'::jsonb
from (values('valora.push_owner'),('valora.push_other')) settings(key);
insert into public.push_subscriptions(user_id,endpoint,p256dh,auth)
values(current_setting('valora.push_other')::uuid,'https://fcm.googleapis.com/push-test-other','test','test');
select set_config('request.jwt.claim.sub',current_setting('valora.push_owner'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('valora.push_owner'),'role','authenticated')::text,true);
set local role authenticated;
insert into public.push_subscriptions(user_id,endpoint,p256dh,auth)
values(current_setting('valora.push_owner')::uuid,'https://fcm.googleapis.com/push-test-owner','test','test');
do $$ begin
  if (select count(*) from public.push_subscriptions where endpoint like 'https://fcm.googleapis.com/push-test-%')<>1 then
    raise exception 'Inscrição de outra conta ficou visível';
  end if;
  begin
    insert into public.push_subscriptions(user_id,endpoint,p256dh,auth)
    values(current_setting('valora.push_other')::uuid,'https://fcm.googleapis.com/push-test-cross-account','test','test');
    raise exception 'Foi possível inscrever outra conta';
  exception when insufficient_privilege then null;
  end;
end $$;
delete from public.push_subscriptions where endpoint='https://fcm.googleapis.com/push-test-other';
delete from public.push_subscriptions where endpoint='https://fcm.googleapis.com/push-test-owner';
reset role;
do $$ begin
  if not exists(select 1 from public.push_subscriptions where endpoint='https://fcm.googleapis.com/push-test-other') then
    raise exception 'Foi possível excluir inscrição de outra conta';
  end if;
  if exists(select 1 from public.push_subscriptions where endpoint='https://fcm.googleapis.com/push-test-owner') then
    raise exception 'Não foi possível excluir a própria inscrição';
  end if;
  if has_function_privilege('authenticated','public.enqueue_alert_push()','execute')
     or has_table_privilege('anon','public.push_subscriptions','select')
     or has_function_privilege('authenticated','public.authorize_alert_push(text)','execute')
     or has_function_privilege('anon','public.authorize_alert_push(text)','execute') then
    raise exception 'Permissões de push excessivas';
  end if;
  if public.authorize_alert_push(repeat('0',64)) then
    raise exception 'Credencial interna inválida foi aceita';
  end if;
  if not (select public.authorize_alert_push(encode(sha256(convert_to(decrypted_secret,'UTF8')),'hex')) from vault.decrypted_secrets where name='service_role_key') then
    raise exception 'Credencial do agendador não foi aceita';
  end if;
end $$;
rollback;

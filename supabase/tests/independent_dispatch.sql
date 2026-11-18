begin;
delete from public.international_dispatch_runs;
set local role service_role;
do $$ declare id uuid;begin
 id:=public.reserve_international_dispatch();
 if id is null then raise exception 'First slot not reserved';end if;
 if public.reserve_international_dispatch() is not null then raise exception 'Duplicate slot reserved';end if;
 if not public.finish_international_dispatch(id,'accepted',204) then raise exception 'Acceptance not persisted';end if;
 if public.finish_international_dispatch(id,'rejected',401) then raise exception 'Finished audit overwritten';end if;
 if not exists(select 1 from public.international_dispatch_runs where status='accepted' and http_status=204 and finished_at is not null) then raise exception 'Invalid audit';end if;
 if has_table_privilege('authenticated','public.international_dispatch_runs','select') or has_function_privilege('anon','public.reserve_international_dispatch()','execute') or has_function_privilege('authenticated','public.finish_international_dispatch(uuid,text,integer)','execute') then raise exception 'Dispatcher exposed';end if;
end $$;
reset role;
rollback;

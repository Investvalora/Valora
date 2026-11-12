begin;
set local role service_role;
do $$ declare first_id text:=repeat('a',64);second_id text:=repeat('b',64);r text;begin
 r:=public.reserve_marketstack_key(array[first_id,second_id]);
 if r<>first_id then raise exception 'First account not selected';end if;
 perform public.block_marketstack_key(first_id,'provider_quota_exhausted');
 r:=public.reserve_marketstack_key(array[first_id,second_id]);
 if r<>second_id then raise exception 'Exhausted account reused';end if;
 if not exists(select 1 from public.marketstack_key_state where key_id=first_id and blocked_until=date_trunc('month',now())+interval '1 month') then raise exception 'Quota not blocked until next month';end if;
 perform public.reserve_marketstack_key(array[first_id,second_id]);
 if public.reserve_marketstack_key(array[first_id,second_id]) is not null then raise exception 'Daily budget exceeded';end if;
 update public.marketstack_key_usage set usage_day=current_date-interval '1 year';
 update public.marketstack_key_state set blocked_until=now()-interval '1 second';
 if public.reserve_marketstack_key(array[first_id,second_id])<>first_id then raise exception 'Expired budget not renewed';end if;
 -- A fingerprint with 80 monthly calls cannot reserve more, independently of other accounts.
 update public.marketstack_key_usage set requests=80 where key_id=first_id and usage_day=current_date;
 if public.reserve_marketstack_key(array[first_id,second_id])<>second_id then raise exception 'Monthly quota not rotated';end if;
 begin
  perform public.reserve_marketstack_key(array[first_id,first_id]);raise exception 'Duplicate credential multiplied budget';
 exception when raise_exception then if sqlerrm<>'Invalid key identifiers' then raise;end if;end;
 if has_function_privilege('anon','public.reserve_marketstack_key(text[])','EXECUTE') or has_function_privilege('authenticated','public.block_marketstack_key(text,text)','EXECUTE') then raise exception 'Rotation RPC exposed';end if;
 if has_table_privilege('authenticated','public.marketstack_key_usage','SELECT') then raise exception 'Private counters exposed';end if;
end $$;
reset role;
rollback;

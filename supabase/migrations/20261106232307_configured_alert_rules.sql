begin;
create table public.configured_alert_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  ticker text not null references public.assets(ticker) on delete restrict,
  kind text not null check (kind in ('indicator','dividend_announced','dividend_payment')),
  metric text check (metric in ('pl','pvp','roe','dy','debt_equity','net_margin')),
  operator text check (operator in ('gte','lte')),
  threshold numeric,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint configured_alert_condition check (
    (kind='indicator' and metric is not null and operator is not null and threshold is not null
      and threshold::text not in ('NaN','Infinity','-Infinity') and abs(threshold)<=1000000000)
    or (kind<>'indicator' and metric is null and operator is null and threshold is null)
  )
);
create unique index configured_alert_rules_unique on public.configured_alert_rules
  (user_id,ticker,kind,coalesce(metric,''),coalesce(operator,''),coalesce(threshold,0));
create index configured_alert_rules_user_idx on public.configured_alert_rules(user_id,created_at desc);
alter table public.configured_alert_rules enable row level security;
create policy own_rules on public.configured_alert_rules for all to authenticated
  using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
revoke all on public.configured_alert_rules from public,anon,authenticated;
grant select,insert,update,delete on public.configured_alert_rules to authenticated;
grant all on public.configured_alert_rules to service_role;
create trigger set_configured_alert_updated_at before update on public.configured_alert_rules
for each row execute function public.handle_updated_at();

-- Internal state is never writable by the browser; it survives notification cleanup.
create table public.configured_alert_state (
  rule_id uuid primary key references public.configured_alert_rules(id) on delete cascade,
  signature text not null,
  matched boolean not null default false
);
create table public.configured_alert_deliveries (
  rule_id uuid not null references public.configured_alert_rules(id) on delete cascade,
  event_key text not null,
  primary key(rule_id,event_key)
);
alter table public.configured_alert_state enable row level security;
alter table public.configured_alert_deliveries enable row level security;
revoke all on public.configured_alert_state, public.configured_alert_deliveries from public,anon,authenticated;
grant all on public.configured_alert_state, public.configured_alert_deliveries to service_role;

create function public.validate_configured_alert_rule()
returns trigger language plpgsql security invoker set search_path='' as $$
declare asset_type text;
begin
  select a.type::text into asset_type from public.assets a where a.ticker=new.ticker;
  if new.kind='indicator' then
    if not (asset_type in ('stock_br','stock_us','bdr') or
      (asset_type in ('fii','reit') and new.metric in ('dy','pvp'))) then
      raise exception 'Indicador incompatível com a classe do ativo.' using errcode='23514';
    end if;
  elsif asset_type not in ('stock_br','stock_us','bdr','fii','reit','etf_br','etf_us') then
    raise exception 'A classe do ativo não possui proventos compatíveis.' using errcode='23514';
  end if;
  if tg_op='UPDATE' and (new.user_id<>old.user_id or new.created_at<>old.created_at) then
    raise exception 'Identidade da regra não pode ser alterada.' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function public.validate_configured_alert_rule() from public,anon,authenticated;
create trigger validate_configured_alert_rule before insert or update on public.configured_alert_rules
for each row execute function public.validate_configured_alert_rule();

drop index public.alerts_active_user_type_ticker_idx;
create unique index alerts_active_user_type_ticker_idx on public.alerts(user_id,type,ticker)
where status<>'ignorado' and type not in ('price_target','indicator','event');

create function public.monitor_configured_alerts()
returns integer language plpgsql security invoker set search_path='' as $$
declare r record; f record; d record; observed numeric; matched boolean; previous boolean; current_signature text;
  today date := (now() at time zone 'America/Sao_Paulo')::date;
  affected integer:=0; inserted integer; event_label text;
begin
  -- Row locks make overlapping cron executions safe, without locking other accounts.
  for r in select * from public.configured_alert_rules where enabled for update skip locked loop
    if r.kind='indicator' then
      select * into f from public.fundamentals where ticker=r.ticker
        and source not in ('seed','synthetic') and reference_date<=today
        and reference_date>=today-400 order by reference_date desc limit 1;
      if not found then continue; end if;
      observed := case r.metric when 'pl' then f.pl when 'pvp' then f.pvp when 'roe' then f.roe
        when 'dy' then f.dy when 'debt_equity' then f.debt_equity when 'net_margin' then f.net_margin end;
      if observed is null or observed::text in ('NaN','Infinity','-Infinity') then continue; end if;
      matched := case r.operator when 'gte' then observed>=r.threshold else observed<=r.threshold end;
      current_signature:=concat_ws('|',r.ticker,r.metric,r.operator,r.threshold);
      select s.matched into previous from public.configured_alert_state s where s.rule_id=r.id and s.signature=current_signature;
      if matched and not coalesce(previous,false) then
        insert into public.alerts(user_id,type,ticker,status,title,description,last_quote_date)
        values(r.user_id,'indicator',r.ticker,'novo','Indicador atingido: '||r.ticker,
          upper(r.metric)||' = '||observed||'; condição '||r.operator||' '||r.threshold||
          '. Referência: '||f.reference_date||'. Fonte: '||f.source||'.',f.reference_date);
        affected:=affected+1;
      end if;
      insert into public.configured_alert_state values(r.id,current_signature,matched)
        on conflict(rule_id) do update set matched=excluded.matched,signature=excluded.signature;
    else
      for d in select * from public.dividends where ticker=r.ticker and source not in ('seed','synthetic')
        and ((r.kind='dividend_announced' and coalesce(payment_date,ex_date)>=today
          and created_at>=r.created_at)
          or (r.kind='dividend_payment' and payment_date between greatest((r.created_at at time zone 'America/Sao_Paulo')::date,today-7) and today)) loop
        insert into public.configured_alert_deliveries values(r.id,d.id::text) on conflict do nothing;
        get diagnostics inserted=row_count;
        if inserted=0 then continue; end if;
        event_label:=case r.kind when 'dividend_payment' then 'Pagamento de provento' else 'Provento anunciado' end;
        insert into public.alerts(user_id,type,ticker,status,title,description,last_quote_date)
        values(r.user_id,'event',r.ticker,'novo',event_label||': '||r.ticker,
          event_label||'. Valor por unidade: '||d.value_per_share||' '||
          (select currency from public.assets where ticker=r.ticker)||
          '; data ex: '||d.ex_date||'; pagamento: '||coalesce(d.payment_date::text,'não informado')||
          '. Fonte: '||d.source||'. Não confirma direito ao recebimento.',coalesce(d.payment_date,d.ex_date));
        affected:=affected+1;
      end loop;
    end if;
  end loop;
  return affected;
end;
$$;
revoke all on function public.monitor_configured_alerts() from public,anon,authenticated;
grant execute on function public.monitor_configured_alerts() to service_role;
-- Existing alerts INSERT trigger sends pushes. No new secrets or Edge Functions.
select cron.schedule('monitor-configured-alerts','*/5 * * * *',$job$select public.monitor_configured_alerts()$job$);
commit;

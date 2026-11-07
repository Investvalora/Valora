-- Debt/equity from Yahoo is expressed as percentage; no automatic conversion of user thresholds.
create or replace function public.monitor_configured_alerts()
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
      if r.metric='debt_equity' and f.source<>'yahoo' then continue; end if;
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

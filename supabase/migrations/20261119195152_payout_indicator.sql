-- Payout in the shared contract; no conversion of existing rules or user data.
-- New enum labels are committed before any future INSERT uses them.
alter type public.score_metric add value if not exists 'payout_ratio';
alter table public.configured_alert_rules drop constraint configured_alert_rules_metric_check;
alter table public.configured_alert_rules add constraint configured_alert_rules_metric_check
 check(metric in ('pl','pvp','roe','dy','debt_equity','net_margin','payout_ratio'));
CREATE OR REPLACE FUNCTION public.validated_indicator_value(p_metric text,p_source text,p_value numeric)
RETURNS numeric LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path='' AS $contract$
 SELECT CASE WHEN NOT (c ? p_metric) OR p_source IN ('seed','synthetic')
   OR (c->p_metric->>'requiredSource' IS NOT NULL AND (c->p_metric->>'requiredSource') IS DISTINCT FROM p_source)
   OR p_value::text IN ('NaN','Infinity','-Infinity') THEN NULL ELSE p_value END
 FROM (SELECT '{"pl":{"unit":"multiple","requiredSource":null},"pvp":{"unit":"multiple","requiredSource":null},"roe":{"unit":"percent","requiredSource":null},"dy":{"unit":"percent","requiredSource":null},"debt_equity":{"unit":"percent","requiredSource":"yahoo"},"net_margin":{"unit":"percent","requiredSource":null},"payout_ratio":{"unit":"percent","requiredSource":"yahoo"}}'::jsonb AS c) AS contract
$contract$;
REVOKE ALL ON FUNCTION public.validated_indicator_value(text,text,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.validated_indicator_value(text,text,numeric) TO authenticated,service_role;

create or replace function public.supports_indicator_class(p_metric text,p_asset_type text)
returns boolean language sql immutable security invoker set search_path='' as $classes$
 select coalesce((c->p_metric) ? p_asset_type,false)
 from (select '{"pl":["stock_br","stock_us","bdr"],"pvp":["stock_br","stock_us","bdr","fii","reit"],"roe":["stock_br","stock_us","bdr"],"dy":["stock_br","stock_us","bdr","fii","reit"],"debt_equity":["stock_br","stock_us","bdr"],"net_margin":["stock_br","stock_us","bdr"],"payout_ratio":["stock_br","stock_us","bdr"]}'::jsonb as c) contract
$classes$;
revoke all on function public.supports_indicator_class(text,text) from public,anon;
grant execute on function public.supports_indicator_class(text,text) to authenticated,service_role;
create or replace function public.validated_indicator_value(p_metric text,p_source text,p_value numeric,p_asset_type text)
returns numeric language sql immutable security invoker set search_path='' as $classes$
 select case when public.supports_indicator_class(p_metric,p_asset_type)
 then public.validated_indicator_value(p_metric,p_source,p_value) else null end
$classes$;
revoke all on function public.validated_indicator_value(text,text,numeric,text) from public,anon;
grant execute on function public.validated_indicator_value(text,text,numeric,text) to authenticated,service_role;

-- Debt/equity from Yahoo is expressed as percentage; no automatic conversion of user thresholds.
create or replace function public.monitor_configured_alerts()
returns integer language plpgsql security invoker set search_path='' as $$
declare asset_class text; r record; f record; d record; observed numeric; matched boolean; previous boolean; current_signature text;
  today date := (now() at time zone 'America/Sao_Paulo')::date;
  affected integer:=0; inserted integer; event_label text;
begin
  -- Row locks make overlapping cron executions safe, without locking other accounts.
  for r in select * from public.configured_alert_rules where enabled for update skip locked loop
    if r.kind='indicator' then
      select type::text into asset_class from public.assets where ticker=r.ticker;
      if not found then continue; end if;
      select * into f from public.fundamentals where ticker=r.ticker
        and source not in ('seed','synthetic') and reference_date<=today
        and reference_date>=today-400 order by reference_date desc limit 1;
      if not found then continue; end if;
      observed := public.validated_indicator_value(r.metric,f.source,case r.metric when 'pl' then f.pl when 'pvp' then f.pvp when 'roe' then f.roe
        when 'dy' then f.dy when 'debt_equity' then f.debt_equity when 'net_margin' then f.net_margin when 'payout_ratio' then case when f.lpa>0 and f.lpa::text not in ('NaN','Infinity','-Infinity') and f.payout_ratio>=0 then f.payout_ratio else null end end,asset_class);
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

create or replace function public.valid_custom_strategy_rules(rules jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare item jsonb;
begin
  if jsonb_typeof(rules) <> 'array' then return false; end if;
  if jsonb_array_length(rules) not between 1 and 20 then return false; end if;
  for item in select value from jsonb_array_elements(rules) loop
    if jsonb_typeof(item) <> 'object' then return false; end if;
    if not (item ?& array['metric','operator','min']) then return false; end if;
    if item->>'metric' not in ('pl','pvp','dy','roe','netMargin','quotePrice','weightPercent','payoutPercent') then return false; end if;
    if item->>'operator' not in ('lt','lte','gt','gte','between') then return false; end if;
    if jsonb_typeof(item->'metric') <> 'string' or jsonb_typeof(item->'operator') <> 'string'
      or jsonb_typeof(item->'min') <> 'number' then return false; end if;
    if item->>'operator' = 'between' then
      if not (item ? 'max') or jsonb_typeof(item->'max') <> 'number' then return false; end if;
      if (item->>'max')::numeric < (item->>'min')::numeric then return false; end if;
    end if;
  end loop;
  return true;
end;
$$;

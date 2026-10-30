-- Preserve missing metrics as NULL; existing rows and constraints remain.
alter table public.fundamentals
  alter column pl drop not null,
  alter column pvp drop not null,
  alter column roe drop not null,
  alter column dy drop not null,
  alter column debt_equity drop not null,
  alter column net_margin drop not null,
  alter column lpa drop not null,
  alter column vpa drop not null;
-- Negative book equity is a real value; Graham rejects nonpositive VPA.
alter table public.fundamentals drop constraint fundamentals_vpa_positive;

create function public.authorize_market_job(token_digest text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from vault.decrypted_secrets s
    where s.name = 'service_role_key' and token_digest ~ '^[0-9a-f]{64}$'
      and pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(s.decrypted_secret, 'UTF8')), 'hex') = token_digest
  );
$$;
revoke all on function public.authorize_market_job(text) from public, anon, authenticated;
grant execute on function public.authorize_market_job(text) to service_role;

alter table public.alerts add column auto_managed boolean not null default false;
create function public.protect_user_alert_edits()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) = new.user_id then
    if tg_op = 'INSERT' then
      new.auto_managed := false;
    elsif new.status = 'ignorado' or row(new.title,new.description,new.target_price,new.condition,new.type,new.ticker)
       is distinct from row(old.title,old.description,old.target_price,old.condition,old.type,old.ticker) then
      new.auto_managed := false;
    else
      new.auto_managed := old.auto_managed;
    end if;
  end if;
  return new;
end;
$$;
create trigger protect_user_alert_edits before insert or update on public.alerts
for each row execute function public.protect_user_alert_edits();

-- No user session or Edge secret is necessary for this database-owned job.
create function public.monitor_price_targets()
returns integer language plpgsql security invoker set search_path = '' as $$
declare affected integer;
begin
  with latest as (
    select distinct on (p.ticker) p.ticker,p.close,p.date
    from public.price_history p
    where p.close > 0 and p.date <= current_date
      and p.date >= current_date - 7
      and exists (select 1 from public.alerts a where a.ticker=p.ticker and a.type='price_target' and a.status='lido')
    order by p.ticker,p.date desc
  )
  update public.alerts a set status='novo',last_quote_date=q.date
  from latest q
  where a.ticker=q.ticker and a.type='price_target' and a.status='lido'
    and a.last_quote_date is distinct from q.date
    and a.target_price > 0
    and ((a.condition='below' and q.close <= a.target_price)
      or (a.condition='above' and q.close >= a.target_price));
  get diagnostics affected = row_count;
  return affected;
end;
$$;
revoke all on function public.monitor_price_targets() from public,anon,authenticated;
grant execute on function public.monitor_price_targets() to service_role;
select cron.schedule('monitor-price-targets', '* * * * *', $$select public.monitor_price_targets()$$);

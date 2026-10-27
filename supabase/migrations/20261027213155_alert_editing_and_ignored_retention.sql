begin;
alter table public.alerts add column if not exists ignored_at timestamptz;
update public.alerts set ignored_at = updated_at where status = 'ignorado' and ignored_at is null;

create or replace function public.track_alert_ignored_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.status = 'ignorado' then
    if tg_op = 'INSERT' then
      new.ignored_at := now();
    elsif old.status is distinct from new.status then
      new.ignored_at := now();
    else
      new.ignored_at := old.ignored_at;
    end if;
  else
    new.ignored_at := null;
  end if;
  return new;
end;
$$;
revoke all on function public.track_alert_ignored_at() from public, anon, authenticated;
create trigger track_alert_ignored_at before insert or update on public.alerts
for each row execute function public.track_alert_ignored_at();
create index if not exists alerts_ignored_retention_idx on public.alerts(ignored_at) where status = 'ignorado';

-- Executa no servidor mesmo quando o usuário não abre o aplicativo.
create extension if not exists pg_cron;
select cron.schedule('purge-ignored-alerts-after-3-days', '*/15 * * * *',
  $$delete from public.alerts where status = 'ignorado' and ignored_at <= now() - interval '3 days'$$);
commit;

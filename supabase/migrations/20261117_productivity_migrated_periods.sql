-- Avoid repeatedly listing the legacy Blob after a full day or month was copied.
create table public.alencar_productivity_migrated_periods (
  period text primary key,
  migrated_at timestamptz not null default now(),
  constraint productivity_period_format check (period ~ '^(day:[0-9]{4}-[0-9]{2}-[0-9]{2}|month:[0-9]{4}-[0-9]{2})$')
);
alter table public.alencar_productivity_migrated_periods enable row level security;
grant select, insert on public.alencar_productivity_migrated_periods to authenticated;
create policy alencar_productivity_migration_admin_only on public.alencar_productivity_migrated_periods
  for all to authenticated
  using (
    (select auth.jwt()) ->> 'email' in ('admin@alencarlog.com.br', 'admin1@alencarlog.com.br')
    and exists (select 1 from public.alencar_user_roles r where r.user_id = (select auth.uid()) and r.role = 'admin')
  )
  with check (
    (select auth.jwt()) ->> 'email' in ('admin@alencarlog.com.br', 'admin1@alencarlog.com.br')
    and exists (select 1 from public.alencar_user_roles r where r.user_id = (select auth.uid()) and r.role = 'admin')
  );

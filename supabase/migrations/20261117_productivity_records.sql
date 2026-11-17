-- Independent persistence for productivity records. The legacy Blob remains untouched.
create table if not exists public.alencar_productivity_records (
  report_date date not null,
  id uuid not null,
  data jsonb not null,
  deleted_at timestamptz,
  primary key (report_date, id)
);

alter table public.alencar_productivity_records enable row level security;
grant select, insert, update, delete on public.alencar_productivity_records to authenticated;

create policy alencar_productivity_admin_only on public.alencar_productivity_records
  for all to authenticated
  using (
    (select auth.jwt() ->> 'email') in ('admin@alencarlog.com.br', 'admin1@alencarlog.com.br')
    and exists (select 1 from public.alencar_user_roles r where r.user_id = (select auth.uid()) and r.role = 'admin')
  )
  with check (
    (select auth.jwt() ->> 'email') in ('admin@alencarlog.com.br', 'admin1@alencarlog.com.br')
    and exists (select 1 from public.alencar_user_roles r where r.user_id = (select auth.uid()) and r.role = 'admin')
  );

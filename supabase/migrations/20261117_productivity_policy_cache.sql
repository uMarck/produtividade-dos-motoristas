-- Evaluate JWT identity once per statement rather than once per record.
alter policy alencar_productivity_admin_only on public.alencar_productivity_records
  using (
    (select auth.jwt()) ->> 'email' in ('admin@alencarlog.com.br', 'admin1@alencarlog.com.br')
    and exists (select 1 from public.alencar_user_roles r where r.user_id = (select auth.uid()) and r.role = 'admin')
  )
  with check (
    (select auth.jwt()) ->> 'email' in ('admin@alencarlog.com.br', 'admin1@alencarlog.com.br')
    and exists (select 1 from public.alencar_user_roles r where r.user_id = (select auth.uid()) and r.role = 'admin')
  );

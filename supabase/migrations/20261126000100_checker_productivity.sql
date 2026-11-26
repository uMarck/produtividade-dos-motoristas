create table public.alencar_checker_productivity (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  date date not null,
  name text not null check (char_length(name) between 1 and 120 and name = btrim(name) and name !~ '[[:space:]]{2,}'),
  name_key text generated always as (lower(name)) stored,
  count integer not null check (count between 0 and 999999),
  deleted boolean not null default false,
  unique (owner_id, date, name_key)
);

alter table public.alencar_checker_productivity enable row level security;
revoke all on public.alencar_checker_productivity from public, anon, authenticated;
grant select, insert, update on public.alencar_checker_productivity to authenticated;

create policy checker_productivity_owner on public.alencar_checker_productivity
  for all to authenticated
  using ((select auth.uid()) = owner_id and (select auth.jwt()) ->> 'email' in ('admin@alencarlog.com.br', 'admin1@alencarlog.com.br'))
  with check ((select auth.uid()) = owner_id and (select auth.jwt()) ->> 'email' in ('admin@alencarlog.com.br', 'admin1@alencarlog.com.br'));

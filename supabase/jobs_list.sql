-- Run in Supabase → SQL Editor (once per project).
-- Shared job list for the whole team (single-tenant). Tighten RLS when you add real auth.

create table if not exists public.jobs_list (
  id smallint primary key default 1,
  jobs jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint jobs_list_singleton check (id = 1)
);

alter table public.jobs_list enable row level security;

-- Open access for anon key (suitable only for internal pilots). Replace with auth-based policies for production.
create policy "jobs_list_anon_all"
  on public.jobs_list
  for all
  using (true)
  with check (true);

-- Optional: expose to Supabase Realtime later instead of polling:
-- alter publication supabase_realtime add table public.jobs_list;

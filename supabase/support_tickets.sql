-- Run in Supabase → SQL Editor (once per project).
-- Shared technical support / change-request log for the operations team.
-- Same RLS style as jobs_list — tighten before production.

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique,
  category text not null check (category in ('technical', 'change_request')),
  reporter_name text not null default '',
  reporter_email text not null default '',
  reporter_company text not null default '',
  description text not null,
  screenshot_data_url text,
  page_url text,
  created_at timestamptz not null default now(),
  resolved boolean not null default false,
  resolved_at timestamptz,
  resolved_note text
);

create index if not exists support_tickets_created_at_idx on public.support_tickets (created_at desc);

alter table public.support_tickets enable row level security;

create policy "support_tickets_anon_all"
  on public.support_tickets
  for all
  using (true)
  with check (true);

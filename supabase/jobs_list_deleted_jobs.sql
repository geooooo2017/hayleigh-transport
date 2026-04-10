-- Run once in Supabase SQL Editor if `jobs_list` already exists (adds soft-delete bin column).
alter table public.jobs_list
  add column if not exists deleted_jobs jsonb not null default '[]'::jsonb;

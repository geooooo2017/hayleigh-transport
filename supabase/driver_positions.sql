-- Run in Supabase SQL Editor after jobs_list.sql.
-- Stores last known GPS fix per driver (driver_key = vehicle + job ids; see app driverPositionsApi).

create table if not exists public.driver_positions (
  driver_key text primary key,
  driver_name text not null,
  vehicle_registration text not null,
  job_ids bigint[] not null default array[]::bigint[],
  lat double precision not null,
  lng double precision not null,
  updated_at timestamptz not null default now()
);

create index if not exists driver_positions_updated_at_idx on public.driver_positions (updated_at desc);

alter table public.driver_positions enable row level security;

-- Safe to re-run: policy name must be unique; plain CREATE POLICY fails if it already exists.
drop policy if exists "driver_positions_anon_all" on public.driver_positions;

create policy "driver_positions_anon_all"
  on public.driver_positions
  for all
  using (true)
  with check (true);

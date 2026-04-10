-- Run in Supabase SQL Editor if you already created driver_positions (driver_positions.sql).
-- Links each GPS row to the job(s) the driver signed into so Live Tracking can match on registration + job number only.

alter table public.driver_positions
  add column if not exists job_ids bigint[] not null default array[]::bigint[];

comment on column public.driver_positions.job_ids is
  'Supabase job row ids from driver sign-in; paired with vehicle_registration for map matching.';

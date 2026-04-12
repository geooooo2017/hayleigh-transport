import { migrateJobs } from "./jobAddress";
import type { DriverPortalActivityEntry, DriverPortalActivityKind, Job } from "../types";
import { getSupabase } from "./supabase";

const MAX_ENTRIES = 100;

function readLocalJobsArray(): Job[] {
  try {
    const raw = localStorage.getItem("jobs");
    if (raw == null) return [];
    const parsed = JSON.parse(raw) as unknown;
    return migrateJobs(Array.isArray(parsed) ? (parsed as Job[]) : []);
  } catch {
    return [];
  }
}

function writeLocalJobsArray(jobs: Job[]) {
  try {
    localStorage.setItem("jobs", JSON.stringify(jobs));
  } catch {
    /* quota */
  }
}

function appendToJob(job: Job, entry: DriverPortalActivityEntry): Job {
  const prev = job.driverPortalActivity ?? [];
  return {
    ...job,
    driverPortalActivity: [...prev, entry].slice(-MAX_ENTRIES),
  };
}

/**
 * Appends the same activity entry to each target job (driver session jobs).
 * `allowedJobIds` must include every target (same guard as other driver patches).
 */
export async function appendDriverPortalActivity(opts: {
  targetJobIds: number[];
  allowedJobIds: number[];
  vehicleReg: string;
  driverName?: string;
  kind: DriverPortalActivityKind;
  detail?: string;
  at?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const entry: DriverPortalActivityEntry = {
    at: opts.at ?? new Date().toISOString(),
    kind: opts.kind,
    vehicleReg: opts.vehicleReg.trim(),
    ...(opts.driverName?.trim() ? { driverName: opts.driverName.trim() } : {}),
    ...(opts.detail?.trim() ? { detail: opts.detail.trim().slice(0, 500) } : {}),
  };

  const targets = [...new Set(opts.targetJobIds)].filter((id) => opts.allowedJobIds.includes(id));
  if (targets.length === 0) return { ok: false, error: "No valid jobs to log." };

  const patchJobsArray = (jobs: Job[]): { next: Job[]; ok: true } | { ok: false } => {
    const next = [...jobs];
    for (const id of targets) {
      const idx = next.findIndex((j) => j.id === id);
      if (idx === -1) return { ok: false };
      next[idx] = appendToJob(next[idx], entry);
    }
    return { next, ok: true };
  };

  const supabase = getSupabase();

  if (!supabase) {
    const parsed = patchJobsArray(readLocalJobsArray());
    if (!parsed.ok) return { ok: false, error: "Job not found." };
    writeLocalJobsArray(parsed.next);
    return { ok: true };
  }

  const { data, error } = await supabase.from("jobs_list").select("jobs, deleted_jobs").eq("id", 1).maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data?.jobs) return { ok: false, error: "No jobs data in cloud." };

  const jobs = migrateJobs(data.jobs as Job[]);
  const parsed = patchJobsArray(jobs);
  if (!parsed.ok) return { ok: false, error: "Job not found." };
  const { next } = parsed;

  const { error: upErr } = await supabase.from("jobs_list").upsert(
    {
      id: 1,
      jobs: next,
      deleted_jobs: data.deleted_jobs ?? [],
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
  if (upErr) return { ok: false, error: upErr.message };
  return { ok: true };
}

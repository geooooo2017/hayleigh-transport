import { migrateJobs } from "./jobAddress";
import type { Job, PendingDriverAllocationRequest } from "../types";
import { getSupabase } from "./supabase";

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

/** Driver login: mark jobs that need truck plates assigned by the office. */
export async function patchPendingDriverAllocationRequests(opts: {
  updates: Array<{ jobId: number; request: PendingDriverAllocationRequest }>;
}): Promise<{ ok: boolean; error?: string }> {
  if (opts.updates.length === 0) return { ok: true };

  const patchJobsArray = (jobs: Job[]): { next: Job[]; ok: true } | { ok: false } => {
    const next = [...jobs];
    for (const u of opts.updates) {
      const idx = next.findIndex((j) => j.id === u.jobId);
      if (idx === -1) return { ok: false };
      next[idx] = {
        ...next[idx],
        pendingDriverAllocationRequest: u.request,
      };
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

import { migrateJobs } from "./jobAddress";
import type { DriverReportedIssue, Job } from "../types";
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

/**
 * Driver submits or clears an on-the-road issue. Patches shared `jobs_list` / localStorage.
 */
export async function patchJobDriverReportedIssue(opts: {
  jobId: number;
  allowedJobIds: number[];
  issue: DriverReportedIssue | null;
}): Promise<{ ok: boolean; error?: string; localOnly?: boolean }> {
  if (!opts.allowedJobIds.includes(opts.jobId)) {
    return { ok: false, error: "This job is not in your session." };
  }

  const supabase = getSupabase();

  const patchJobsArray = (jobs: Job[]): { next: Job[]; ok: true } | { ok: false } => {
    const idx = jobs.findIndex((j) => j.id === opts.jobId);
    if (idx === -1) return { ok: false };
    const next = [...jobs];
    next[idx] = {
      ...next[idx],
      driverReportedIssue: opts.issue ?? undefined,
    };
    return { next, ok: true };
  };

  if (!supabase) {
    const parsed = patchJobsArray(readLocalJobsArray());
    if (!parsed.ok) return { ok: false, error: "Job not found." };
    writeLocalJobsArray(parsed.next);
    return { ok: true, localOnly: true };
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

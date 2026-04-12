import { migrateJobs } from "./jobAddress";
import { getSupabase } from "./supabase";
import type { Job } from "../types";

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
 * Driver sets expected arrival at delivery. Patches one job in shared storage (Supabase jobs_list or localStorage).
 * `allowedJobIds` must be the signed-in driver's job ids (prevents editing other jobs).
 */
export async function patchJobDriverDeliveryEta(opts: {
  jobId: number;
  allowedJobIds: number[];
  /** ISO 8601 string, or null to clear */
  etaIso: string | null;
}): Promise<{ ok: boolean; error?: string; localOnly?: boolean }> {
  if (!opts.allowedJobIds.includes(opts.jobId)) {
    return { ok: false, error: "This job is not in your session." };
  }

  const supabase = getSupabase();
  if (!supabase) {
    const jobs = readLocalJobsArray();
    const idx = jobs.findIndex((j) => j.id === opts.jobId);
    if (idx === -1) return { ok: false, error: "Job not found." };
    const next = [...jobs];
    const patch: Partial<Job> = {
      driverDeliveryEtaUpdatedAt: new Date().toISOString(),
    };
    if (opts.etaIso == null) {
      patch.driverDeliveryEtaAt = undefined;
    } else {
      const d = new Date(opts.etaIso);
      if (Number.isNaN(d.getTime())) return { ok: false, error: "Invalid date/time." };
      patch.driverDeliveryEtaAt = d.toISOString();
    }
    next[idx] = { ...next[idx], ...patch };
    writeLocalJobsArray(next);
    return { ok: true, localOnly: true };
  }

  const { data, error } = await supabase.from("jobs_list").select("jobs, deleted_jobs").eq("id", 1).maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data?.jobs) return { ok: false, error: "No jobs data in cloud." };

  const jobs = migrateJobs(data.jobs as Job[]);
  const idx = jobs.findIndex((j) => j.id === opts.jobId);
  if (idx === -1) return { ok: false, error: "Job not found." };

  const next = [...jobs];
  const patch: Partial<Job> = {
    driverDeliveryEtaUpdatedAt: new Date().toISOString(),
  };
  if (opts.etaIso == null) {
    patch.driverDeliveryEtaAt = undefined;
  } else {
    const d = new Date(opts.etaIso);
    if (Number.isNaN(d.getTime())) return { ok: false, error: "Invalid date/time." };
    patch.driverDeliveryEtaAt = d.toISOString();
  }
  next[idx] = { ...next[idx], ...patch };

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

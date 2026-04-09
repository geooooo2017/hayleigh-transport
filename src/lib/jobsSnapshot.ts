import { migrateJobs } from "./jobAddress";
import { getSupabase } from "./supabase";
import type { Job } from "../types";

function readLocalJobs(): Job[] {
  try {
    const raw = localStorage.getItem("jobs");
    if (raw == null) return [];
    const parsed = JSON.parse(raw) as unknown;
    return migrateJobs(Array.isArray(parsed) ? (parsed as Job[]) : []);
  } catch {
    return [];
  }
}

/** Jobs list for driver login / refresh (Supabase when configured, else this browser's localStorage). */
export async function fetchJobsSnapshot(): Promise<Job[]> {
  const supabase = getSupabase();
  if (!supabase) return readLocalJobs();
  const { data, error } = await supabase.from("jobs_list").select("jobs").eq("id", 1).maybeSingle();
  if (error || !data?.jobs) return [];
  return migrateJobs(data.jobs as Job[]);
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { DeletedJobEntry } from "../lib/deletedJobsBin";
import { parseDeletedBin, purgeExpiredDeletedBin } from "../lib/deletedJobsBin";
import { migrateJobs } from "../lib/jobAddress";
import { MOBILE_TEST_JOB_ID } from "../lib/mobileTrackingTestProject";
import { getSupabase } from "../lib/supabase";
import type { Job } from "../types";

const LOCAL_KEY_JOBS = "jobs";
const LOCAL_KEY_DELETED = "jobs_deleted_bin";

function stripRetiredDemoJobs(jobs: Job[]): Job[] {
  return jobs.filter((j) => j.id !== MOBILE_TEST_JOB_ID);
}

function readLocalJobs(): Job[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY_JOBS);
    if (raw == null) return [];
    const parsed = JSON.parse(raw) as unknown;
    return stripRetiredDemoJobs(migrateJobs(Array.isArray(parsed) ? (parsed as Job[]) : []));
  } catch {
    return [];
  }
}

function readLocalDeletedBin(): DeletedJobEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY_DELETED);
    if (raw == null) return [];
    const parsed = JSON.parse(raw) as unknown;
    return parseDeletedBin(parsed);
  } catch {
    return [];
  }
}

function writeLocalJobs(jobs: Job[]) {
  try {
    localStorage.setItem(LOCAL_KEY_JOBS, JSON.stringify(jobs));
  } catch {
    /* quota */
  }
}

function writeLocalDeletedBin(entries: DeletedJobEntry[]) {
  try {
    localStorage.setItem(LOCAL_KEY_DELETED, JSON.stringify(entries));
  } catch {
    /* quota */
  }
}

type SyncMode = "local" | "cloud";

type JobsContextValue = {
  jobs: Job[];
  setJobs: Dispatch<SetStateAction<Job[]>>;
  deletedBin: DeletedJobEntry[];
  softDeleteJob: (job: Job, deletedBy?: string) => void;
  restoreJobFromBin: (jobId: number) => void;
  permanentlyRemoveFromBin: (jobId: number) => void;
  syncMode: SyncMode;
  cloudLoading: boolean;
  cloudError: string | null;
};

const JobsContext = createContext<JobsContextValue | null>(null);

export function JobsProvider({ children }: { children: React.ReactNode }) {
  const supabase = getSupabase();
  const syncMode: SyncMode = supabase ? "cloud" : "local";

  const [jobs, setJobsState] = useState<Job[]>(() => (supabase ? [] : readLocalJobs()));
  const [deletedBin, setDeletedBinState] = useState<DeletedJobEntry[]>(() => (supabase ? [] : readLocalDeletedBin()));
  const [cloudLoading, setCloudLoading] = useState(Boolean(supabase));
  const [cloudError, setCloudError] = useState<string | null>(null);

  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;
  const deletedBinRef = useRef(deletedBin);
  deletedBinRef.current = deletedBin;

  const dirtyRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bootstrappedRef = useRef(false);

  const persistCloud = useCallback(
    (nextJobs: Job[], nextBin: DeletedJobEntry[]) => {
      if (!supabase) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        saveTimerRef.current = null;
        const { error } = await supabase.from("jobs_list").upsert(
          {
            id: 1,
            jobs: nextJobs,
            deleted_jobs: nextBin,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
        if (error) {
          setCloudError(error.message);
        } else {
          setCloudError(null);
          dirtyRef.current = false;
        }
      }, 400);
    },
    [supabase]
  );

  useEffect(() => {
    if (supabase) return;
    writeLocalJobs(jobs);
    writeLocalDeletedBin(deletedBin);
  }, [jobs, deletedBin, supabase]);

  useEffect(() => {
    if (!supabase) return;
    if (cloudLoading) return;
    if (!bootstrappedRef.current) return;
    dirtyRef.current = true;
    persistCloud(jobs, deletedBin);
  }, [jobs, deletedBin, supabase, cloudLoading, persistCloud]);

  useEffect(() => {
    const id = setInterval(() => {
      setDeletedBinState((p) => purgeExpiredDeletedBin(p));
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!supabase) return;

    let cancelled = false;

    const bootstrap = async () => {
      try {
        const { data, error } = await supabase.from("jobs_list").select("jobs, deleted_jobs").eq("id", 1).maybeSingle();
        if (cancelled) return;
        if (error) throw error;

        if (data == null) {
          const initialJobs = readLocalJobs();
          const initialBin = readLocalDeletedBin();
          const { error: insErr } = await supabase
            .from("jobs_list")
            .insert({ id: 1, jobs: initialJobs, deleted_jobs: initialBin });
          if (insErr && !/duplicate|unique/i.test(insErr.message)) throw insErr;
          if (insErr && /duplicate|unique/i.test(insErr.message)) {
            const { data: row, error: fetchErr } = await supabase
              .from("jobs_list")
              .select("jobs, deleted_jobs")
              .eq("id", 1)
              .single();
            if (fetchErr) throw fetchErr;
            if (!cancelled && row) {
              setJobsState(stripRetiredDemoJobs(migrateJobs((row.jobs as Job[]) ?? [])));
              setDeletedBinState(parseDeletedBin(row.deleted_jobs));
            }
            bootstrappedRef.current = true;
            return;
          }
          if (!cancelled) {
            setJobsState(initialJobs);
            setDeletedBinState(initialBin);
          }
          bootstrappedRef.current = true;
          return;
        }

        let serverJobs = stripRetiredDemoJobs(migrateJobs((data.jobs as Job[]) ?? []));
        let serverBin = parseDeletedBin(data.deleted_jobs);

        if (serverJobs.length === 0) {
          const local = readLocalJobs();
          if (local.length > 0) {
            const { error: upErr } = await supabase.from("jobs_list").upsert(
              { id: 1, jobs: local, deleted_jobs: serverBin, updated_at: new Date().toISOString() },
              { onConflict: "id" }
            );
            if (upErr) throw upErr;
            if (!cancelled) {
              setJobsState(local);
              setDeletedBinState(serverBin);
            }
            bootstrappedRef.current = true;
            return;
          }
        }
        if (!cancelled) {
          setJobsState(serverJobs);
          setDeletedBinState(serverBin);
        }
        bootstrappedRef.current = true;
      } catch (e) {
        if (!cancelled) setCloudError(e instanceof Error ? e.message : "Could not load jobs");
        bootstrappedRef.current = true;
      } finally {
        if (!cancelled) setCloudLoading(false);
      }
    };

    void bootstrap();

    const poll = setInterval(async () => {
      if (dirtyRef.current || cancelled) return;
      const { data, error } = await supabase.from("jobs_list").select("jobs, deleted_jobs").eq("id", 1).maybeSingle();
      if (cancelled || error || !data?.jobs) return;
      const remoteJobs = data.jobs as Job[];
      const remoteBin = data.deleted_jobs;
      if (
        JSON.stringify(remoteJobs) !== JSON.stringify(jobsRef.current) ||
        JSON.stringify(remoteBin ?? []) !== JSON.stringify(deletedBinRef.current)
      ) {
        try {
          setJobsState(stripRetiredDemoJobs(migrateJobs(remoteJobs)));
          setDeletedBinState(parseDeletedBin(remoteBin));
        } catch (err) {
          console.error("[JobsProvider] poll migrate failed", err);
        }
      }
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(poll);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [supabase]);

  const setJobs = useCallback((action: SetStateAction<Job[]>) => {
    setJobsState((prev) => (typeof action === "function" ? (action as (p: Job[]) => Job[])(prev) : action));
  }, []);

  const softDeleteJob = useCallback((job: Job, deletedBy?: string) => {
    const entry: DeletedJobEntry = {
      job: { ...job },
      deletedAt: new Date().toISOString(),
      deletedBy,
    };
    setDeletedBinState((prev) => {
      const purged = purgeExpiredDeletedBin(prev.filter((e) => e.job.id !== job.id));
      return [...purged, entry];
    });
    setJobsState((prev) => prev.filter((j) => j.id !== job.id));
  }, []);

  const restoreJobFromBin = useCallback((jobId: number) => {
    const hit = deletedBinRef.current.find((e) => e.job.id === jobId);
    if (!hit) return;
    setDeletedBinState((prev) => purgeExpiredDeletedBin(prev.filter((e) => e.job.id !== jobId)));
    setJobsState((prev) => (prev.some((j) => j.id === hit.job.id) ? prev : [hit.job, ...prev]));
  }, []);

  const permanentlyRemoveFromBin = useCallback((jobId: number) => {
    setDeletedBinState((prev) => purgeExpiredDeletedBin(prev.filter((e) => e.job.id !== jobId)));
  }, []);

  const value = useMemo(
    () => ({
      jobs,
      setJobs,
      deletedBin,
      softDeleteJob,
      restoreJobFromBin,
      permanentlyRemoveFromBin,
      syncMode,
      cloudLoading,
      cloudError,
    }),
    [jobs, setJobs, deletedBin, softDeleteJob, restoreJobFromBin, permanentlyRemoveFromBin, syncMode, cloudLoading, cloudError]
  );

  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
}

export function useJobs(): [Job[], Dispatch<SetStateAction<Job[]>>] {
  const ctx = useContext(JobsContext);
  if (!ctx) throw new Error("useJobs must be used within JobsProvider");
  return [ctx.jobs, ctx.setJobs];
}

export function useJobRecycleBin() {
  const ctx = useContext(JobsContext);
  if (!ctx) throw new Error("useJobRecycleBin must be used within JobsProvider");
  const { deletedBin, softDeleteJob, restoreJobFromBin, permanentlyRemoveFromBin } = ctx;
  return { deletedBin, softDeleteJob, restoreJobFromBin, permanentlyRemoveFromBin };
}

export function useJobsSync(): Pick<JobsContextValue, "syncMode" | "cloudLoading" | "cloudError"> {
  const ctx = useContext(JobsContext);
  if (!ctx) throw new Error("useJobsSync must be used within JobsProvider");
  const { syncMode, cloudLoading, cloudError } = ctx;
  return { syncMode, cloudLoading, cloudError };
}

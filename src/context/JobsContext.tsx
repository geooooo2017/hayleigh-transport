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
import { getSupabase } from "../lib/supabase";
import type { Job } from "../types";

const LOCAL_KEY = "jobs";

function readLocalJobs(): Job[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw == null) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as Job[]) : [];
  } catch {
    return [];
  }
}

function writeLocalJobs(jobs: Job[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(jobs));
  } catch {
    /* ignore quota */
  }
}

type SyncMode = "local" | "cloud";

type JobsContextValue = {
  jobs: Job[];
  setJobs: Dispatch<SetStateAction<Job[]>>;
  syncMode: SyncMode;
  cloudLoading: boolean;
  cloudError: string | null;
};

const JobsContext = createContext<JobsContextValue | null>(null);

export function JobsProvider({ children }: { children: React.ReactNode }) {
  const supabase = getSupabase();
  const syncMode: SyncMode = supabase ? "cloud" : "local";

  const [jobs, setJobsState] = useState<Job[]>(() => (supabase ? [] : readLocalJobs()));
  const [cloudLoading, setCloudLoading] = useState(Boolean(supabase));
  const [cloudError, setCloudError] = useState<string | null>(null);

  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;

  const dirtyRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistCloud = useCallback(
    (next: Job[]) => {
      if (!supabase) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        saveTimerRef.current = null;
        const { error } = await supabase.from("jobs_list").upsert(
          { id: 1, jobs: next, updated_at: new Date().toISOString() },
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
    if (!supabase) return;

    let cancelled = false;

    const bootstrap = async () => {
      try {
        const { data, error } = await supabase.from("jobs_list").select("jobs").eq("id", 1).maybeSingle();
        if (cancelled) return;
        if (error) throw error;

        if (data == null) {
          const initial = readLocalJobs();
          const { error: insErr } = await supabase.from("jobs_list").insert({ id: 1, jobs: initial });
          if (insErr && !/duplicate|unique/i.test(insErr.message)) throw insErr;
          if (insErr && /duplicate|unique/i.test(insErr.message)) {
            const { data: row, error: fetchErr } = await supabase.from("jobs_list").select("jobs").eq("id", 1).single();
            if (fetchErr) throw fetchErr;
            if (!cancelled && row?.jobs) setJobsState(row.jobs as Job[]);
            return;
          }
          if (!cancelled) setJobsState(initial);
          return;
        }

        const serverJobs = (data.jobs as Job[]) ?? [];
        if (serverJobs.length === 0) {
          const local = readLocalJobs();
          if (local.length > 0) {
            const { error: upErr } = await supabase.from("jobs_list").upsert(
              { id: 1, jobs: local, updated_at: new Date().toISOString() },
              { onConflict: "id" }
            );
            if (upErr) throw upErr;
            if (!cancelled) setJobsState(local);
            return;
          }
        }
        if (!cancelled) setJobsState(serverJobs);
      } catch (e) {
        if (!cancelled) setCloudError(e instanceof Error ? e.message : "Could not load jobs");
      } finally {
        if (!cancelled) setCloudLoading(false);
      }
    };

    void bootstrap();

    const poll = setInterval(async () => {
      if (dirtyRef.current || cancelled) return;
      const { data, error } = await supabase.from("jobs_list").select("jobs").eq("id", 1).maybeSingle();
      if (cancelled || error || !data?.jobs) return;
      const remote = data.jobs as Job[];
      if (JSON.stringify(remote) !== JSON.stringify(jobsRef.current)) {
        setJobsState(remote);
      }
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(poll);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [supabase]);

  const setJobs = useCallback(
    (action: SetStateAction<Job[]>) => {
      setJobsState((prev) => {
        const next = typeof action === "function" ? (action as (p: Job[]) => Job[])(prev) : action;
        if (!supabase) {
          writeLocalJobs(next);
        } else {
          dirtyRef.current = true;
          persistCloud(next);
        }
        return next;
      });
    },
    [supabase, persistCloud]
  );

  const value = useMemo(
    () => ({ jobs, setJobs, syncMode, cloudLoading, cloudError }),
    [jobs, setJobs, syncMode, cloudLoading, cloudError]
  );

  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
}

export function useJobs(): [Job[], Dispatch<SetStateAction<Job[]>>] {
  const ctx = useContext(JobsContext);
  if (!ctx) throw new Error("useJobs must be used within JobsProvider");
  return [ctx.jobs, ctx.setJobs];
}

export function useJobsSync(): Pick<JobsContextValue, "syncMode" | "cloudLoading" | "cloudError"> {
  const ctx = useContext(JobsContext);
  if (!ctx) throw new Error("useJobsSync must be used within JobsProvider");
  const { syncMode, cloudLoading, cloudError } = ctx;
  return { syncMode, cloudLoading, cloudError };
}

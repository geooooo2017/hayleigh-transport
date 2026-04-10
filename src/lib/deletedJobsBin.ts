import type { Job } from "../types";

export const DELETED_JOBS_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

export type DeletedJobEntry = {
  job: Job;
  /** ISO timestamp when moved to bin */
  deletedAt: string;
  deletedBy?: string;
};

export function purgeExpiredDeletedBin(entries: DeletedJobEntry[], now = Date.now()): DeletedJobEntry[] {
  const next = entries.filter((e) => {
    const t = new Date(e.deletedAt).getTime();
    return Number.isFinite(t) && now - t < DELETED_JOBS_RETENTION_MS;
  });
  return next.length === entries.length ? entries : next;
}

export function daysRemainingInBin(deletedAt: string, now = Date.now()): number {
  const t = new Date(deletedAt).getTime();
  if (!Number.isFinite(t)) return 0;
  const end = t + DELETED_JOBS_RETENTION_MS;
  return Math.max(0, Math.ceil((end - now) / (24 * 60 * 60 * 1000)));
}

export function parseDeletedBin(raw: unknown): DeletedJobEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: DeletedJobEntry[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (!r.job || typeof r.job !== "object") continue;
    const deletedAt = typeof r.deletedAt === "string" ? r.deletedAt : "";
    if (!deletedAt) continue;
    out.push({
      job: r.job as Job,
      deletedAt,
      deletedBy: typeof r.deletedBy === "string" ? r.deletedBy : undefined,
    });
  }
  return purgeExpiredDeletedBin(out);
}

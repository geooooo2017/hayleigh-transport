const KEY = "ht_driver_seen_office_revision";

function readRaw(): Record<string, number> {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return {};
    const o = JSON.parse(raw) as unknown;
    return o && typeof o === "object" ? (o as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function writeRaw(next: Record<string, number>) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode */
  }
}

export function primeDriverSeenRevisions(jobs: { id: number; officeRevision?: number }[]) {
  const cur = readRaw();
  for (const j of jobs) {
    const k = String(j.id);
    if (cur[k] === undefined) {
      cur[k] = j.officeRevision ?? 0;
    }
  }
  writeRaw(cur);
}

export function detectOfficeJobUpdates(jobs: { id: number; jobNumber: string; officeRevision?: number }[]): string[] {
  const cur = readRaw();
  const updated: string[] = [];
  const next = { ...cur };
  for (const j of jobs) {
    const k = String(j.id);
    const rev = j.officeRevision ?? 0;
    const seen = next[k] ?? 0;
    if (rev > seen) {
      updated.push(j.jobNumber);
      next[k] = rev;
    }
  }
  if (updated.length) writeRaw(next);
  return updated;
}

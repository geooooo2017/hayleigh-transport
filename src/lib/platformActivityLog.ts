/** Persisted “recent activity” for the operations bell (per browser). */

export type ActivityEntry = {
  id: string;
  at: string;
  title: string;
  detail?: string;
  href?: string;
  tone: "success" | "info" | "warning";
};

const STORAGE_KEY = "ht_platform_activity_v1";
const MAX = 35;

const listeners = new Set<() => void>();

/** Stable empty snapshot — useSyncExternalStore requires referential stability when data unchanged. */
const EMPTY_ACTIVITY: ActivityEntry[] = [];

let cachedSnapshot: ActivityEntry[] = EMPTY_ACTIVITY;
/** Last raw string from localStorage that `cachedSnapshot` was derived from. */
let cachedRawKey: string | null = "\u0000";

function parseActivityList(raw: string | null): ActivityEntry[] {
  if (raw == null || raw === "") return EMPTY_ACTIVITY;
  try {
    const p = JSON.parse(raw) as unknown;
    if (!Array.isArray(p)) return EMPTY_ACTIVITY;
    const filtered = p.filter(
      (x) =>
        x &&
        typeof x === "object" &&
        typeof (x as ActivityEntry).id === "string" &&
        typeof (x as ActivityEntry).at === "string" &&
        typeof (x as ActivityEntry).title === "string"
    ) as ActivityEntry[];
    return filtered.length === 0 ? EMPTY_ACTIVITY : filtered;
  } catch {
    return EMPTY_ACTIVITY;
  }
}

export function subscribeActivity(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function emit() {
  listeners.forEach((l) => l());
}

/**
 * Snapshot for useSyncExternalStore: same array reference until localStorage value changes.
 */
export function readPlatformActivity(): ActivityEntry[] {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return cachedSnapshot;
  }
  if (raw === cachedRawKey) return cachedSnapshot;
  cachedRawKey = raw;
  cachedSnapshot = parseActivityList(raw);
  return cachedSnapshot;
}

/** Mutable copy for writes (never mutate cachedSnapshot). */
function readRawMutable(): ActivityEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const base = parseActivityList(raw);
    return base.length === 0 ? [] : [...base];
  } catch {
    return [];
  }
}

function writeRaw(entries: ActivityEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX)));
    cachedRawKey = localStorage.getItem(STORAGE_KEY);
    cachedSnapshot = parseActivityList(cachedRawKey);
  } catch {
    /* quota */
  }
}

export function clearPlatformActivity(): void {
  writeRaw([]);
  emit();
}

export function appendPlatformActivity(entry: Omit<ActivityEntry, "id" | "at"> & { id?: string; at?: string }): void {
  const full: ActivityEntry = {
    id: entry.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    at: entry.at ?? new Date().toISOString(),
    title: entry.title,
    detail: entry.detail,
    href: entry.href,
    tone: entry.tone,
  };
  const next = [full, ...readRawMutable()].slice(0, MAX);
  writeRaw(next);
  emit();
}

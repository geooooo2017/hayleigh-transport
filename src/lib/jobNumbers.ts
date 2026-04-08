import type { User } from "../types";

const STORAGE_KEY = "jobCounters";

type Counters = Record<string, number>;

const defaultCounters: Counters = {
  DT: 10015,
  TT: 10013,
  DSO: 10125,
  TSO: 10127,
  DO: 10126,
  TO: 10009,
};

function readCounters(): Counters {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultCounters };
    return { ...defaultCounters, ...JSON.parse(raw) };
  } catch {
    return { ...defaultCounters };
  }
}

function writeCounters(c: Counters) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
}

/** Next job number (increments counter). */
export function allocateJobNumber(user: User, routeType: "domestic" | "international"): string {
  const prefix = routeType === "domestic" ? user.domesticRef : user.internationalRef;
  const counters = readCounters();
  const n = (counters[prefix] ?? 0) + 1;
  counters[prefix] = n;
  writeCounters(counters);
  return `${prefix}${String(n).padStart(5, "0")}`;
}

/** Preview without increment (for form display). */
export function previewJobNumber(user: User, routeType: "domestic" | "international"): string {
  const prefix = routeType === "domestic" ? user.domesticRef : user.internationalRef;
  const counters = readCounters();
  const n = (counters[prefix] ?? 0) + 1;
  return `${prefix}${String(n).padStart(5, "0")}`;
}

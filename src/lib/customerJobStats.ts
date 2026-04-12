import type { Customer, Job } from "../types";
import { jobNetExVat } from "./jobNetAmount";

/** Match jobs to a CRM customer by company name or, when both set, customer email on the job. */
export function jobBelongsToCustomer(job: Job, customer: Customer): boolean {
  const jn = job.customerName.trim().toLowerCase();
  const cn = customer.name.trim().toLowerCase();
  if (jn && cn && jn === cn) return true;
  const je = job.customerEmail?.trim().toLowerCase();
  const ce = customer.email.trim().toLowerCase();
  if (je && ce && je === ce) return true;
  return false;
}

export type CustomerJobStats = {
  jobs: Job[];
  jobCount: number;
  openCount: number;
  completedCount: number;
  netExVatAll: number;
  netExVatCompleted: number;
  /** Latest collection or delivery date among matched jobs (ISO), or null. */
  lastActivityIso: string | null;
};

function jobActivityTime(j: Job): number {
  const d = new Date(j.deliveryDate || j.collectionDate || j.createdAt).getTime();
  return Number.isNaN(d) ? 0 : d;
}

export function computeCustomerJobStats(customer: Customer, allJobs: Job[]): CustomerJobStats {
  const jobs = allJobs.filter((j) => jobBelongsToCustomer(j, customer));
  let netExVatAll = 0;
  let netExVatCompleted = 0;
  let openCount = 0;
  let completedCount = 0;
  let lastMs = 0;
  let lastIso: string | null = null;

  for (const j of jobs) {
    const net = jobNetExVat(j);
    netExVatAll += net;
    if (j.status === "completed") {
      completedCount += 1;
      netExVatCompleted += net;
    } else {
      openCount += 1;
    }
    const t = jobActivityTime(j);
    if (t >= lastMs) {
      lastMs = t;
      lastIso = j.deliveryDate || j.collectionDate || j.createdAt || null;
    }
  }

  return {
    jobs: jobs.sort((a, b) => jobActivityTime(b) - jobActivityTime(a)),
    jobCount: jobs.length,
    openCount,
    completedCount,
    netExVatAll,
    netExVatCompleted,
    lastActivityIso: lastIso,
  };
}

export type UnmatchedCustomerGroup = {
  key: string;
  displayName: string;
  jobs: Job[];
};

/** Jobs whose customer does not match any saved customer (by name or email). */
export function groupJobsNotMatchedToCustomers(jobs: Job[], customers: Customer[]): UnmatchedCustomerGroup[] {
  const map = new Map<string, { displayName: string; jobs: Job[] }>();
  for (const j of jobs) {
    if (customers.some((c) => jobBelongsToCustomer(j, c))) continue;
    const raw = j.customerName.trim();
    const key = raw.toLowerCase() || "_empty";
    const displayName = raw || "(No customer name on job)";
    const cur = map.get(key) ?? { displayName, jobs: [] };
    cur.jobs.push(j);
    map.set(key, cur);
  }
  return [...map.entries()]
    .map(([key, v]) => ({ key, displayName: v.displayName, jobs: v.jobs }))
    .sort((a, b) => b.jobs.length - a.jobs.length);
}

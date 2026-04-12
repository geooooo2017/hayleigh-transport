import type { Job, SupplierInvoiceLine } from "../types";

/** Sales / customer invoice reference we expect supplier lines to use for this job. */
export function expectedCustomerInvoiceRef(job: Job): string {
  return job.customerInvoiceRef?.trim() || job.jobNumber;
}

function normRef(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** True when the line’s linked customer ref matches this job’s expected sales ref (case/spacing insensitive). */
export function supplierLineMatchesCustomerInvoice(line: SupplierInvoiceLine, job: Job): boolean {
  const linked = (line.linkedCustomerInvoiceRef ?? "").trim();
  if (!linked) return false;
  return normRef(linked) === normRef(expectedCustomerInvoiceRef(job));
}

export function parseJobCollectionDateMs(job: Job): number | null {
  const h = job.collectionDate?.trim().slice(0, 10);
  if (!h || h.length < 10) return null;
  const t = new Date(`${h}T12:00:00`).getTime();
  return Number.isFinite(t) ? t : null;
}

export function jobInCalendarMonth(job: Job, year: number, monthIndex0: number): boolean {
  const t = parseJobCollectionDateMs(job);
  if (t == null) return false;
  const d = new Date(t);
  return d.getFullYear() === year && d.getMonth() === monthIndex0;
}

export function jobInCalendarYear(job: Job, year: number): boolean {
  const t = parseJobCollectionDateMs(job);
  if (t == null) return false;
  return new Date(t).getFullYear() === year;
}

export function jobInCalendarQuarter(job: Job, year: number, quarter: 1 | 2 | 3 | 4): boolean {
  const t = parseJobCollectionDateMs(job);
  if (t == null) return false;
  const d = new Date(t);
  if (d.getFullYear() !== year) return false;
  const q = Math.floor(d.getMonth() / 3) + 1;
  return q === quarter;
}

export type SupplierLineMatchRow = {
  job: Job;
  line: SupplierInvoiceLine;
  matched: boolean;
};

export type SupplierMatchAggregate = {
  matched: SupplierLineMatchRow[];
  unmatched: SupplierLineMatchRow[];
  matchedAmount: number;
  unmatchedAmount: number;
  matchedLineCount: number;
  unmatchedLineCount: number;
  jobsTouched: number;
};

/**
 * Supplier invoice lines with positive amount in the given jobs after optional job filter.
 */
export function aggregateSupplierLineMatching(
  jobs: Job[],
  jobPredicate: (job: Job) => boolean,
): SupplierMatchAggregate {
  const matched: SupplierLineMatchRow[] = [];
  const unmatched: SupplierLineMatchRow[] = [];
  const jobIds = new Set<number>();

  for (const job of jobs) {
    if (!jobPredicate(job)) continue;
    const lines = job.supplierInvoiceLines;
    if (!lines?.length) continue;
    let touched = false;
    for (const line of lines) {
      const amt = Number(line.amountExVat) || 0;
      if (amt <= 0) continue;
      touched = true;
      const ok = supplierLineMatchesCustomerInvoice(line, job);
      const row: SupplierLineMatchRow = { job, line, matched: ok };
      if (ok) matched.push(row);
      else unmatched.push(row);
    }
    if (touched) jobIds.add(job.id);
  }

  const matchedAmount = matched.reduce((s, r) => s + (Number(r.line.amountExVat) || 0), 0);
  const unmatchedAmount = unmatched.reduce((s, r) => s + (Number(r.line.amountExVat) || 0), 0);

  return {
    matched,
    unmatched,
    matchedAmount,
    unmatchedAmount,
    matchedLineCount: matched.length,
    unmatchedLineCount: unmatched.length,
    jobsTouched: jobIds.size,
  };
}

/** Month-by-month aggregates for a calendar year (collection date). */
export function monthlySupplierMatchBreakdownForYear(
  jobs: Job[],
  year: number,
): { monthIndex: number; label: string; agg: SupplierMatchAggregate }[] {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const out: { monthIndex: number; label: string; agg: SupplierMatchAggregate }[] = [];
  for (let m = 0; m < 12; m++) {
    const agg = aggregateSupplierLineMatching(jobs, (j) => jobInCalendarMonth(j, year, m));
    out.push({ monthIndex: m, label: `${monthNames[m]} ${year}`, agg });
  }
  return out;
}

/** The three calendar months inside a quarter (collection date). */
export function monthlySupplierMatchBreakdownForQuarter(
  jobs: Job[],
  year: number,
  quarter: 1 | 2 | 3 | 4,
): { monthIndex: number; label: string; agg: SupplierMatchAggregate }[] {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const start = (quarter - 1) * 3;
  const out: { monthIndex: number; label: string; agg: SupplierMatchAggregate }[] = [];
  for (let i = 0; i < 3; i++) {
    const m = start + i;
    const agg = aggregateSupplierLineMatching(jobs, (j) => jobInCalendarMonth(j, year, m));
    out.push({ monthIndex: m, label: `${monthNames[m]} ${year}`, agg });
  }
  return out;
}

/** Last N calendar months ending current month (collection date). */
export function rollingMonthlySupplierMatchBreakdown(
  jobs: Job[],
  monthCount = 12,
): { label: string; year: number; monthIndex0: number; agg: SupplierMatchAggregate }[] {
  const out: { label: string; year: number; monthIndex0: number; agg: SupplierMatchAggregate }[] = [];
  const now = new Date();
  for (let i = 0; i < monthCount; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const label = d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
    const agg = aggregateSupplierLineMatching(jobs, (j) => jobInCalendarMonth(j, y, m));
    out.push({ label, year: y, monthIndex0: m, agg });
  }
  return out;
}

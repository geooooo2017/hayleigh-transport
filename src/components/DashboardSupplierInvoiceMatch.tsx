import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Link2 } from "lucide-react";
import { Card } from "./Layout";
import { platformPath } from "../routes/paths";
import type { Job } from "../types";
import {
  aggregateSupplierLineMatching,
  expectedCustomerInvoiceRef,
  jobInCalendarMonth,
  jobInCalendarQuarter,
  jobInCalendarYear,
  monthlySupplierMatchBreakdownForQuarter,
  monthlySupplierMatchBreakdownForYear,
  rollingMonthlySupplierMatchBreakdown,
} from "../lib/supplierCustomerInvoiceMatch";

type PeriodMode = "all" | "month" | "quarter" | "year";

function fmt(n: number): string {
  return `£${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function DashboardSupplierInvoiceMatch({ jobs }: { jobs: Job[] }) {
  const [mode, setMode] = useState<PeriodMode>("month");
  const [monthVal, setMonthVal] = useState(() => new Date().toISOString().slice(0, 7));
  const [yearVal, setYearVal] = useState(() => new Date().getFullYear());
  const [quarter, setQuarter] = useState<1 | 2 | 3 | 4>(
    () => (Math.floor(new Date().getMonth() / 3) + 1) as 1 | 2 | 3 | 4,
  );

  const jobPredicate = useMemo(() => {
    if (mode === "all") return () => true;
    if (mode === "month") {
      const parts = monthVal.split("-");
      const y = parseInt(parts[0]!, 10);
      const m = parseInt(parts[1]!, 10);
      if (!Number.isFinite(y) || !Number.isFinite(m)) return () => false;
      return (j: Job) => jobInCalendarMonth(j, y, m - 1);
    }
    if (mode === "quarter") {
      return (j: Job) => jobInCalendarQuarter(j, yearVal, quarter);
    }
    if (mode === "year") {
      return (j: Job) => jobInCalendarYear(j, yearVal);
    }
    return () => true;
  }, [mode, monthVal, yearVal, quarter]);

  const agg = useMemo(() => aggregateSupplierLineMatching(jobs, jobPredicate), [jobs, jobPredicate]);

  const yearBreakdown = useMemo(() => {
    if (mode !== "year") return null;
    return monthlySupplierMatchBreakdownForYear(jobs, yearVal);
  }, [mode, yearVal, jobs]);

  const quarterBreakdown = useMemo(() => {
    if (mode !== "quarter") return null;
    return monthlySupplierMatchBreakdownForQuarter(jobs, yearVal, quarter);
  }, [mode, yearVal, quarter, jobs]);

  const rollingBreakdown = useMemo(() => {
    if (mode !== "all") return null;
    return rollingMonthlySupplierMatchBreakdown(jobs, 12);
  }, [mode, jobs]);

  const periodLabel = useMemo(() => {
    if (mode === "all") return "All time (collection dates)";
    if (mode === "month") {
      const [y, m] = monthVal.split("-").map((x) => parseInt(x, 10));
      if (!Number.isFinite(y) || !Number.isFinite(m)) return monthVal;
      return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    }
    if (mode === "quarter") return `Q${quarter} ${yearVal}`;
    return `Calendar year ${yearVal}`;
  }, [mode, monthVal, quarter, yearVal]);

  const totalLines = agg.matchedLineCount + agg.unmatchedLineCount;
  const totalAmount = agg.matchedAmount + agg.unmatchedAmount;

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-ht-border px-5 py-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-ht-navy">
          <Link2 className="text-ht-slate" size={22} aria-hidden />
          Supplier ↔ customer invoice matching
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Based on <strong>supplier invoice lines</strong> on each job: a line is <strong>matched</strong> when its linked
          customer invoice ref matches this job’s sales ref (customer invoice ref or job number). Filter by{" "}
          <strong>collection date</strong>.{" "}
          <Link className="font-medium text-ht-slate underline" to={platformPath("/supplier-invoicing")}>
            Supplier invoicing
          </Link>
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Period</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as PeriodMode)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="month">Month</option>
              <option value="quarter">Quarter</option>
              <option value="year">Year (with month breakdown)</option>
              <option value="all">All time</option>
            </select>
          </div>
          {mode === "month" ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Month</label>
              <input
                type="month"
                value={monthVal}
                onChange={(e) => setMonthVal(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          ) : null}
          {(mode === "quarter" || mode === "year") && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Year</label>
              <input
                type="number"
                min={2000}
                max={2100}
                value={yearVal}
                onChange={(e) => setYearVal(parseInt(e.target.value, 10) || yearVal)}
                className="w-28 rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          )}
          {mode === "quarter" ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Quarter</label>
              <select
                value={quarter}
                onChange={(e) => setQuarter(parseInt(e.target.value, 10) as 1 | 2 | 3 | 4)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value={1}>Q1 (Jan–Mar)</option>
                <option value={2}>Q2 (Apr–Jun)</option>
                <option value={3}>Q3 (Jul–Sep)</option>
                <option value={4}>Q4 (Oct–Dec)</option>
              </select>
            </div>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-gray-500">Showing: {periodLabel}</p>
      </div>

      <div className="grid gap-4 border-b border-ht-border bg-ht-canvas/30 p-5 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-900">Matched</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-900">{agg.matchedLineCount} lines</div>
          <div className="text-sm font-mono text-emerald-800">{fmt(agg.matchedAmount)} ex VAT</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-950">Not matched</div>
          <div className="mt-1 text-2xl font-semibold text-amber-950">{agg.unmatchedLineCount} lines</div>
          <div className="text-sm font-mono text-amber-900">{fmt(agg.unmatchedAmount)} ex VAT</div>
        </div>
        <div className="rounded-xl border border-ht-border bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">In period</div>
          <div className="mt-1 text-sm text-gray-700">
            <strong>{agg.jobsTouched}</strong> jobs with supplier lines
          </div>
          <div className="text-xs text-gray-500">
            {totalLines === 0 ? "No supplier lines in range." : `${totalLines} lines · ${fmt(totalAmount)} total`}
          </div>
        </div>
      </div>

      {mode === "quarter" && quarterBreakdown ? (
        <div className="border-b border-ht-border px-5 py-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-900">
            Month by month in Q{quarter} {yearVal}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-ht-border text-left text-gray-600">
                  <th className="py-2 pr-3 font-medium">Month</th>
                  <th className="py-2 pr-3 text-right font-medium">Matched lines</th>
                  <th className="py-2 pr-3 text-right font-medium">Matched £</th>
                  <th className="py-2 pr-3 text-right font-medium">Unmatched lines</th>
                  <th className="py-2 text-right font-medium">Unmatched £</th>
                </tr>
              </thead>
              <tbody>
                {quarterBreakdown.map((row) => (
                  <tr key={row.monthIndex} className="border-b border-ht-border/60">
                    <td className="py-2 pr-3 font-medium text-gray-900">{row.label}</td>
                    <td className="py-2 pr-3 text-right font-mono text-emerald-800">{row.agg.matchedLineCount}</td>
                    <td className="py-2 pr-3 text-right font-mono text-emerald-800">{fmt(row.agg.matchedAmount)}</td>
                    <td className="py-2 pr-3 text-right font-mono text-amber-900">{row.agg.unmatchedLineCount}</td>
                    <td className="py-2 text-right font-mono text-amber-900">{fmt(row.agg.unmatchedAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {mode === "year" && yearBreakdown ? (
        <div className="border-b border-ht-border px-5 py-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-900">Month by month ({yearVal})</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-ht-border text-left text-gray-600">
                  <th className="py-2 pr-3 font-medium">Month</th>
                  <th className="py-2 pr-3 text-right font-medium">Matched lines</th>
                  <th className="py-2 pr-3 text-right font-medium">Matched £</th>
                  <th className="py-2 pr-3 text-right font-medium">Unmatched lines</th>
                  <th className="py-2 text-right font-medium">Unmatched £</th>
                </tr>
              </thead>
              <tbody>
                {yearBreakdown.map((row) => (
                  <tr key={row.monthIndex} className="border-b border-ht-border/60">
                    <td className="py-2 pr-3 font-medium text-gray-900">{row.label}</td>
                    <td className="py-2 pr-3 text-right font-mono text-emerald-800">{row.agg.matchedLineCount}</td>
                    <td className="py-2 pr-3 text-right font-mono text-emerald-800">{fmt(row.agg.matchedAmount)}</td>
                    <td className="py-2 pr-3 text-right font-mono text-amber-900">{row.agg.unmatchedLineCount}</td>
                    <td className="py-2 text-right font-mono text-amber-900">{fmt(row.agg.unmatchedAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {mode === "all" && rollingBreakdown ? (
        <div className="border-b border-ht-border px-5 py-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-900">Last 12 months (rolling, by collection date)</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-ht-border text-left text-gray-600">
                  <th className="py-2 pr-3 font-medium">Month</th>
                  <th className="py-2 pr-3 text-right font-medium">Matched lines</th>
                  <th className="py-2 pr-3 text-right font-medium">Matched £</th>
                  <th className="py-2 pr-3 text-right font-medium">Unmatched lines</th>
                  <th className="py-2 text-right font-medium">Unmatched £</th>
                </tr>
              </thead>
              <tbody>
                {rollingBreakdown.map((row) => (
                  <tr key={`${row.year}-${row.monthIndex0}`} className="border-b border-ht-border/60">
                    <td className="py-2 pr-3 font-medium text-gray-900">{row.label}</td>
                    <td className="py-2 pr-3 text-right font-mono text-emerald-800">{row.agg.matchedLineCount}</td>
                    <td className="py-2 pr-3 text-right font-mono text-emerald-800">{fmt(row.agg.matchedAmount)}</td>
                    <td className="py-2 pr-3 text-right font-mono text-amber-900">{row.agg.unmatchedLineCount}</td>
                    <td className="py-2 text-right font-mono text-amber-900">{fmt(row.agg.unmatchedAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 p-5 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-amber-900">Unmatched lines (needs link fix)</h3>
          {agg.unmatched.length === 0 ? (
            <p className="text-sm text-gray-500">None in this period.</p>
          ) : (
            <div className="max-h-72 overflow-auto rounded-lg border border-amber-200/80">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-amber-50">
                  <tr className="text-left text-gray-600">
                    <th className="p-2 font-medium">Job</th>
                    <th className="p-2 font-medium">Supplier £</th>
                    <th className="p-2 font-medium">Linked ref</th>
                    <th className="p-2 font-medium">Expected</th>
                  </tr>
                </thead>
                <tbody>
                  {agg.unmatched.map((r) => (
                    <tr key={r.line.id} className="border-t border-amber-100">
                      <td className="p-2">
                        <Link
                          to={platformPath(`/supplier-invoicing?job=${r.job.id}`)}
                          className="font-medium text-ht-slate hover:underline"
                        >
                          {r.job.jobNumber}
                        </Link>
                        <div className="text-gray-500">{r.job.customerName}</div>
                      </td>
                      <td className="p-2 font-mono">{fmt(Number(r.line.amountExVat) || 0)}</td>
                      <td className="p-2 break-all text-gray-700">{(r.line.linkedCustomerInvoiceRef ?? "").trim() || "—"}</td>
                      <td className="p-2 break-all text-gray-700">{expectedCustomerInvoiceRef(r.job)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-emerald-900">Matched lines</h3>
          {agg.matched.length === 0 ? (
            <p className="text-sm text-gray-500">None in this period.</p>
          ) : (
            <div className="max-h-72 overflow-auto rounded-lg border border-emerald-200/80">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-emerald-50">
                  <tr className="text-left text-gray-600">
                    <th className="p-2 font-medium">Job</th>
                    <th className="p-2 font-medium">Supplier £</th>
                    <th className="p-2 font-medium">Linked = expected</th>
                  </tr>
                </thead>
                <tbody>
                  {agg.matched.map((r) => (
                    <tr key={r.line.id} className="border-t border-emerald-100">
                      <td className="p-2">
                        <Link to={platformPath(`/jobs/${r.job.id}`)} className="font-medium text-ht-slate hover:underline">
                          {r.job.jobNumber}
                        </Link>
                        <div className="text-gray-500">{r.job.customerName}</div>
                      </td>
                      <td className="p-2 font-mono">{fmt(Number(r.line.amountExVat) || 0)}</td>
                      <td className="p-2 break-all text-gray-700">{expectedCustomerInvoiceRef(r.job)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-ht-border bg-gray-50/80 px-5 py-3 text-xs text-gray-600">
        Customer invoice sent flag: use{" "}
        <Link className="font-medium text-ht-slate underline" to={platformPath("/customer-invoicing")}>
          Customer invoicing
        </Link>{" "}
        to track posting; matching here is only the <strong>reference link</strong> on supplier lines.
      </div>
    </Card>
  );
}

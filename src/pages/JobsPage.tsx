import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Download, FlaskConical, Plus, Search, Trash2 } from "lucide-react";
import { notifyError, notifySuccess } from "../lib/platformNotify";
import { useAuth } from "../context/AuthContext";
import { useJobRecycleBin, useJobs } from "../context/JobsContext";
import { getSupabase } from "../lib/supabase";
import { userCanDeleteJobs } from "../lib/permissions";
import type { Job } from "../types";
import { Btn, Card } from "../components/Layout";
import { prependBrandedCsvPreamble, type UserCompanyDetails } from "../lib/companyBrand";
import { getUserCompanyDetails } from "../lib/userCompanyProfile";
import { platformPath } from "../routes/paths";
import { formatAddressSummary } from "../lib/jobAddress";
import { jobHasDriverReportedIssue } from "../lib/jobBoardVisual";
import { createSeededTestJob, TEST_JOB_DRIVER_PORTAL_REGISTRATION } from "../lib/seedTestJob";

function csvCell(v: unknown): string {
  const s = String(v ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function exportCsv(rows: Job[], details: UserCompanyDetails, preparedBy: string | undefined) {
  const headers = [
    "Collection date",
    "Delivery date",
    "From (collection summary)",
    "Customer",
    "Customer email",
    "Job status",
    "Carrier",
    "Truck plates",
    "Routing",
    "Buy (ex VAT)",
    "Sell (ex VAT)",
    "Fuel surcharge",
    "Extra charges",
    "Billable",
    "GP (profit)",
    "Margin %",
    "Invoice sent (customer)",
    "Supplier inv received",
    "POD received",
    "POD sent",
    "Hayleigh PO",
    "Collection ref",
    "Customer invoice ref",
    "Customer payment date",
    "Supplier due date",
    "Job number",
    "Handler",
    "Notes",
    "Collection address lines",
    "Delivery address lines",
    "Collection postcode",
    "Delivery postcode",
    "Invoice billing address lines",
    "Invoice billing postcode",
  ];
  const lines = rows.map((y) => {
    return [
      csvCell(y.collectionDate),
      csvCell(y.deliveryDate || ""),
      csvCell(formatAddressSummary(y, "collection", 200)),
      csvCell(y.customerName),
      csvCell(y.customerEmail || ""),
      csvCell(y.status),
      csvCell(y.carrier || ""),
      csvCell(y.truckPlates || ""),
      csvCell(y.routeType || ""),
      csvCell(y.buyPrice || 0),
      csvCell(y.sellPrice || 0),
      csvCell(y.fuelSurcharge || 0),
      csvCell(y.extraCharges || 0),
      csvCell(y.billable === "yes" ? "Yes" : "No"),
      csvCell(y.profit || 0),
      csvCell(y.margin || 0),
      csvCell(y.invoiceSent === "yes" ? "Yes" : "No"),
      csvCell(y.supplierInvoiceReceived === "yes" ? "Yes" : "No"),
      csvCell(y.podReceived === "yes" ? "Yes" : "No"),
      csvCell(y.podSent === "yes" ? "Yes" : "No"),
      csvCell(y.hayleighPo || ""),
      csvCell(y.collectionRef || ""),
      csvCell(y.customerInvoiceRef || ""),
      csvCell(y.customerPaymentDate || ""),
      csvCell(y.supplierDueDate || ""),
      csvCell(y.jobNumber),
      csvCell(y.handler),
      csvCell(y.notes || ""),
      csvCell(y.collectionAddressLines),
      csvCell(y.deliveryAddressLines),
      csvCell(y.collectionPostcode || ""),
      csvCell(y.deliveryPostcode || ""),
      csvCell(y.invoiceBillingAddressLines || ""),
      csvCell(y.invoiceBillingPostcode || ""),
    ].join(",");
  });
  const csv = [...prependBrandedCsvPreamble(headers, details, preparedBy), headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `transport-jobs-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function JobsPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useJobs();
  const [testJobBusy, setTestJobBusy] = useState(false);
  const { softDeleteJob, deletedBin } = useJobRecycleBin();
  const canDeleteJob = userCanDeleteJobs(user);
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q.trim()) return jobs;
    const s = q.toLowerCase();
    return jobs.filter((j) => Object.values(j).some((v) => String(v).toLowerCase().includes(s)));
  }, [jobs, q]);

  const profitClass = (d: number) =>
    d >= 200 ? "text-green-700 bg-green-50" : d >= 50 ? "text-amber-600 bg-amber-50" : "text-red-700 bg-red-50";
  const marginClass = (d: number) =>
    d >= 25 ? "text-green-700" : d >= 15 ? "text-amber-600" : "text-red-700";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search all columns..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-9 w-full rounded-lg border border-ht-border bg-white py-2 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ht-slate/20"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Btn
            variant="outline"
            className="h-9 gap-2 py-1.5 text-sm"
            type="button"
            disabled={!user || testJobBusy}
            title={
              !user
                ? "Sign in to add a test job"
                : `Insert a full test job (Manchester → Leeds). Driver portal: reg ${TEST_JOB_DRIVER_PORTAL_REGISTRATION} + new job number.`
            }
            onClick={() => {
              if (!user) return;
              setTestJobBusy(true);
              void (async () => {
                try {
                  const job = await createSeededTestJob(user);
                  const nextJobs = [...jobs, job];
                  setJobs(nextJobs);
                  const supabase = getSupabase();
                  if (supabase) {
                    const { error: upErr } = await supabase.from("jobs_list").upsert(
                      {
                        id: 1,
                        jobs: nextJobs,
                        deleted_jobs: deletedBin,
                        updated_at: new Date().toISOString(),
                      },
                      { onConflict: "id" }
                    );
                    if (upErr) {
                      notifyError("Test job added in app; cloud copy may be stale", {
                        description: upErr.message,
                      });
                    }
                  }
                  notifySuccess(`Test job ${job.jobNumber} added`, {
                    description: `Driver portal (/driver): registration ${TEST_JOB_DRIVER_PORTAL_REGISTRATION}, job number ${job.jobNumber} (exact match).`,
                    href: platformPath(`/jobs/${job.id}`),
                  });
                } catch (e) {
                  notifyError("Could not add test job", {
                    description: e instanceof Error ? e.message : "Unknown error",
                  });
                } finally {
                  setTestJobBusy(false);
                }
              })();
            }}
          >
            <FlaskConical size={16} className={testJobBusy ? "animate-pulse" : undefined} aria-hidden />
            {testJobBusy ? "Adding…" : "Test job"}
          </Btn>
          <Btn
            variant="outline"
            className="h-9 gap-2 py-1.5 text-sm"
            disabled={jobs.length === 0}
            onClick={() => {
              exportCsv(filtered, getUserCompanyDetails(user?.id), user?.name);
              notifySuccess("Jobs exported to CSV", {
                description: `${filtered.length} row(s)`,
                href: platformPath("/jobs"),
              });
            }}
          >
            <Download size={16} /> Export CSV
          </Btn>
          <Link to={platformPath("/jobs/create")}>
            <Btn className="h-9 gap-2 py-1.5 text-sm">
              <Plus size={16} /> New Job
            </Btn>
          </Link>
        </div>
      </div>

      {jobs.length === 0 && (
        <Card className="py-12 text-center">
          <p className="mb-4 text-gray-600">No jobs yet — create your first job.</p>
          <Link to={platformPath("/jobs/create")}>
            <Btn className="gap-2">
              <Plus size={16} /> Create Job
            </Btn>
          </Link>
        </Card>
      )}

      {jobs.length > 0 && (
        <>
          <p className="text-xs text-gray-600">
            Job list follows the Hayleigh spreadsheet flow (dates, from, carrier, money ex VAT, billable, POD, invoices,
            supplier payment). Scroll horizontally if needed.
          </p>
          <div className="overflow-x-auto border border-gray-300 bg-white">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-300 bg-gray-100">
                  <th className="sticky left-0 z-20 min-w-[100px] border-r border-gray-300 bg-gray-100 px-2 py-2.5 text-left text-xs font-semibold text-gray-700">
                    Job #
                  </th>
                  <th className="min-w-[40px] border-r border-gray-300 bg-gray-100 px-1 py-2.5 text-center text-xs font-semibold text-gray-700">
                    Drv
                  </th>
                  <th className="min-w-[72px] border-r border-gray-300 px-2 py-2.5 text-left text-xs font-semibold text-gray-700">
                    Handler
                  </th>
                  <th className="min-w-[88px] border-r border-gray-300 px-2 py-2.5 text-left text-xs font-semibold text-gray-700">
                    Coll date
                  </th>
                  <th className="min-w-[88px] border-r border-gray-300 px-2 py-2.5 text-left text-xs font-semibold text-gray-700">
                    Del date
                  </th>
                  <th className="min-w-[120px] border-r border-gray-300 px-2 py-2.5 text-left text-xs font-semibold text-gray-700">
                    From
                  </th>
                  <th className="min-w-[100px] border-r border-gray-300 px-2 py-2.5 text-left text-xs font-semibold text-gray-700">
                    Customer
                  </th>
                  <th className="min-w-[88px] border-r border-gray-300 px-2 py-2.5 text-left text-xs font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="min-w-[88px] border-r border-gray-300 px-2 py-2.5 text-left text-xs font-semibold text-gray-700">
                    Carrier
                  </th>
                  <th className="min-w-[80px] border-r border-gray-300 px-2 py-2.5 text-left text-xs font-semibold text-gray-700">
                    Truck
                  </th>
                  <th className="min-w-[72px] border-r border-gray-300 px-2 py-2.5 text-left text-xs font-semibold text-gray-700">
                    Route
                  </th>
                  <th className="min-w-[78px] border-r border-gray-300 px-2 py-2.5 text-right text-xs font-semibold text-gray-700">
                    Buy ex
                  </th>
                  <th className="min-w-[78px] border-r border-gray-300 px-2 py-2.5 text-right text-xs font-semibold text-gray-700">
                    Sell ex
                  </th>
                  <th className="min-w-[72px] border-r border-gray-300 px-2 py-2.5 text-right text-xs font-semibold text-gray-700">
                    Fuel
                  </th>
                  <th className="min-w-[56px] border-r border-gray-300 px-2 py-2.5 text-center text-xs font-semibold text-gray-700">
                    Bill
                  </th>
                  <th className="min-w-[72px] border-r border-gray-300 px-2 py-2.5 text-right text-xs font-semibold text-gray-700">
                    GP
                  </th>
                  <th className="min-w-[56px] border-r border-gray-300 px-2 py-2.5 text-right text-xs font-semibold text-gray-700">
                    Marg
                  </th>
                  <th className="min-w-[56px] border-r border-gray-300 px-2 py-2.5 text-center text-xs font-semibold text-gray-700">
                    Inv
                  </th>
                  <th className="min-w-[56px] border-r border-gray-300 px-2 py-2.5 text-center text-xs font-semibold text-gray-700">
                    S.inv
                  </th>
                  <th className="min-w-[52px] border-r border-gray-300 px-2 py-2.5 text-center text-xs font-semibold text-gray-700">
                    POD
                  </th>
                  <th className="min-w-[52px] border-r border-gray-300 px-2 py-2.5 text-center text-xs font-semibold text-gray-700">
                    P.snt
                  </th>
                  <th className="min-w-[72px] border-r border-gray-300 px-2 py-2.5 text-left text-xs font-semibold text-gray-700">
                    Hay PO
                  </th>
                  <th className="min-w-[100px] border-r border-gray-300 px-2 py-2.5 text-left text-xs font-semibold text-gray-700">
                    Refs
                  </th>
                  <th className="min-w-[88px] border-r border-gray-300 px-2 py-2.5 text-left text-xs font-semibold text-gray-700">
                    Cust pay
                  </th>
                  <th className="min-w-[88px] border-r border-gray-300 px-2 py-2.5 text-left text-xs font-semibold text-gray-700">
                    Sup due
                  </th>
                  {canDeleteJob && (
                    <th className="min-w-[72px] px-2 py-2.5 text-center text-xs font-semibold text-gray-700">Bin</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d, h) => {
                  const refBits = [d.collectionRef, d.customerInvoiceRef].filter(Boolean).join(" · ");
                  const payD = d.customerPaymentDate?.trim();
                  const payShown =
                    payD && payD.length >= 10 && !Number.isNaN(Date.parse(payD))
                      ? new Date(payD).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })
                      : payD || "—";
                  const supDue = d.supplierDueDate?.trim();
                  const supShown =
                    supDue && supDue.length >= 10 && !Number.isNaN(Date.parse(supDue))
                      ? new Date(supDue).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })
                      : supDue || "—";
                  return (
                    <tr
                      key={d.id}
                      className={`border-b border-ht-border transition-colors hover:bg-ht-slate/[0.04] ${
                        h % 2 === 0 ? "bg-white" : "bg-gray-50"
                      }`}
                    >
                      <td className="sticky left-0 z-10 border-r border-gray-200 bg-inherit px-2 py-2 text-xs font-medium">
                        <Link to={platformPath(`/jobs/${d.id}`)} className="text-ht-slate hover:underline">
                          {d.jobNumber}
                        </Link>
                      </td>
                      <td className="border-r border-gray-200 px-1 py-2 text-center text-xs">
                        {jobHasDriverReportedIssue(d) ? (
                          <span title="Driver reported an issue" className="inline-flex text-red-600">
                            <AlertTriangle className="h-4 w-4" aria-hidden />
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="border-r border-gray-200 px-2 py-2 text-xs text-gray-700">{d.handler}</td>
                      <td className="border-r border-gray-200 px-2 py-2 text-xs text-gray-700">
                        {new Date(d.collectionDate).toLocaleDateString()}
                      </td>
                      <td className="border-r border-gray-200 px-2 py-2 text-xs text-gray-700">
                        {d.deliveryDate ? new Date(d.deliveryDate).toLocaleDateString() : "—"}
                      </td>
                      <td
                        className="max-w-[140px] truncate border-r border-gray-200 px-2 py-2 text-xs text-gray-700"
                        title={formatAddressSummary(d, "collection", 400)}
                      >
                        {formatAddressSummary(d, "collection", 40) || "—"}
                      </td>
                      <td className="border-r border-gray-200 px-2 py-2 text-xs text-gray-700">{d.customerName}</td>
                      <td className="border-r border-gray-200 px-2 py-2 text-xs">
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${
                            d.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : d.status === "in-progress"
                                ? "bg-ht-slate/15 text-ht-slate-dark"
                                : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {d.status === "completed" ? "Done" : d.status === "in-progress" ? "Active" : "Sch"}
                        </span>
                      </td>
                      <td className="max-w-[100px] truncate border-r border-gray-200 px-2 py-2 text-xs text-gray-700" title={d.carrier}>
                        {d.carrier || "—"}
                      </td>
                      <td className="border-r border-gray-200 px-2 py-2 text-xs text-gray-700">{d.truckPlates || "—"}</td>
                      <td className="border-r border-gray-200 px-2 py-2 text-xs text-gray-600">
                        {d.routeType === "international" ? "Intl" : "Dom"}
                      </td>
                      <td className="border-r border-gray-200 px-2 py-2 text-right font-mono text-xs text-gray-700">
                        £{parseFloat(String(d.buyPrice || 0)).toFixed(2)}
                      </td>
                      <td className="border-r border-gray-200 px-2 py-2 text-right font-mono text-xs text-gray-700">
                        £{parseFloat(String(d.sellPrice || 0)).toFixed(2)}
                      </td>
                      <td className="border-r border-gray-200 px-2 py-2 text-right font-mono text-xs text-gray-700">
                        £{parseFloat(String(d.fuelSurcharge || 0)).toFixed(2)}
                      </td>
                      <td className="border-r border-gray-200 px-2 py-2 text-center text-xs">
                        {d.billable === "yes" ? (
                          <span className="font-semibold text-emerald-700">Y</span>
                        ) : (
                          <span className="text-gray-400">N</span>
                        )}
                      </td>
                      <td
                        className={`border-r border-gray-200 px-2 py-2 text-right font-mono text-xs font-semibold ${profitClass(
                          parseFloat(String(d.profit || 0))
                        )}`}
                      >
                        £{parseFloat(String(d.profit || 0)).toFixed(2)}
                      </td>
                      <td
                        className={`border-r border-gray-200 px-2 py-2 text-right font-mono text-xs font-semibold ${marginClass(
                          parseFloat(String(d.margin || 0))
                        )}`}
                      >
                        {parseFloat(String(d.margin || 0)).toFixed(0)}%
                      </td>
                      <td className="border-r border-gray-200 px-2 py-2 text-center text-xs">
                        {d.status !== "completed" ? (
                          <span className="text-gray-300">—</span>
                        ) : d.invoiceSent === "yes" ? (
                          <span className="text-emerald-700">Y</span>
                        ) : (
                          <span className="text-amber-700">N</span>
                        )}
                      </td>
                      <td className="border-r border-gray-200 px-2 py-2 text-center text-xs">
                        {d.supplierInvoiceReceived === "yes" ? (
                          <span className="text-emerald-700">Y</span>
                        ) : (
                          <span className="text-gray-400">N</span>
                        )}
                      </td>
                      <td className="border-r border-gray-200 px-2 py-2 text-center text-xs">
                        {d.podReceived === "yes" ? <span className="text-emerald-700">Y</span> : <span className="text-gray-400">N</span>}
                      </td>
                      <td className="border-r border-gray-200 px-2 py-2 text-center text-xs">
                        {d.podSent === "yes" ? <span className="text-emerald-700">Y</span> : <span className="text-gray-400">N</span>}
                      </td>
                      <td className="max-w-[88px] truncate border-r border-gray-200 px-2 py-2 text-xs text-gray-700" title={d.hayleighPo}>
                        {d.hayleighPo || "—"}
                      </td>
                      <td
                        className="max-w-[120px] truncate border-r border-gray-200 px-2 py-2 text-xs text-gray-600"
                        title={refBits || undefined}
                      >
                        {refBits || "—"}
                      </td>
                      <td className="border-r border-gray-200 px-2 py-2 text-xs text-gray-700">{payShown}</td>
                      <td className="border-r border-gray-200 px-2 py-2 text-xs text-gray-700">{supShown}</td>
                      {canDeleteJob && (
                        <td className="px-1 py-2 text-center">
                          <button
                            type="button"
                            title="Move job to deleted bin (90 days in Settings)"
                            className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-white p-1 text-red-700 hover:bg-red-50"
                            onClick={() => {
                              const msg = `Move job ${d.jobNumber} to the deleted bin? It will stay there for 90 days; you can restore it from Settings → Deleted jobs.`;
                              if (!window.confirm(msg)) return;
                              softDeleteJob(d, user?.name);
                              notifySuccess("Job moved to deleted bin", {
                                description: "Restore within 90 days under Settings → Deleted jobs.",
                                href: platformPath("/settings"),
                              });
                            }}
                          >
                            <Trash2 size={14} aria-hidden />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-400 bg-gray-100 font-semibold">
                  <td className="sticky left-0 z-10 border-r border-gray-300 bg-gray-100 px-2 py-2.5 text-xs text-gray-700">
                    TOTAL ({filtered.length})
                  </td>
                  <td className="border-r border-gray-300 bg-gray-100" />
                  <td colSpan={9} className="border-r border-gray-300" />
                  <td className="border-r border-gray-300 px-2 py-2.5 text-right font-mono text-xs">
                    £{filtered.reduce((s, j) => s + parseFloat(String(j.buyPrice || 0)), 0).toFixed(2)}
                  </td>
                  <td className="border-r border-gray-300 px-2 py-2.5 text-right font-mono text-xs">
                    £{filtered.reduce((s, j) => s + parseFloat(String(j.sellPrice || 0)), 0).toFixed(2)}
                  </td>
                  <td className="border-r border-gray-300 px-2 py-2.5 text-right font-mono text-xs">
                    £{filtered.reduce((s, j) => s + parseFloat(String(j.fuelSurcharge || 0)), 0).toFixed(2)}
                  </td>
                  <td className="border-r border-gray-300" />
                  <td className="border-r border-gray-300 px-2 py-2.5 text-right font-mono text-xs">
                    £{filtered.reduce((s, j) => s + parseFloat(String(j.profit || 0)), 0).toFixed(2)}
                  </td>
                  <td className="border-r border-gray-300" />
                  <td colSpan={8} className="border-r border-gray-300" />
                  {canDeleteJob && <td />}
                </tr>
              </tfoot>
            </table>
          </div>
          {filtered.length === 0 && jobs.length > 0 && (
            <p className="py-8 text-center text-gray-500">No jobs found matching your search criteria</p>
          )}
          <div className="flex flex-wrap items-center gap-6 rounded border border-gray-300 bg-gray-50 px-4 py-3 text-xs text-gray-600">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">Profit Legend:</span>
              <span className="rounded bg-green-50 px-2 py-1 text-green-700">£200+ = Excellent</span>
              <span className="rounded bg-amber-50 px-2 py-1 text-amber-600">£50-199 = Good</span>
              <span className="rounded bg-red-50 px-2 py-1 text-red-700">&lt;£50 = Low</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-l border-gray-300 pl-6">
              <span className="font-semibold">Margin Legend:</span>
              <span className="text-green-700">25%+ Excellent</span>
              <span className="text-amber-600">15-24% Good</span>
              <span className="text-red-700">&lt;15% Low</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

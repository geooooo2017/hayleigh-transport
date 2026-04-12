import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { notifyError, notifyMessage, notifySuccess } from "../lib/platformNotify";
import { AlertTriangle, Check, FileDown, GitCompare, Mail, Printer, RotateCcw, Send } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useJobs } from "../context/JobsContext";
import { WhyThisSection } from "../components/FormGuidance";
import { Btn, Card } from "../components/Layout";
import { CUSTOMER_INVOICING_WHY } from "../lib/fieldRequirementCopy";
import { getUserCompanyDetails } from "../lib/userCompanyProfile";
import { downloadJobInvoicePdf } from "../lib/invoicePdf";
import { jobNetExVat } from "../lib/jobNetAmount";
import { escapeHtml, printPaperwork } from "../lib/printPaperwork";
import { platformPath } from "../routes/paths";
import type { Job } from "../types";
import { JobInvoiceCompareModal } from "../components/JobInvoiceCompareModal";

type InvFilter = "need" | "sent" | "all";

function patchInvoiceSentOnJob(prev: Job[], jobId: number, sent: boolean): Job[] {
  return prev.map((j) => {
    if (j.id !== jobId) return j;
    return {
      ...j,
      invoiceSent: sent ? "yes" : "no",
      officeUpdatedAt: new Date().toISOString(),
      officeRevision: (j.officeRevision ?? 0) + 1,
    };
  });
}

export default function CustomerInvoicingPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useJobs();
  /** Default "all" so completed jobs already marked invoiced (e.g. MOBILE-TEST) are visible; use "need" to focus backlog. */
  const [invFilter, setInvFilter] = useState<InvFilter>("all");
  const [compareJobId, setCompareJobId] = useState<number | null>(null);

  const compareJob = useMemo(
    () => (compareJobId != null ? jobs.find((j) => j.id === compareJobId) ?? null : null),
    [jobs, compareJobId],
  );

  const completedJobs = useMemo(() => {
    return jobs
      .filter((j) => j.status === "completed")
      .sort((a, b) => {
        const tb = new Date(b.deliveryDate || b.collectionDate).getTime();
        const ta = new Date(a.deliveryDate || a.collectionDate).getTime();
        return tb - ta;
      });
  }, [jobs]);

  const pending = useMemo(
    () => completedJobs.filter((j) => j.invoiceSent !== "yes"),
    [completedJobs]
  );

  const pendingValue = useMemo(() => pending.reduce((s, j) => s + jobNetExVat(j), 0), [pending]);

  const displayedJobs = useMemo(() => {
    if (invFilter === "need") return completedJobs.filter((j) => j.invoiceSent !== "yes");
    if (invFilter === "sent") return completedJobs.filter((j) => j.invoiceSent === "yes");
    return completedJobs;
  }, [completedJobs, invFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 lg:text-3xl">Customer Invoicing</h1>
        <p className="mt-1 text-gray-500">
          Only <strong>completed</strong> jobs appear here. The table defaults to <strong>All completed</strong> so you
          can see both pending and already-sent invoices. Use <strong>Need invoice</strong> for the backlog only, and{" "}
          <strong>Invoiced</strong> for jobs already marked sent. The same flag lives on each job detail and the jobs
          list.
        </p>
        <WhyThisSection>{CUSTOMER_INVOICING_WHY}</WhyThisSection>
      </div>

      <Card className="border-2 border-amber-200 bg-amber-50 p-6">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 flex-shrink-0 text-amber-600" size={24} />
          <div className="flex-1">
            <h3 className="mb-1 font-semibold text-gray-900">
              {pending.length} completed {pending.length === 1 ? "job" : "jobs"} still need invoicing
            </h3>
            <p className="mb-4 text-sm text-gray-700">
              Total net (ex VAT, sell + fuel + extras): <strong>£{pendingValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </p>
            <div className="flex flex-wrap gap-2">
              <Btn
                className="gap-2"
                onClick={() =>
                  notifyMessage("Per-job PDFs", {
                    description: "Use “PDF” on each row to download. Mark “Invoiced” when sent.",
                    href: platformPath("/customer-invoicing"),
                  })
                }
              >
                <Send size={14} /> How to batch
              </Btn>
              <Btn
                variant="outline"
                className="gap-2"
                onClick={() =>
                  notifySuccess("Emails queued", {
                    description: "Draft invoices marked as sent in this workflow (connect your mail provider to send for real).",
                    href: platformPath("/customer-invoicing"),
                  })
                }
              >
                <Mail size={14} /> Send All Draft Invoices
              </Btn>
              <Btn
                variant="outline"
                className="gap-2"
                onClick={() => {
                  const rows = completedJobs.slice(0, 80);
                  const rowHtml = rows
                    .map(
                      (j) =>
                        `<tr><td>${escapeHtml(j.jobNumber)}</td><td>${escapeHtml(j.customerName)}</td><td>£${jobNetExVat(j).toFixed(2)}</td><td>${j.invoiceSent === "yes" ? "Sent" : "Pending"}</td></tr>`
                    )
                    .join("");
                  const ok = printPaperwork({
                    title: "Completed jobs — customer invoice status",
                    companyDetails: getUserCompanyDetails(user?.id),
                    preparedBy: user?.name,
                    contentHtml: `
                      <p style="margin:0 0 12px;font-size:13px;color:#444">Completed jobs only. Net = sell + fuel + extras (ex VAT).</p>
                      <table style="width:100%;border-collapse:collapse;font-size:13px">
                        <thead><tr>
                          <th style="border:1px solid #e5e7eb;padding:8px;text-align:left;background:#f9fafb">Job</th>
                          <th style="border:1px solid #e5e7eb;padding:8px;text-align:left;background:#f9fafb">Customer</th>
                          <th style="border:1px solid #e5e7eb;padding:8px;text-align:left;background:#f9fafb">Net (ex VAT)</th>
                          <th style="border:1px solid #e5e7eb;padding:8px;text-align:left;background:#f9fafb">Invoice</th>
                        </tr></thead>
                        <tbody>${rowHtml || `<tr><td colspan="4" style="border:1px solid #e5e7eb;padding:12px">No completed jobs</td></tr>`}</tbody>
                      </table>`,
                  });
                  if (ok)
                    notifySuccess("Opening print preview", {
                      description: "Use print to save as PDF.",
                      href: platformPath("/customer-invoicing"),
                    });
                  else notifyError("Pop-up blocked", { description: "Allow pop-ups for this site to print." });
                }}
              >
                <Printer size={14} /> Print completed list
              </Btn>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">{completedJobs.length}</span> completed{" "}
            {completedJobs.length === 1 ? "job" : "jobs"} in total
          </p>
          <div className="flex flex-wrap gap-2">
            <Btn
              type="button"
              variant={invFilter === "need" ? "primary" : "outline"}
              className="h-8 gap-1 px-3 text-xs"
              onClick={() => setInvFilter("need")}
            >
              Need invoice ({pending.length})
            </Btn>
            <Btn
              type="button"
              variant={invFilter === "sent" ? "primary" : "outline"}
              className="h-8 gap-1 px-3 text-xs"
              onClick={() => setInvFilter("sent")}
            >
              Invoiced ({completedJobs.filter((j) => j.invoiceSent === "yes").length})
            </Btn>
            <Btn
              type="button"
              variant={invFilter === "all" ? "primary" : "outline"}
              className="h-8 gap-1 px-3 text-xs"
              onClick={() => setInvFilter("all")}
            >
              All completed
            </Btn>
          </div>
        </div>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-700">
              <th className="px-4 py-3">Job</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Net (ex VAT)</th>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayedJobs.map((j) => (
              <tr key={j.id} className="border-b border-gray-100">
                <td className="px-4 py-3 font-medium">
                  <Link to={platformPath(`/jobs/${j.id}`)} className="text-ht-slate hover:underline">
                    {j.jobNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-700">{j.customerName}</td>
                <td className="px-4 py-3 font-mono">£{jobNetExVat(j).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      j.invoiceSent === "yes" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    {j.invoiceSent === "yes" ? "Sent" : "Pending"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {j.invoiceSent !== "yes" ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-900 hover:bg-emerald-100"
                        onClick={() => {
                          setJobs((prev) => patchInvoiceSentOnJob(prev, j.id, true));
                          notifySuccess("Marked invoiced", {
                            description: `${j.jobNumber} — synced across Jobs and this page.`,
                            href: platformPath(`/jobs/${j.id}`),
                          });
                        }}
                      >
                        <Check size={14} aria-hidden /> Mark invoiced
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        onClick={() => {
                          setJobs((prev) => patchInvoiceSentOnJob(prev, j.id, false));
                          notifyMessage("Invoice status cleared", {
                            description: `${j.jobNumber} — use if the invoice was recalled.`,
                            href: platformPath(`/jobs/${j.id}`),
                          });
                        }}
                      >
                        <RotateCcw size={14} aria-hidden /> Not sent
                      </button>
                    )}
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      onClick={async () => {
                        try {
                          const details = getUserCompanyDetails(user?.id);
                          await downloadJobInvoicePdf(j, { details, preparedBy: user?.name });
                          notifySuccess("Invoice PDF downloaded", {
                            description: "Includes net, VAT @ 20%, and gross total.",
                            href: platformPath(`/jobs/${j.id}`),
                          });
                        } catch {
                          notifyError("Could not create PDF", { description: "Try again or check the browser console." });
                        }
                      }}
                    >
                      <FileDown size={14} aria-hidden /> PDF
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-md border border-ht-slate/30 bg-ht-slate/5 px-2 py-1 text-xs font-medium text-ht-navy hover:bg-ht-slate/10"
                      onClick={() => setCompareJobId(j.id)}
                      title="Compare customer and supplier totals and view both PDFs side by side"
                    >
                      <GitCompare size={14} aria-hidden /> Compare
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <JobInvoiceCompareModal
          job={compareJob}
          open={compareJob != null}
          onClose={() => setCompareJobId(null)}
          userId={user?.id}
          preparedBy={user?.name}
        />
        {jobs.length === 0 && <p className="p-8 text-center text-gray-500">No jobs yet.</p>}
        {jobs.length > 0 && completedJobs.length === 0 && (
          <p className="p-8 text-center text-gray-500">No completed jobs — invoice tracking starts when jobs are marked completed.</p>
        )}
        {completedJobs.length > 0 && displayedJobs.length === 0 && (
          <p className="p-8 text-center text-gray-500">Nothing in this filter.</p>
        )}
      </Card>
    </div>
  );
}

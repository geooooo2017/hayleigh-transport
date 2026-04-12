import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronRight, FileUp, GitCompare, Link2, Trash2 } from "lucide-react";
import { useJobs } from "../context/JobsContext";
import { WhyThisSection } from "../components/FormGuidance";
import { Btn, Card } from "../components/Layout";
import { SUPPLIER_INVOICING_WHY } from "../lib/fieldRequirementCopy";
import { MAX_POD_STORE_BYTES } from "../lib/podMailto";
import { notifyError, notifySuccess } from "../lib/platformNotify";
import { platformPath } from "../routes/paths";
import type { Job, SupplierInvoiceLine } from "../types";
import { computeJobGpExVat, effectiveSupplierCostExVat } from "../lib/jobProfit";
import { resolveInvoiceValueExVat } from "../lib/jobNetAmount";
import { JobInvoiceCompareModal } from "../components/JobInvoiceCompareModal";
import { useAuth } from "../context/AuthContext";

function newLineId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `sil-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function defaultCustomerInvRef(j: Job): string {
  return j.customerInvoiceRef?.trim() || j.jobNumber;
}

function fmtMoney(n: number): string {
  return `£${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function SupplierInvoicingPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useJobs();
  const [searchParams, setSearchParams] = useSearchParams();
  const [compareJobId, setCompareJobId] = useState<number | null>(null);

  const compareJob = useMemo(
    () => (compareJobId != null ? jobs.find((j) => j.id === compareJobId) ?? null : null),
    [jobs, compareJobId],
  );
  const jobParam = searchParams.get("job");
  const addFileRef = useRef<HTMLInputElement>(null);

  const sorted = useMemo(() => {
    return [...jobs].sort((a, b) => {
      const tb = new Date(b.deliveryDate || b.collectionDate).getTime();
      const ta = new Date(a.deliveryDate || a.collectionDate).getTime();
      return tb - ta;
    });
  }, [jobs]);

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [draftLines, setDraftLines] = useState<SupplierInvoiceLine[]>([]);

  const [newAmount, setNewAmount] = useState("");
  const [newSupRef, setNewSupRef] = useState("");
  const [newCustRef, setNewCustRef] = useState("");

  const openRow = useCallback((j: Job) => {
    setExpandedId(j.id);
    setDraftLines(j.supplierInvoiceLines?.map((x) => ({ ...x })) ?? []);
    setNewAmount("");
    setNewSupRef("");
    setNewCustRef(defaultCustomerInvRef(j));
    if (addFileRef.current) addFileRef.current.value = "";
  }, []);

  const closeRow = useCallback(() => {
    setExpandedId(null);
    setDraftLines([]);
    if (addFileRef.current) addFileRef.current.value = "";
    setSearchParams((p) => {
      const n = new URLSearchParams(p);
      n.delete("job");
      return n;
    });
  }, [setSearchParams]);

  useEffect(() => {
    if (!jobParam) return;
    const id = parseInt(jobParam, 10);
    if (!Number.isFinite(id)) return;
    const j = jobs.find((x) => x.id === id);
    if (j) openRow(j);
  }, [jobParam, jobs, openRow]);

  const expandedJob = expandedId != null ? jobs.find((x) => x.id === expandedId) : undefined;

  const saveDraft = () => {
    if (!expandedJob) return;
    const lines = draftLines.filter((l) => (Number(l.amountExVat) || 0) > 0);
    const j = expandedJob;
    const merged: Job = {
      ...j,
      supplierInvoiceLines: lines.length > 0 ? lines : undefined,
    };
    const sumLines =
      lines.length > 0 ? lines.reduce((s, l) => s + (Number(l.amountExVat) || 0), 0) : null;
    const gp = computeJobGpExVat(merged);
    const buyPrice = sumLines != null ? Math.round(sumLines * 100) / 100 : j.buyPrice;
    let supplierInvoiceReceived = j.supplierInvoiceReceived;
    if (lines.some((l) => (Number(l.amountExVat) || 0) > 0)) supplierInvoiceReceived = "yes";

    setJobs((prev) =>
      prev.map((x) => {
        if (x.id !== j.id) return x;
        return {
          ...x,
          supplierInvoiceLines: lines.length > 0 ? lines : undefined,
          buyPrice,
          profit: gp.profit,
          margin: gp.margin,
          supplierInvoiceReceived,
          officeUpdatedAt: new Date().toISOString(),
          officeRevision: (x.officeRevision ?? 0) + 1,
        };
      })
    );
    notifySuccess("Supplier invoices saved", {
      description: `${j.jobNumber} · GP ${fmtMoney(gp.profit)} (${gp.margin.toFixed(1)}% margin)`,
      href: platformPath("/supplier-invoicing"),
    });
  };

  const addLineFromForm = (file: File | null | undefined) => {
    if (!expandedJob) return;
    const amount = parseFloat(newAmount);
    if (!(amount > 0)) {
      notifyError("Enter supplier amount (ex VAT)", { description: "Use a positive number for the net on the supplier document." });
      return;
    }
    const doAdd = (line: SupplierInvoiceLine) => {
      setDraftLines((prev) => [...prev, line]);
      setNewAmount("");
      setNewSupRef("");
      setNewCustRef(defaultCustomerInvRef(expandedJob));
      if (addFileRef.current) addFileRef.current.value = "";
    };

    if (file && file.size > 0) {
      if (file.size > MAX_POD_STORE_BYTES) {
        notifyError("File too large", {
          description: `Keep supplier scans under ${Math.round(MAX_POD_STORE_BYTES / 1024)} KB for browser storage (same limit as POD).`,
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        doAdd({
          id: newLineId(),
          amountExVat: amount,
          supplierInvoiceRef: newSupRef.trim() || undefined,
          linkedCustomerInvoiceRef: newCustRef.trim() || defaultCustomerInvRef(expandedJob),
          fileName: file.name,
          fileDataUrl: reader.result as string,
          uploadedAt: new Date().toISOString(),
        });
      };
      reader.readAsDataURL(file);
      return;
    }

    doAdd({
      id: newLineId(),
      amountExVat: amount,
      supplierInvoiceRef: newSupRef.trim() || undefined,
      linkedCustomerInvoiceRef: newCustRef.trim() || defaultCustomerInvRef(expandedJob),
      uploadedAt: new Date().toISOString(),
    });
  };

  const updateLine = (id: string, patch: Partial<SupplierInvoiceLine>) => {
    setDraftLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const removeLine = (id: string) => {
    setDraftLines((prev) => prev.filter((l) => l.id !== id));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 lg:text-3xl">Supplier invoicing</h1>
        <p className="mt-1 text-gray-500">
          Attach supplier documents, record net costs (ex VAT), and link each line to your customer invoice reference. Gross
          profit on each job uses the same customer net as{" "}
          <Link className="font-medium text-ht-slate underline" to={platformPath("/customer-invoicing")}>
            Customer invoicing
          </Link>{" "}
          (sell + fuel + extras, or your invoiced-value override) minus these supplier totals — or the job buy price if you
          have no lines yet.
        </p>
        <WhyThisSection>{SUPPLIER_INVOICING_WHY}</WhyThisSection>
      </div>

      <Card className="overflow-x-auto p-0">
        <div className="border-b border-ht-border px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Jobs</h2>
          <p className="mt-1 text-sm text-gray-600">
            Expand a row to add or edit supplier lines. Saving updates GP on the job and the dashboard.
          </p>
        </div>
        <table className="w-full min-w-[880px] text-sm">
          <thead>
            <tr className="border-b border-ht-border bg-ht-canvas/60">
              <th className="w-10 px-3 py-3" aria-hidden />
              <th className="px-3 py-3 text-left font-medium text-gray-600">Job</th>
              <th className="px-3 py-3 text-left font-medium text-gray-600">Customer</th>
              <th className="px-3 py-3 text-left font-medium text-gray-600">Status</th>
              <th className="px-3 py-3 text-right font-medium text-gray-600">Customer net (ex VAT)</th>
              <th className="px-3 py-3 text-right font-medium text-gray-600">Supplier cost</th>
              <th className="px-3 py-3 text-right font-medium text-gray-600">GP</th>
              <th className="px-3 py-3 text-center font-medium text-gray-600">Lines</th>
              <th className="px-3 py-3 text-center font-medium text-gray-600">PDFs</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-10 text-center text-gray-500">
                  No jobs yet.{" "}
                  <Link className="font-medium text-ht-slate underline" to={platformPath("/jobs/create")}>
                    Create a job
                  </Link>
                  .
                </td>
              </tr>
            ) : (
              sorted.map((j) => {
                const net = resolveInvoiceValueExVat(j);
                const cost = effectiveSupplierCostExVat(j);
                const gp = computeJobGpExVat(j);
                const nLines = j.supplierInvoiceLines?.length ?? 0;
                const open = expandedId === j.id;
                const gpClass =
                  gp.profit < 0 ? "text-red-600" : gp.profit < 50 ? "text-orange-600" : "text-green-700";

                return (
                  <Fragment key={j.id}>
                    <tr className="border-b border-ht-border/70 hover:bg-ht-canvas/40">
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() => (open ? closeRow() : openRow(j))}
                          className="rounded p-1 text-gray-500 hover:bg-gray-100"
                          aria-expanded={open}
                          aria-label={open ? "Collapse" : "Expand"}
                        >
                          {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </button>
                      </td>
                      <td className="px-3 py-2 font-medium">
                        <Link to={platformPath(`/jobs/${j.id}`)} className="text-ht-slate hover:underline">
                          {j.jobNumber}
                        </Link>
                      </td>
                      <td className="max-w-[160px] truncate px-3 py-2 text-gray-700" title={j.customerName}>
                        {j.customerName}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-gray-600">{j.status}</td>
                      <td className="px-3 py-2 text-right font-mono text-gray-800">{fmtMoney(net)}</td>
                      <td className="px-3 py-2 text-right font-mono text-gray-800">{fmtMoney(cost)}</td>
                      <td className={`px-3 py-2 text-right font-mono font-semibold ${gpClass}`}>{fmtMoney(gp.profit)}</td>
                      <td className="px-3 py-2 text-center text-gray-600">{nLines}</td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => setCompareJobId(j.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-ht-slate/30 bg-white px-2 py-1 text-xs font-medium text-ht-navy hover:bg-ht-slate/5"
                          title="Customer vs supplier totals and linked PDFs"
                        >
                          <GitCompare size={14} aria-hidden />
                          <span className="hidden sm:inline">Compare</span>
                        </button>
                      </td>
                    </tr>
                    {open && expandedJob && expandedJob.id === j.id && (
                      <tr className="border-b border-ht-border bg-amber-50/40">
                        <td colSpan={9} className="px-4 py-4">
                          <div className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                <FileUp size={18} className="text-ht-slate" aria-hidden />
                                Supplier documents for {j.jobNumber}
                              </h3>
                              <div className="flex flex-wrap gap-2">
                                <Btn type="button" onClick={saveDraft}>
                                  Save supplier lines
                                </Btn>
                                <Btn type="button" variant="outline" onClick={() => setCompareJobId(j.id)}>
                                  <GitCompare size={16} className="shrink-0" aria-hidden />
                                  Compare PDFs
                                </Btn>
                                <Btn type="button" variant="outline" onClick={closeRow}>
                                  Close
                                </Btn>
                              </div>
                            </div>
                            <p className="text-xs text-gray-600">
                              <Link2 size={12} className="mr-1 inline align-middle" aria-hidden />
                              Link each line to your <strong>customer invoice ref</strong> (defaults to this job’s ref or job
                              number) so accounts can match supplier costs to sales invoices.
                            </p>
                            {draftLines.length === 0 ? (
                              <p className="text-sm text-gray-500">No supplier lines yet — add amounts below (file optional).</p>
                            ) : (
                              <ul className="space-y-2">
                                {draftLines.map((line) => (
                                  <li
                                    key={line.id}
                                    className="flex flex-col gap-2 rounded-lg border border-ht-border bg-white p-3 sm:flex-row sm:flex-wrap sm:items-end"
                                  >
                                    <label className="block text-xs font-medium text-gray-600">
                                      Amount (ex VAT)
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={line.amountExVat}
                                        onChange={(e) =>
                                          updateLine(line.id, { amountExVat: parseFloat(e.target.value) || 0 })
                                        }
                                        className="mt-0.5 w-full rounded border border-gray-200 px-2 py-1.5 font-mono text-sm sm:w-28"
                                      />
                                    </label>
                                    <label className="min-w-[140px] flex-1 text-xs font-medium text-gray-600">
                                      Supplier inv. ref
                                      <input
                                        value={line.supplierInvoiceRef ?? ""}
                                        onChange={(e) => updateLine(line.id, { supplierInvoiceRef: e.target.value })}
                                        className="mt-0.5 w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
                                        placeholder="Their invoice no."
                                      />
                                    </label>
                                    <label className="min-w-[140px] flex-1 text-xs font-medium text-gray-600">
                                      Linked customer inv. ref
                                      <input
                                        value={line.linkedCustomerInvoiceRef ?? ""}
                                        onChange={(e) =>
                                          updateLine(line.id, { linkedCustomerInvoiceRef: e.target.value })
                                        }
                                        className="mt-0.5 w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
                                        placeholder={defaultCustomerInvRef(j)}
                                      />
                                    </label>
                                    <div className="flex flex-wrap items-center gap-2">
                                      {line.fileDataUrl && line.fileName ? (
                                        <a
                                          href={line.fileDataUrl}
                                          download={line.fileName}
                                          className="text-sm font-medium text-ht-slate underline"
                                        >
                                          {line.fileName}
                                        </a>
                                      ) : (
                                        <span className="text-xs text-gray-400">No file</span>
                                      )}
                                      <Btn
                                        type="button"
                                        variant="outline"
                                        className="gap-1 border-red-200 text-red-800 hover:bg-red-50"
                                        onClick={() => removeLine(line.id)}
                                      >
                                        <Trash2 size={14} aria-hidden /> Remove
                                      </Btn>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                            <div className="rounded-lg border border-dashed border-ht-border bg-white p-4">
                              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Add line</p>
                              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <label className="text-xs font-medium text-gray-600">
                                  Amount (ex VAT) *
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={newAmount}
                                    onChange={(e) => setNewAmount(e.target.value)}
                                    className="mt-0.5 w-full rounded border border-gray-200 px-2 py-2 font-mono text-sm"
                                  />
                                </label>
                                <label className="text-xs font-medium text-gray-600">
                                  Supplier inv. ref
                                  <input
                                    value={newSupRef}
                                    onChange={(e) => setNewSupRef(e.target.value)}
                                    className="mt-0.5 w-full rounded border border-gray-200 px-2 py-2 text-sm"
                                  />
                                </label>
                                <label className="text-xs font-medium text-gray-600">
                                  Customer inv. ref (link)
                                  <input
                                    value={newCustRef}
                                    onChange={(e) => setNewCustRef(e.target.value)}
                                    className="mt-0.5 w-full rounded border border-gray-200 px-2 py-2 text-sm"
                                    placeholder={defaultCustomerInvRef(j)}
                                  />
                                </label>
                                <div className="text-xs font-medium text-gray-600">
                                  File (optional)
                                  <input
                                    ref={addFileRef}
                                    type="file"
                                    accept="image/*,.pdf,application/pdf"
                                    className="mt-1 block w-full text-xs text-gray-600 file:mr-2 file:rounded file:border-0 file:bg-ht-slate file:px-2 file:py-1 file:text-white"
                                  />
                                </div>
                              </div>
                              <Btn
                                type="button"
                                className="mt-3"
                                variant="outline"
                                onClick={() => addLineFromForm(addFileRef.current?.files?.[0] ?? null)}
                              >
                                Add line
                              </Btn>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </Card>

      <JobInvoiceCompareModal
        job={compareJob}
        open={compareJob != null}
        onClose={() => setCompareJobId(null)}
        userId={user?.id}
        preparedBy={user?.name}
      />
    </div>
  );
}

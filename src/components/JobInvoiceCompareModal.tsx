import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, X } from "lucide-react";
import { createJobInvoicePdfObjectUrl } from "../lib/invoicePdf";
import { getUserCompanyDetails } from "../lib/userCompanyProfile";
import { jobNetExVat, resolveInvoiceValueExVat } from "../lib/jobNetAmount";
import { computeJobGpExVat, effectiveSupplierCostExVat } from "../lib/jobProfit";
import { Btn } from "./Layout";
import { platformPath } from "../routes/paths";
import type { Job, SupplierInvoiceLine } from "../types";

function fmt(n: number): string {
  return `£${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function supplierFileKind(line: SupplierInvoiceLine): "pdf" | "image" | "other" | "none" {
  const u = line.fileDataUrl?.trim() ?? "";
  if (!u) return "none";
  if (/data:application\/pdf/i.test(u)) return "pdf";
  if (/data:image\//i.test(u)) return "image";
  return "other";
}

export function JobInvoiceCompareModal({
  job,
  open,
  onClose,
  userId,
  preparedBy,
}: {
  job: Job | null;
  open: boolean;
  onClose: () => void;
  userId: string | undefined;
  preparedBy: string | undefined;
}) {
  const [customerUrl, setCustomerUrl] = useState<string | null>(null);
  const [customerErr, setCustomerErr] = useState<string | null>(null);
  const revokeCustomer = useRef<(() => void) | null>(null);
  const [supplierIdx, setSupplierIdx] = useState(0);

  const linesWithFiles = useMemo(() => {
    const lines = job?.supplierInvoiceLines ?? [];
    return lines.filter((l) => Boolean(l.fileDataUrl?.trim()));
  }, [job?.supplierInvoiceLines]);

  const linesAll = job?.supplierInvoiceLines ?? [];

  useEffect(() => {
    setSupplierIdx(0);
  }, [job?.id, open]);

  useEffect(() => {
    if (!open || !job) {
      revokeCustomer.current?.();
      revokeCustomer.current = null;
      setCustomerUrl(null);
      setCustomerErr(null);
      return;
    }

    let cancelled = false;
    setCustomerErr(null);

    (async () => {
      try {
        const details = getUserCompanyDetails(userId);
        const { url, revoke } = await createJobInvoicePdfObjectUrl(job, { details, preparedBy });
        if (cancelled) {
          revoke();
          return;
        }
        revokeCustomer.current?.();
        revokeCustomer.current = revoke;
        setCustomerUrl(url);
      } catch {
        if (!cancelled) {
          setCustomerErr("Could not build customer invoice PDF.");
          setCustomerUrl(null);
        }
      }
    })();

    return () => {
      cancelled = true;
      revokeCustomer.current?.();
      revokeCustomer.current = null;
      setCustomerUrl(null);
    };
  }, [open, job?.id, job?.officeRevision, userId, preparedBy]);

  if (!open || !job) return null;

  const pdfNet = jobNetExVat(job);
  const gpNet = resolveInvoiceValueExVat(job);
  const overrideDiffers = Math.round((pdfNet - gpNet) * 100) !== 0;
  const supplierTotal = effectiveSupplierCostExVat(job);
  const gp = computeJobGpExVat(job);
  const activeSupplierLine = linesWithFiles[supplierIdx];
  const activeSupplierKind = activeSupplierLine ? supplierFileKind(activeSupplierLine) : "none";

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="compare-modal-title">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close" onClick={onClose} />
      <div className="relative flex max-h-[95vh] w-full max-w-6xl flex-col rounded-t-xl border border-ht-border bg-white shadow-xl sm:rounded-xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-ht-border px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 id="compare-modal-title" className="flex items-center gap-2 text-lg font-semibold text-ht-navy">
              <FileText size={22} className="shrink-0 text-ht-slate" aria-hidden />
              <span className="truncate">Linked totals & PDFs — {job.jobNumber}</span>
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Customer sales invoice (left) vs supplier uploads (right). Totals use the same figures as invoicing & GP.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>

        <div className="shrink-0 border-b border-ht-border bg-ht-canvas/50 px-4 py-3 sm:px-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-ht-border bg-white px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Customer PDF net (ex VAT)</div>
              <div className="font-mono text-lg font-semibold text-gray-900">{fmt(pdfNet)}</div>
              <div className="text-[11px] text-slate-500">Sell + fuel + extras on the PDF</div>
            </div>
            {overrideDiffers ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-900">Invoiced value (GP)</div>
                <div className="font-mono text-lg font-semibold text-amber-950">{fmt(gpNet)}</div>
                <div className="text-[11px] text-amber-900">Bibby / override on job — differs from PDF</div>
              </div>
            ) : (
              <div className="rounded-lg border border-ht-border bg-white px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Invoiced value (GP)</div>
                <div className="font-mono text-lg font-semibold text-gray-900">{fmt(gpNet)}</div>
                <div className="text-[11px] text-slate-500">Matches PDF net</div>
              </div>
            )}
            <div className="rounded-lg border border-ht-border bg-white px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Supplier cost (ex VAT)</div>
              <div className="font-mono text-lg font-semibold text-gray-900">{fmt(supplierTotal)}</div>
              <div className="text-[11px] text-slate-500">Sum of lines or buy price</div>
            </div>
            <div className="rounded-lg border border-ht-border bg-white px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Gross profit (ex VAT)</div>
              <div
                className={`font-mono text-lg font-semibold ${gp.profit < 0 ? "text-red-600" : gp.profit < 50 ? "text-orange-600" : "text-green-700"}`}
              >
                {fmt(gp.profit)}
              </div>
              <div className="text-[11px] text-slate-500">{gp.margin.toFixed(1)}% margin on invoiced value</div>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <Link className="font-medium text-ht-slate underline" to={platformPath("/customer-invoicing")}>
              Customer invoicing
            </Link>
            <span className="text-slate-400">·</span>
            <Link className="font-medium text-ht-slate underline" to={platformPath(`/supplier-invoicing?job=${job.id}`)}>
              Supplier invoicing
            </Link>
            <span className="text-slate-400">·</span>
            <Link className="font-medium text-ht-slate underline" to={platformPath(`/jobs/${job.id}`)}>
              Job detail
            </Link>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 divide-y divide-ht-border lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          <div className="flex min-h-[40vh] flex-col lg:min-h-[min(70vh,560px)]">
            <div className="shrink-0 border-b border-ht-border bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
              Customer sales invoice (PDF)
            </div>
            <div className="min-h-0 flex-1 bg-slate-100 p-2">
              {customerErr ? (
                <p className="p-4 text-sm text-red-700">{customerErr}</p>
              ) : customerUrl ? (
                <iframe title="Customer invoice PDF" src={customerUrl} className="h-full min-h-[360px] w-full rounded border border-ht-border bg-white" />
              ) : (
                <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-slate-500">Generating PDF…</div>
              )}
            </div>
          </div>

          <div className="flex min-h-[40vh] flex-col lg:min-h-[min(70vh,560px)]">
            <div className="shrink-0 border-b border-ht-border bg-slate-50 px-3 py-2">
              <div className="text-xs font-semibold text-slate-700">Supplier invoice(s)</div>
              {linesWithFiles.length > 1 ? (
                <select
                  className="mt-1 w-full max-w-md rounded border border-ht-border px-2 py-1 text-xs"
                  value={supplierIdx}
                  onChange={(e) => setSupplierIdx(parseInt(e.target.value, 10) || 0)}
                >
                  {linesWithFiles.map((line, i) => (
                    <option key={line.id} value={i}>
                      {line.fileName ?? `Line ${i + 1}`} · {fmt(Number(line.amountExVat) || 0)} ex VAT
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
            <div className="min-h-0 flex-1 bg-slate-100 p-2">
              {linesAll.length === 0 ? (
                <p className="p-4 text-sm text-slate-600">
                  No supplier lines on this job. Add costs under{" "}
                  <Link className="font-medium text-ht-slate underline" to={platformPath(`/supplier-invoicing?job=${job.id}`)}>
                    Supplier invoicing
                  </Link>
                  .
                </p>
              ) : linesWithFiles.length === 0 ? (
                <div className="space-y-3 p-3">
                  <p className="text-sm text-slate-600">
                    Supplier amounts are recorded but there is no scan/PDF on file. Upload a document on each line to compare visually
                    alongside the customer invoice.
                  </p>
                  <ul className="rounded-lg border border-ht-border bg-white text-sm">
                    {linesAll.map((line) => (
                      <li key={line.id} className="flex justify-between border-b border-ht-border/60 px-3 py-2 last:border-0">
                        <span className="text-slate-700">{line.supplierInvoiceRef?.trim() || "Supplier line"}</span>
                        <span className="font-mono font-medium">{fmt(Number(line.amountExVat) || 0)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : activeSupplierLine ? (
                <div className="flex h-full min-h-[360px] flex-col gap-2">
                  <div className="shrink-0 rounded border border-ht-border bg-white px-2 py-1.5 text-xs text-slate-600">
                    <span className="font-mono font-semibold text-gray-900">{fmt(Number(activeSupplierLine.amountExVat) || 0)}</span>
                    {" ex VAT"}
                    {activeSupplierLine.supplierInvoiceRef?.trim() ? (
                      <>
                        {" · "}
                        <span className="text-slate-700">Ref {activeSupplierLine.supplierInvoiceRef.trim()}</span>
                      </>
                    ) : null}
                    {activeSupplierLine.linkedCustomerInvoiceRef?.trim() ? (
                      <>
                        {" · "}
                        <span>Linked customer inv.: {activeSupplierLine.linkedCustomerInvoiceRef.trim()}</span>
                      </>
                    ) : null}
                  </div>
                  {(() => {
                    const sk = activeSupplierKind;
                    if (sk === "image") {
                      return (
                        <div className="min-h-0 flex-1 overflow-auto rounded border border-ht-border bg-white p-2">
                          <img
                            src={activeSupplierLine.fileDataUrl!}
                            alt={activeSupplierLine.fileName ?? "Supplier document"}
                            className="mx-auto max-h-[min(480px,50vh)] w-auto max-w-full object-contain"
                          />
                        </div>
                      );
                    }
                    if (sk === "pdf") {
                      return (
                        <iframe
                          title="Supplier document"
                          src={activeSupplierLine.fileDataUrl!}
                          className="min-h-[320px] flex-1 w-full rounded border border-ht-border bg-white"
                        />
                      );
                    }
                    return (
                      <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded border border-ht-border bg-white p-6 text-center">
                        <p className="text-sm text-slate-600">Inline preview is not available for this file type.</p>
                        {activeSupplierLine.fileName ? (
                          <a
                            href={activeSupplierLine.fileDataUrl!}
                            download={activeSupplierLine.fileName}
                            className="text-sm font-medium text-ht-slate underline"
                          >
                            Download {activeSupplierLine.fileName}
                          </a>
                        ) : (
                          <a href={activeSupplierLine.fileDataUrl!} download className="text-sm font-medium text-ht-slate underline">
                            Download file
                          </a>
                        )}
                      </div>
                    );
                  })()}
                  {activeSupplierLine.fileName && activeSupplierKind !== "other" ? (
                    <a
                      href={activeSupplierLine.fileDataUrl!}
                      download={activeSupplierLine.fileName}
                      className="shrink-0 text-center text-xs font-medium text-ht-slate underline"
                    >
                      Download {activeSupplierLine.fileName}
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-ht-border px-4 py-3 sm:flex sm:justify-end">
          <Btn type="button" variant="outline" onClick={onClose}>
            Close
          </Btn>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, FileCheck } from "lucide-react";
import { Btn, Card } from "../components/Layout";
import { MissingFieldLegend, ReqStar, WhyThisSection } from "../components/FormGuidance";
import { useAuth } from "../context/AuthContext";
import { useLocalStorage } from "../hooks/useLocalStorage";
import type { Quotation, QuotationCostLine, QuotationStatus } from "../types";
import { QUOTATIONS_WHY } from "../lib/fieldRequirementCopy";
import { notifyError, notifySuccess } from "../lib/platformNotify";
import {
  approveAllQuotationPrices,
  createManualQuotationDraft,
  nextQuotationNumber,
  quotationNetExVat,
  QUOTATIONS_STORAGE_KEY,
  revokeQuotationPriceApproval,
} from "../lib/quotationStorage";
import { downloadQuotationCustomerPdf, downloadQuotationStaffPdf } from "../lib/quotationPdf";
import { getUserCompanyDetails } from "../lib/userCompanyProfile";
import { platformPath } from "../routes/paths";

function newLine(): QuotationCostLine {
  return { id: crypto.randomUUID(), label: "", amountExVat: 0, approved: false };
}

export default function QuotationDetailPage() {
  const { quotationId } = useParams<{ quotationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quotations, setQuotations] = useLocalStorage<Quotation[]>(QUOTATIONS_STORAGE_KEY, []);
  const [model, setModel] = useState<Quotation | null>(null);

  const isNew = quotationId === "new";
  const existing = useMemo(
    () => (quotationId && !isNew ? quotations.find((q) => q.id === quotationId) : undefined),
    [quotations, quotationId, isNew]
  );

  useEffect(() => {
    if (quotationId === "new") {
      setModel(createManualQuotationDraft());
      return;
    }
    if (existing) {
      setModel({ ...existing });
    } else {
      setModel(null);
    }
  }, [quotationId, existing?.id, existing?.updatedAt]);

  if (!quotationId) {
    return null;
  }

  if (!isNew && !existing) {
    return (
      <div className="space-y-4">
        <Link to={platformPath("/quotations")} className="inline-flex items-center gap-2 text-sm font-medium text-ht-slate hover:underline">
          <ArrowLeft size={16} aria-hidden />
          Back to quotations
        </Link>
        <Card className="p-8 text-center text-slate-600">Quotation not found.</Card>
      </div>
    );
  }

  if (!model) {
    return null;
  }

  const nowIso = () => new Date().toISOString();

  const patch = (p: Partial<Quotation>) => {
    setModel((m) => (m ? { ...m, ...p, updatedAt: nowIso() } : m));
  };

  const patchLines = (lines: QuotationCostLine[]) => {
    patch({
      costLines: lines,
      pricesApproved: false,
      pricesApprovedByUserId: undefined,
      pricesApprovedByName: undefined,
      pricesApprovedAt: undefined,
      status: lines.length > 0 ? "in_review" : "submitted",
    });
  };

  const saveToList = (q: Quotation) => {
    setQuotations((prev) => {
      const i = prev.findIndex((x) => x.id === q.id);
      if (i < 0) return [...prev, q];
      const next = [...prev];
      next[i] = q;
      return next;
    });
  };

  const handleSave = () => {
    let q = { ...model, updatedAt: nowIso() };
    if (q.quotationNumber === "(unsaved)") {
      q = { ...q, quotationNumber: nextQuotationNumber() };
    }
    saveToList(q);
    setModel(q);
    if (isNew) {
      navigate(platformPath(`/quotations/${q.id}`), { replace: true });
    }
    notifySuccess("Quotation saved");
  };

  const handleApprove = () => {
    if (!user) {
      notifyError("Sign in required", { description: "Only a logged-in user can approve prices." });
      return;
    }
    if (model.costLines.length === 0) {
      notifyError("Add at least one cost line before approving.");
      return;
    }
    const next = approveAllQuotationPrices(model, user);
    setModel(next);
    saveToList(next);
    notifySuccess("Prices approved", { description: "You can now export the customer PDF." });
  };

  const handleRevokeApproval = () => {
    const next = revokeQuotationPriceApproval(model);
    setModel(next);
    saveToList(next);
    notifySuccess("Approval cleared", { description: "Customer PDF is disabled until you approve again." });
  };

  const details = getUserCompanyDetails(user?.id);
  const net = quotationNetExVat(model);

  const downloadStaff = async () => {
    try {
      await downloadQuotationStaffPdf(model, details, user?.name);
      notifySuccess("Internal PDF downloaded");
    } catch (e) {
      notifyError("Could not build PDF", { description: String(e) });
    }
  };

  const downloadCustomer = async () => {
    try {
      await downloadQuotationCustomerPdf(model, details, user?.name);
      notifySuccess("Customer PDF downloaded");
    } catch (e) {
      notifyError("Customer PDF blocked", { description: String(e) });
    }
  };

  const setField = (k: keyof Quotation, v: string) => patch({ [k]: v } as Partial<Quotation>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          to={platformPath("/quotations")}
          className="inline-flex items-center gap-2 text-sm font-medium text-ht-slate hover:underline"
        >
          <ArrowLeft size={16} aria-hidden />
          Quotations
        </Link>
        <div className="flex flex-wrap gap-2">
          <Btn variant="outline" type="button" className="gap-2" onClick={() => void downloadStaff()}>
            <Download size={16} aria-hidden />
            Internal PDF
          </Btn>
          <Btn
            type="button"
            className="gap-2"
            disabled={!model.pricesApproved}
            onClick={() => void downloadCustomer()}
            title={!model.pricesApproved ? "Approve prices first" : undefined}
          >
            <FileCheck size={16} aria-hidden />
            Customer PDF
          </Btn>
          <Btn type="button" onClick={handleSave}>
            Save
          </Btn>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-ht-navy">{model.quotationNumber}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {isNew ? "New draft — save to log it." : "Edit costs and journey; approve when ready for customer-facing PDF."}
        </p>
      </div>

      <WhyThisSection>{QUOTATIONS_WHY}</WhyThisSection>
      <MissingFieldLegend />

      <Card className="overflow-hidden">
        <div className="border-b border-ht-border bg-ht-canvas/40 px-5 py-3">
          <h2 className="text-lg font-semibold text-ht-navy">Office workflow</h2>
        </div>
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Status</span>
            <select
              className="rounded-lg border border-ht-border px-2 py-1.5 text-sm"
              value={model.status}
              onChange={(e) => patch({ status: e.target.value as QuotationStatus })}
            >
              <option value="submitted">Submitted</option>
              <option value="in_review">In review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          {!model.pricesApproved ? (
            <Btn type="button" className="gap-2" onClick={handleApprove} disabled={!user}>
              Approve all prices (logged-in)
            </Btn>
          ) : (
            <Btn variant="outline" type="button" onClick={handleRevokeApproval}>
              Clear price approval
            </Btn>
          )}
          <p className="text-xs text-slate-500 sm:w-full sm:pl-0">
            Net ex VAT (when lines exist): <strong className="font-mono">£{net.toFixed(2)}</strong>
            {model.pricesApproved && model.pricesApprovedByName ? (
              <>
                {" "}
                — approved by {model.pricesApprovedByName}
              </>
            ) : null}
          </p>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-ht-border bg-ht-canvas/40 px-5 py-3">
          <h2 className="text-lg font-semibold text-ht-navy">Customer & journey</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          {(
            [
              ["companyName", "Company name"],
              ["customerName", "Contact name"],
              ["customerEmail", "Email"],
              ["customerPhone", "Phone"],
            ] as const
          ).map(([k, label]) => (
            <div key={k}>
              <label className="mb-1 block text-sm font-medium">{label}</label>
              <input
                className="w-full rounded-lg border border-ht-border px-3 py-2 text-sm"
                value={model[k]}
                onChange={(e) => setField(k, e.target.value)}
              />
            </div>
          ))}
          <div>
            <label className="mb-1 block text-sm font-medium">Service</label>
            <select
              className="w-full rounded-lg border border-ht-border px-3 py-2 text-sm"
              value={model.serviceType}
              onChange={(e) => setField("serviceType", e.target.value)}
            >
              <option value="">Select…</option>
              <option value="domestic">UK domestic</option>
              <option value="international">International</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Vehicle type</label>
            <select
              className="w-full rounded-lg border border-ht-border px-3 py-2 text-sm"
              value={model.vehicleType}
              onChange={(e) => setField("vehicleType", e.target.value)}
            >
              <option value="">Select…</option>
              <option value="van">Van</option>
              <option value="rigid">Rigid</option>
              <option value="artic">Artic</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Collection postcode</label>
            <input
              className="w-full rounded-lg border border-ht-border px-3 py-2 text-sm"
              value={model.collectionPostcode}
              onChange={(e) => setField("collectionPostcode", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Delivery postcode</label>
            <input
              className="w-full rounded-lg border border-ht-border px-3 py-2 text-sm"
              value={model.deliveryPostcode}
              onChange={(e) => setField("deliveryPostcode", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Collection date</label>
            <input
              type="date"
              className="w-full rounded-lg border border-ht-border px-3 py-2 text-sm"
              value={model.collectionDate}
              onChange={(e) => setField("collectionDate", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Delivery date</label>
            <input
              type="date"
              className="w-full rounded-lg border border-ht-border px-3 py-2 text-sm"
              value={model.deliveryDate}
              onChange={(e) => setField("deliveryDate", e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium">Special requirements</label>
            <textarea
              className="min-h-[72px] w-full rounded-lg border border-ht-border px-3 py-2 text-sm"
              value={model.specialRequirements}
              onChange={(e) => setField("specialRequirements", e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium">Internal notes</label>
            <textarea
              className="min-h-[72px] w-full rounded-lg border border-ht-border px-3 py-2 text-sm"
              value={model.notesInternal}
              onChange={(e) => setField("notesInternal", e.target.value)}
            />
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-ht-border bg-ht-canvas/40 px-5 py-3">
          <h2 className="text-lg font-semibold text-ht-navy">Cost lines (ex VAT)</h2>
          <p className="mt-1 text-xs text-slate-600">Edit labels and amounts. Approve when the total is ready to share.</p>
        </div>
        <div className="space-y-3 p-5">
          {model.costLines.length === 0 ? (
            <p className="text-sm text-slate-600">No lines yet — add transport, fuel, or other charges.</p>
          ) : (
            model.costLines.map((line, idx) => (
              <div key={line.id} className="flex flex-col gap-2 rounded-lg border border-ht-border p-3 md:flex-row md:items-end">
                <div className="min-w-0 flex-1">
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Description
                    <ReqStar show={!line.label.trim()} why="Each line needs a label for the PDF." />
                  </label>
                  <input
                    className="w-full rounded-lg border border-ht-border px-3 py-2 text-sm"
                    value={line.label}
                    onChange={(e) => {
                      const lines = [...model.costLines];
                      lines[idx] = { ...line, label: e.target.value };
                      patchLines(lines);
                    }}
                  />
                </div>
                <div className="w-full md:w-36">
                  <label className="mb-1 block text-xs font-medium text-gray-700">Amount £</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full rounded-lg border border-ht-border px-3 py-2 text-sm"
                    value={line.amountExVat}
                    onChange={(e) => {
                      const lines = [...model.costLines];
                      lines[idx] = { ...line, amountExVat: parseFloat(e.target.value) || 0 };
                      patchLines(lines);
                    }}
                  />
                </div>
                <Btn
                  variant="outline"
                  type="button"
                  className="md:mb-0.5"
                  onClick={() => patchLines(model.costLines.filter((l) => l.id !== line.id))}
                >
                  Remove
                </Btn>
              </div>
            ))
          )}
          <Btn
            variant="outline"
            type="button"
            onClick={() => patchLines([...model.costLines, newLine()])}
          >
            Add line
          </Btn>
        </div>
      </Card>
    </div>
  );
}

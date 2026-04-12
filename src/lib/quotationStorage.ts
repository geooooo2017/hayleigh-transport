import type {
  PublicQuoteFormShape,
  Quotation,
  QuotationSettings,
  QuotationStatus,
  User,
} from "../types";
import { suggestQuotationCostLines } from "./quotationEngine";

export const QUOTATIONS_STORAGE_KEY = "ht_quotations_v1";
const QUOTATION_SEQ_KEY = "ht_quotation_seq";

export function quotationNetExVat(q: Quotation): number {
  return q.costLines.reduce((s, l) => s + (Number(l.amountExVat) || 0), 0);
}

export function readQuotations(): Quotation[] {
  try {
    const raw = localStorage.getItem(QUOTATIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isQuotationLike) as Quotation[];
  } catch {
    return [];
  }
}

function isQuotationLike(x: unknown): x is Quotation {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.quotationNumber === "string" &&
    typeof o.customerName === "string" &&
    Array.isArray(o.costLines)
  );
}

export function writeQuotations(list: Quotation[]) {
  try {
    localStorage.setItem(QUOTATIONS_STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* quota */
  }
}

export function appendQuotation(q: Quotation) {
  const list = readQuotations();
  list.push(q);
  writeQuotations(list);
}

export function nextQuotationNumber(): string {
  const prev = parseInt(localStorage.getItem(QUOTATION_SEQ_KEY) || "0", 10);
  const n = Number.isFinite(prev) ? prev + 1 : 1;
  localStorage.setItem(QUOTATION_SEQ_KEY, String(n));
  return `HT-Q-${String(n).padStart(5, "0")}`;
}

export function createQuotationFromPublicRequest(form: PublicQuoteFormShape, settings: QuotationSettings): Quotation {
  const id = crypto.randomUUID();
  const quotationNumber = nextQuotationNumber();
  const now = new Date().toISOString();
  let costLines: Quotation["costLines"] = [];
  let estimatedDistanceMiles: number | undefined;
  let estimatedDurationText: string | undefined;
  if (settings.mode === "automatic") {
    const sug = suggestQuotationCostLines(form, settings.rateCard);
    costLines = sug.lines;
    estimatedDistanceMiles = sug.estimatedDistanceMiles;
    estimatedDurationText = sug.estimatedDurationText;
  }
  const status: QuotationStatus = costLines.length > 0 ? "in_review" : "submitted";
  return {
    id,
    quotationNumber,
    createdAt: now,
    updatedAt: now,
    source: "public_request",
    status,
    pricesApproved: false,
    customerName: form.customerName.trim(),
    customerEmail: form.customerEmail.trim(),
    customerPhone: form.customerPhone.trim(),
    companyName: form.companyName.trim(),
    serviceType: form.serviceType,
    collectionPostcode: form.collectionPostcode.trim(),
    deliveryPostcode: form.deliveryPostcode.trim(),
    collectionDate: form.collectionDate,
    deliveryDate: form.deliveryDate,
    vehicleType: form.vehicleType,
    goodsType: form.goodsType,
    weight: form.weight,
    length: form.length,
    width: form.width,
    height: form.height,
    specialRequirements: form.specialRequirements,
    costLines,
    notesInternal: "",
    estimatedDistanceMiles,
    estimatedDurationText,
  };
}

/** Draft for /quotations/new — real HT-Q- number is assigned on first Save. */
export function createManualQuotationDraft(): Quotation {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  return {
    id,
    quotationNumber: "(unsaved)",
    createdAt: now,
    updatedAt: now,
    source: "manual",
    status: "submitted",
    pricesApproved: false,
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    companyName: "",
    serviceType: "",
    collectionPostcode: "",
    deliveryPostcode: "",
    collectionDate: "",
    deliveryDate: "",
    vehicleType: "",
    goodsType: "",
    weight: "",
    length: "",
    width: "",
    height: "",
    specialRequirements: "",
    costLines: [],
    notesInternal: "",
  };
}

export function approveAllQuotationPrices(q: Quotation, user: User): Quotation {
  const now = new Date().toISOString();
  const lines = q.costLines.map((l) => ({
    ...l,
    approved: true,
    approvedByUserId: user.id,
    approvedByName: user.name,
    approvedAt: now,
  }));
  return {
    ...q,
    costLines: lines,
    pricesApproved: true,
    pricesApprovedByUserId: user.id,
    pricesApprovedByName: user.name,
    pricesApprovedAt: now,
    status: "approved",
    updatedAt: now,
  };
}

export function revokeQuotationPriceApproval(q: Quotation): Quotation {
  const now = new Date().toISOString();
  const lines = q.costLines.map((l) => ({
    ...l,
    approved: false,
    approvedByUserId: undefined,
    approvedByName: undefined,
    approvedAt: undefined,
  }));
  return {
    ...q,
    costLines: lines,
    pricesApproved: false,
    pricesApprovedByUserId: undefined,
    pricesApprovedByName: undefined,
    pricesApprovedAt: undefined,
    status: q.costLines.length > 0 ? "in_review" : "submitted",
    updatedAt: now,
  };
}

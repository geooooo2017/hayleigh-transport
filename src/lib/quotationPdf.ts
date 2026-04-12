import { jsPDF } from "jspdf";
import type { Quotation } from "../types";
import { COMPANY_LEGAL_NAME, LOGO_PATH } from "./companyBrand";
import { INVOICE_VAT_RATE } from "./invoicePdf";
import type { UserCompanyDetails } from "./userCompanyProfile";
import { quotationNetExVat } from "./quotationStorage";

const MARGIN = 15;
const PAGE_W = 210;
const MAX_TEXT_W = PAGE_W - 2 * MARGIN;
const LINE_MM = 5;
const FOOTER_MAX_Y = 278;
const COL_DESC = MARGIN;
const COL_NET = PAGE_W - MARGIN - 32;

function fmtDate(s: string): string {
  if (!s?.trim()) return "—";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmtMoney(n: number): string {
  return `£${Number(n).toFixed(2)}`;
}

async function loadLogoPngDataUrl(): Promise<string | null> {
  try {
    const res = await fetch(LOGO_PATH);
    if (!res.ok) return null;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("logo"));
      img.src = url;
    });
    const maxW = 300;
    const maxH = 200;
    const nw = img.naturalWidth || maxW;
    const nh = img.naturalHeight || maxH;
    const scale = Math.min(maxW / nw, maxH / nh, 1);
    const cw = Math.max(1, Math.round(nw * scale));
    const ch = Math.max(1, Math.round(nh * scale));
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      URL.revokeObjectURL(url);
      return null;
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, 0, 0, cw, ch);
    URL.revokeObjectURL(url);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

function nextPageIfNeeded(doc: jsPDF, y: number, blockMm: number): number {
  if (y + blockMm > FOOTER_MAX_Y) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

function addIssuerContactBlock(doc: jsPDF, y: number, d: UserCompanyDetails, preparedBy?: string): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(90);
  const t = (s: string) => s.trim();
  const lines: string[] = [];
  if (t(d.companyLegalName)) lines.push(t(d.companyLegalName));
  if (t(d.telephone)) lines.push(`Tel: ${t(d.telephone)}`);
  if (t(d.mobile)) lines.push(`Mob: ${t(d.mobile)}`);
  if (t(d.email)) lines.push(`Email: ${t(d.email)}`);
  if (t(d.website)) lines.push(`Website: ${t(d.website)}`);
  lines.push("");
  lines.push("Company details");
  if (t(d.companyNumber)) lines.push(`Company Number: ${t(d.companyNumber)}`);
  if (t(d.vatNumber)) lines.push(`GB VAT Number: ${t(d.vatNumber)}`);
  if (t(d.eoriNumber)) lines.push(`EORI Number: ${t(d.eoriNumber)}`);
  if (t(preparedBy ?? "")) {
    lines.push("");
    lines.push(`Quotation prepared by: ${t(preparedBy!)}`);
  }
  for (const line of lines) {
    if (line === "") {
      y += 2;
      continue;
    }
    y = nextPageIfNeeded(doc, y, 6);
    doc.text(line, MARGIN, y);
    y += 4;
  }
  doc.setTextColor(0);
  return y + 3;
}

function textRight(doc: jsPDF, text: string, y: number, xRight = PAGE_W - MARGIN): void {
  doc.setFont("helvetica", "normal");
  const w = doc.getTextWidth(text);
  doc.text(text, xRight - w, y);
}

function serviceLabel(serviceType: string): string {
  if (serviceType === "international") return "International";
  if (serviceType === "domestic") return "UK domestic";
  return serviceType || "—";
}

async function buildQuotationPdfBase(
  q: Quotation,
  details: UserCompanyDetails,
  preparedBy: string | undefined,
  options: { audience: "staff" | "customer" }
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  const logo = await loadLogoPngDataUrl();
  if (logo) {
    const logoW = 52;
    const logoH = (logoW * 200) / 300;
    doc.addImage(logo, "PNG", MARGIN, y, logoW, logoH);
    y += logoH + 5;
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(details.companyLegalName.trim().toUpperCase() || "HAYLEIGH TRANSPORT", MARGIN, y + 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(details.companyLegalName.trim() || COMPANY_LEGAL_NAME, MARGIN, y + 10);
    y += 14;
  }

  y = addIssuerContactBlock(doc, y, details, preparedBy);

  if (options.audience === "staff" && !q.pricesApproved) {
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(217, 119, 6);
    doc.roundedRect(MARGIN, y, PAGE_W - 2 * MARGIN, 14, 1, 1, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(120, 53, 15);
    doc.text("Internal copy — prices are not approved for the customer yet.", MARGIN + 2, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Use “Customer PDF” only after a logged-in user approves all costs.", MARGIN + 2, y + 11);
    doc.setTextColor(0);
    y += 18;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("QUOTATION", MARGIN, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Quotation number: ${q.quotationNumber}`, MARGIN, y);
  y += LINE_MM;
  doc.text(`Date: ${fmtDate(q.createdAt)}`, MARGIN, y);
  y += LINE_MM;
  doc.text(`Source: ${q.source === "public_request" ? "Website request" : "Manual (office)"}`, MARGIN, y);
  y += 8;

  y = nextPageIfNeeded(doc, y, 48);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Customer", MARGIN, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(q.companyName || "—", MARGIN, y);
  y += LINE_MM;
  doc.text(`Contact: ${q.customerName || "—"}`, MARGIN, y);
  y += LINE_MM;
  if (q.customerEmail.trim()) {
    doc.text(q.customerEmail.trim(), MARGIN, y);
    y += LINE_MM;
  }
  if (q.customerPhone.trim()) {
    doc.text(`Tel: ${q.customerPhone.trim()}`, MARGIN, y);
    y += LINE_MM;
  }
  y += 4;

  y = nextPageIfNeeded(doc, y, 56);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Journey & load", MARGIN, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const jLines = [
    `Service: ${serviceLabel(q.serviceType)}`,
    `Collection: ${q.collectionPostcode || "—"} — ${fmtDate(q.collectionDate)}`,
    `Delivery: ${q.deliveryPostcode || "—"} — ${fmtDate(q.deliveryDate)}`,
    `Vehicle type: ${q.vehicleType || "—"}`,
  ];
  if (q.goodsType.trim()) jLines.push(`Goods: ${q.goodsType.trim()}`);
  if (q.weight.trim()) jLines.push(`Weight: ${q.weight.trim()}`);
  if (q.specialRequirements.trim()) {
    jLines.push(`Special requirements: ${q.specialRequirements.trim()}`);
  }
  if (q.estimatedDistanceMiles != null && options.audience === "staff") {
    jLines.push(`Estimated distance (internal): ${q.estimatedDistanceMiles} mi`);
  }
  for (const line of jLines) {
    const wrapped = doc.splitTextToSize(line, MAX_TEXT_W);
    y = nextPageIfNeeded(doc, y, wrapped.length * LINE_MM);
    doc.text(wrapped, MARGIN, y);
    y += wrapped.length * LINE_MM + 1;
  }
  y += 4;

  y = nextPageIfNeeded(doc, y, 50);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Description", COL_DESC, y);
  textRight(doc, "Net (ex VAT)", y, COL_NET + 32);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setDrawColor(200);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 5;

  const showMoney = options.audience === "staff" || q.pricesApproved;
  if (!showMoney) {
    doc.setFontSize(10);
    doc.setTextColor(80);
    const msg = doc.splitTextToSize(
      "Pricing will be listed here once the office has reviewed and approved this quotation. This document is intentionally without rates.",
      MAX_TEXT_W
    );
    doc.text(msg, MARGIN, y);
    doc.setTextColor(0);
    y += msg.length * LINE_MM + 8;
  } else {
    for (const row of q.costLines) {
      y = nextPageIfNeeded(doc, y, 10);
      const label =
        options.audience === "staff" && !row.approved ? `${row.label} (pending approval)` : row.label;
      const descLines = doc.splitTextToSize(label, COL_NET - MARGIN - 8);
      doc.text(descLines, COL_DESC, y);
      textRight(doc, fmtMoney(Number(row.amountExVat) || 0), y, COL_NET + 32);
      y += Math.max(descLines.length * LINE_MM, LINE_MM);
    }
  }

  if (showMoney && q.costLines.length > 0) {
    const netTotal = quotationNetExVat(q);
    const vatAmount = netTotal * INVOICE_VAT_RATE;
    const grossTotal = netTotal + vatAmount;

    y += 4;
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 7;

    doc.setFont("helvetica", "bold");
    doc.text("Subtotal (ex VAT)", COL_DESC, y);
    textRight(doc, fmtMoney(netTotal), y, COL_NET + 32);
    y += LINE_MM + 1;

    doc.setFont("helvetica", "normal");
    doc.text(`VAT @ ${INVOICE_VAT_RATE * 100}% (on net total)`, COL_DESC, y);
    textRight(doc, fmtMoney(vatAmount), y, COL_NET + 32);
    y += LINE_MM + 2;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Total (including VAT)", COL_DESC, y);
    textRight(doc, fmtMoney(grossTotal), y, COL_NET + 32);
    doc.setFontSize(10);
    y += 10;
  }

  if (q.pricesApproved && q.pricesApprovedByName) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60);
    y = nextPageIfNeeded(doc, y, 10);
    doc.text(`Prices approved by: ${q.pricesApprovedByName} — ${fmtDate(q.pricesApprovedAt ?? q.updatedAt)}`, MARGIN, y);
    doc.setTextColor(0);
    y += LINE_MM + 4;
  }

  y = nextPageIfNeeded(doc, y, 28);
  doc.setFontSize(8);
  doc.setTextColor(100);
  const foot =
    options.audience === "customer"
      ? "This quotation is subject to availability and our standard terms. Net amounts exclude VAT unless stated; VAT is shown at the standard UK rate where applicable."
      : "Internal operations document — amounts may be draft until approved. Customer-facing PDF must only be issued after approval.";
  const fl = doc.splitTextToSize(foot, MAX_TEXT_W);
  doc.text(fl, MARGIN, y);
  doc.setTextColor(0);

  return doc;
}

export async function buildQuotationStaffPdf(
  q: Quotation,
  details: UserCompanyDetails,
  preparedBy?: string
): Promise<jsPDF> {
  return buildQuotationPdfBase(q, details, preparedBy, { audience: "staff" });
}

export async function buildQuotationCustomerPdf(
  q: Quotation,
  details: UserCompanyDetails,
  preparedBy?: string
): Promise<jsPDF> {
  if (!q.pricesApproved) {
    throw new Error("Approved prices are required before generating a customer quotation PDF.");
  }
  return buildQuotationPdfBase(q, details, preparedBy, { audience: "customer" });
}

export async function downloadQuotationStaffPdf(
  q: Quotation,
  details: UserCompanyDetails,
  preparedBy?: string
): Promise<void> {
  const doc = await buildQuotationStaffPdf(q, details, preparedBy);
  const safe = q.quotationNumber.replace(/[/\\?%*:|"<>]/g, "-");
  doc.save(`Quotation-internal-${safe}.pdf`);
}

export async function downloadQuotationCustomerPdf(
  q: Quotation,
  details: UserCompanyDetails,
  preparedBy?: string
): Promise<void> {
  const doc = await buildQuotationCustomerPdf(q, details, preparedBy);
  const safe = q.quotationNumber.replace(/[/\\?%*:|"<>]/g, "-");
  doc.save(`Quotation-${safe}.pdf`);
}

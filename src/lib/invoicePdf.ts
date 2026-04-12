import { jsPDF } from "jspdf";
import type { Job } from "../types";
import { COMPANY_LEGAL_NAME, LOGO_PATH } from "./companyBrand";
import { formatAddressBlock } from "./jobAddress";
import { jobNetExVat } from "./jobNetAmount";
import type { BookingPdfIssuer } from "./jobBookingPdf";
import { defaultExportCompanyDetails, type UserCompanyDetails } from "./userCompanyProfile";

/** UK standard rate for customer-facing invoice summary. */
export const INVOICE_VAT_RATE = 0.2;

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
    lines.push(`Invoice prepared by: ${t(preparedBy!)}`);
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

/**
 * Customer sales invoice: letterhead (logo + company + user contact from Settings), bill-to, line items ex VAT, then VAT and gross.
 */
export async function buildJobInvoicePdf(job: Job, issuer?: BookingPdfIssuer): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;
  const details = issuer?.details ?? defaultExportCompanyDetails();
  const preparedBy = issuer?.preparedBy;

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

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("SALES INVOICE", MARGIN, y);
  y += 10;

  const invNo = `INV-${job.jobNumber.replace(/[/\\?%*:|"<>]/g, "-")}`;
  const invDate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Invoice number: ${invNo}`, MARGIN, y);
  y += LINE_MM;
  doc.text(`Invoice date: ${invDate}`, MARGIN, y);
  y += LINE_MM;
  doc.text(`Job reference: ${job.jobNumber}`, MARGIN, y);
  y += 8;

  y = nextPageIfNeeded(doc, y, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Bill to", MARGIN, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(job.customerName, MARGIN, y);
  y += LINE_MM;
  if (job.customerEmail?.trim()) {
    doc.text(job.customerEmail.trim(), MARGIN, y);
    y += LINE_MM;
  }
  const billAddr = formatAddressBlock(job, "delivery");
  if (billAddr && billAddr !== "—") {
    const addrLines = doc.splitTextToSize(`Delivery site:\n${billAddr}`, MAX_TEXT_W * 0.85);
    doc.text(addrLines, MARGIN, y);
    y += addrLines.length * LINE_MM + 2;
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

  const sell = Number(job.sellPrice) || 0;
  const fuel = Number(job.fuelSurcharge) || 0;
  const extra = Number(job.extraCharges) || 0;

  const lineItems: { label: string; net: number }[] = [
    { label: `Transport — ${job.jobNumber}`, net: sell },
    ...(fuel !== 0 ? [{ label: "Fuel surcharge", net: fuel }] : []),
    ...(extra !== 0 ? [{ label: "Additional charges", net: extra }] : []),
  ];

  for (const row of lineItems) {
    y = nextPageIfNeeded(doc, y, 8);
    const descLines = doc.splitTextToSize(row.label, COL_NET - MARGIN - 8);
    doc.text(descLines, COL_DESC, y);
    textRight(doc, fmtMoney(row.net), y, COL_NET + 32);
    y += Math.max(descLines.length * LINE_MM, LINE_MM);
  }

  const netTotal = jobNetExVat(job);
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
  doc.text("Total due (including VAT)", COL_DESC, y);
  textRight(doc, fmtMoney(grossTotal), y, COL_NET + 32);
  doc.setFontSize(10);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(70);
  y = addParagraphSmall(doc, `Service period: collection ${fmtDate(job.collectionDate)} — delivery ${fmtDate(job.deliveryDate)}`, y);
  doc.setTextColor(0);

  return doc;
}

function addParagraphSmall(doc: jsPDF, text: string, y: number): number {
  doc.setFontSize(9);
  const lines = doc.splitTextToSize(text, MAX_TEXT_W);
  y = nextPageIfNeeded(doc, y, lines.length * LINE_MM);
  doc.text(lines, MARGIN, y);
  return y + lines.length * LINE_MM + 2;
}

export async function downloadJobInvoicePdf(job: Job, issuer?: BookingPdfIssuer): Promise<void> {
  const doc = await buildJobInvoicePdf(job, issuer);
  const safe = job.jobNumber.replace(/[/\\?%*:|"<>]/g, "-");
  doc.save(`Invoice-${safe}.pdf`);
}

/** In-memory PDF for embedding (e.g. compare modal). Caller must call `revoke()` when done to free the blob URL. */
export async function createJobInvoicePdfObjectUrl(
  job: Job,
  issuer?: BookingPdfIssuer,
): Promise<{ url: string; revoke: () => void }> {
  const doc = await buildJobInvoicePdf(job, issuer);
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  return { url, revoke: () => URL.revokeObjectURL(url) };
}

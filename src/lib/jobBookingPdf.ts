import { jsPDF } from "jspdf";
import type { Job } from "../types";
import { LOGO_PATH } from "./companyBrand";
import { defaultExportCompanyDetails, type UserCompanyDetails } from "./userCompanyProfile";

export type BookingPdfIssuer = {
  details: UserCompanyDetails;
  preparedBy?: string;
};

const MARGIN = 10;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - 2 * MARGIN;
/** Leave room for footer note */
const Y_MAX = 278;
const LINE_MM_8 = 3.6;
const BOX_TITLE_H = 5.5;
const PAD = 2.5;

function fmtDate(s: string): string {
  if (!s?.trim()) return "—";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmtMoney(n: number): string {
  return `£${Number(n).toFixed(2)}`;
}

function dash(s: string | undefined): string {
  const t = (s ?? "").trim();
  return t || "—";
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

function ensureY(doc: jsPDF, y: number, needMm: number): number {
  if (y + needMm > Y_MAX) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

/** Label: value lines, 8pt */
function addKv(doc: jsPDF, x: number, y: number, w: number, label: string, value: string): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  const prefix = `${label}:`;
  const prefixW = doc.getTextWidth(prefix) + 1.5;
  doc.text(prefix, x, y);
  doc.setFont("helvetica", "normal");
  const v = value.trim() || "—";
  const lines = doc.splitTextToSize(v, w - prefixW);
  doc.text(lines, x + prefixW, y);
  return y + Math.max(1, lines.length) * LINE_MM_8;
}

function addMultilineBlock(doc: jsPDF, x: number, y: number, w: number, text: string): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  if (!text.trim()) {
    doc.text("—", x, y);
    return y + LINE_MM_8;
  }
  const parts = text.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    doc.text("—", x, y);
    return y + LINE_MM_8;
  }
  let cy = y;
  for (const p of parts) {
    const lines = doc.splitTextToSize(p, w);
    doc.text(lines, x, cy);
    cy += lines.length * LINE_MM_8;
  }
  return cy;
}

/**
 * Draw a titled section with border. `drawInner` starts below title bar; returns next Y inside box (before bottom pad).
 */
function drawTitledBox(
  doc: jsPDF,
  x: number,
  yTop: number,
  w: number,
  title: string,
  drawInner: (innerY: number, innerX: number, innerW: number) => number
): number {
  const innerX = x + PAD;
  const innerW = w - 2 * PAD;
  let y = yTop + BOX_TITLE_H;
  doc.setFillColor(236, 240, 245);
  doc.roundedRect(x, yTop, w, BOX_TITLE_H, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(title, innerX, yTop + 4);
  doc.setTextColor(0, 0, 0);
  y = drawInner(y + 1, innerX, innerW);
  y += PAD;
  doc.setDrawColor(55, 70, 85);
  doc.setLineWidth(0.45);
  doc.roundedRect(x, yTop, w, y - yTop, 1.2, 1.2, "S");
  doc.setDrawColor(0);
  doc.setLineWidth(0.2);
  return y + 2.5;
}

function streetPostcode(job: Job, side: "collection" | "delivery"): string {
  if (side === "collection") {
    return [job.collectionAddressLines?.trim(), job.collectionPostcode?.trim()].filter(Boolean).join("\n");
  }
  return [job.deliveryAddressLines?.trim(), job.deliveryPostcode?.trim()].filter(Boolean).join("\n");
}

async function addCompactLetterhead(doc: jsPDF, y: number, details: UserCompanyDetails, preparedBy?: string): Promise<number> {
  const logoW = 22;
  const logoH = (logoW * 200) / 300;
  const logo = await loadLogoPngDataUrl();
  if (logo) {
    doc.addImage(logo, "PNG", MARGIN, y, logoW, logoH);
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(details.companyLegalName.trim().toUpperCase() || "HAYLEIGH TRANSPORT", MARGIN + logoW + 3, y + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(80);
  const bits = [details.telephone && `Tel ${details.telephone}`, details.email].filter(Boolean).join(" · ");
  if (bits) doc.text(bits, MARGIN + logoW + 3, y + 8);
  if (preparedBy?.trim()) doc.text(`Prepared by: ${preparedBy.trim()}`, MARGIN + logoW + 3, y + 11.5);
  doc.setTextColor(0);
  return y + Math.max(logo ? logoH : 0, 14) + 3;
}

function addFooterNote(doc: jsPDF, lines: string[]) {
  doc.setFontSize(7);
  doc.setTextColor(100);
  const last = doc.getNumberOfPages();
  doc.setPage(last);
  const joined = lines.join(" ");
  const wrapped = doc.splitTextToSize(joined, CONTENT_W);
  let fy = PAGE_H - 12 - (wrapped.length - 1) * 3.2;
  doc.text(wrapped, MARGIN, fy);
  doc.setTextColor(0);
}

export type BookingFormMode = "combined" | "customer" | "supplier";

async function buildTransportBookingFormPdf(job: Job, issuer: BookingPdfIssuer | undefined, mode: BookingFormMode): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const details = issuer?.details ?? defaultExportCompanyDetails();
  const preparedBy = issuer?.preparedBy;

  let y = MARGIN;
  y = await addCompactLetterhead(doc, y, details, preparedBy);

  y = ensureY(doc, y, 14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TRANSPORT BOOKING FORM", MARGIN, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(70);
  if (mode === "combined") {
    doc.text("Customer booking details and internal supplier section on this sheet. Boxed sections match the standard booking template.", MARGIN, y);
  } else if (mode === "customer") {
    doc.text("Customer copy — pricing and journey details.", MARGIN, y);
  } else {
    doc.text("Supplier / carrier instruction — includes agreed cost and vehicle details.", MARGIN, y);
  }
  doc.setTextColor(0);
  y += 5;

  const routeLabel = job.routeType === "international" ? "International" : "Domestic";
  const vehicleType = dash(job.vehicleType);

  y = ensureY(doc, y, 40);
  y = drawTitledBox(doc, MARGIN, y, CONTENT_W, "Job summary", (iy, ix, iw) => {
    let cy = iy;
    cy = addKv(doc, ix, cy, iw, "Job reference", job.jobNumber);
    cy = addKv(doc, ix, cy, iw, "Customer", job.customerName);
    cy = addKv(doc, ix, cy, iw, "Route", routeLabel);
    cy = addKv(doc, ix, cy, iw, "Collection date", fmtDate(job.collectionDate));
    cy = addKv(doc, ix, cy, iw, "Delivery date", fmtDate(job.deliveryDate));
    if (job.scheduledDay) cy = addKv(doc, ix, cy, iw, "Scheduled day (board)", job.scheduledDay);
    cy = addKv(doc, ix, cy, iw, "Vehicle type", vehicleType);
    return cy;
  });

  const colGap = 3;
  const colW = (CONTENT_W - colGap) / 2;
  const xL = MARGIN;
  const xR = MARGIN + colW + colGap;

  y = ensureY(doc, y, 55);
  const rowY = y;
  const bottomL = drawTitledBox(doc, xL, rowY, colW, "Collection details", (iy, ix, iw) => {
    let cy = iy;
    cy = addKv(doc, ix, cy, iw, "Contact name", dash(job.collectionContactName));
    cy = addKv(doc, ix, cy, iw, "Phone", dash(job.collectionContactPhone));
    cy = addKv(doc, ix, cy, iw, "Email", dash(job.collectionContactEmail));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Address:", ix, cy);
    doc.setFont("helvetica", "normal");
    cy = addMultilineBlock(doc, ix, cy + LINE_MM_8, iw, streetPostcode(job, "collection"));
    cy = addKv(doc, ix, cy, iw, "Collection time window", dash(job.scheduledDay ? `Board: ${job.scheduledDay}` : undefined));
    return cy;
  });
  const bottomR = drawTitledBox(doc, xR, rowY, colW, "Delivery details", (iy, ix, iw) => {
    let cy = iy;
    cy = addKv(doc, ix, cy, iw, "Contact name", dash(job.deliveryContactName));
    cy = addKv(doc, ix, cy, iw, "Phone", dash(job.deliveryContactPhone));
    cy = addKv(doc, ix, cy, iw, "Email", dash(job.deliveryContactEmail));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Address:", ix, cy);
    doc.setFont("helvetica", "normal");
    cy = addMultilineBlock(doc, ix, cy + LINE_MM_8, iw, streetPostcode(job, "delivery"));
    cy = addKv(doc, ix, cy, iw, "Delivery time window", "—");
    return cy;
  });
  y = Math.max(bottomL, bottomR);

  y = ensureY(doc, y, 35);
  y = drawTitledBox(doc, MARGIN, y, CONTENT_W, "Goods information", (iy, ix, iw) => {
    let cy = iy;
    cy = addKv(doc, ix, cy, iw, "Description of goods", "—");
    cy = addKv(doc, ix, cy, iw, "Number of items / pallets", "—");
    cy = addKv(doc, ix, cy, iw, "Weight (kg)", "—");
    cy = addKv(doc, ix, cy, iw, "Fragile (Y/N)", "—");
    cy = addKv(doc, ix, cy, iw, "Special instructions", "");
    cy = addMultilineBlock(doc, ix, cy, iw, dash(job.notes));
    return cy;
  });

  const sell = Number(job.sellPrice) || 0;
  const fuel = Number(job.fuelSurcharge) || 0;
  const extra = Number(job.extraCharges) || 0;
  const total = sell + fuel + extra;

  if (mode !== "supplier") {
    y = ensureY(doc, y, 38);
    y = drawTitledBox(doc, MARGIN, y, CONTENT_W, "Pricing (ex VAT)", (iy, ix, iw) => {
      let cy = iy;
      cy = addKv(doc, ix, cy, iw, "Transport fee", fmtMoney(sell));
      cy = addKv(doc, ix, cy, iw, "Fuel surcharge", fmtMoney(fuel));
      cy = addKv(doc, ix, cy, iw, "Additional charges", fmtMoney(extra));
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(`Total (ex VAT): ${fmtMoney(total)}`, ix, cy);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      return cy + LINE_MM_8 + 1;
    });
  } else {
    y = ensureY(doc, y, 22);
    y = drawTitledBox(doc, MARGIN, y, CONTENT_W, "Customer pricing (reference only, ex VAT)", (iy, ix, iw) => {
      let cy = iy;
      cy = addKv(doc, ix, cy, iw, "Total charged to customer", fmtMoney(total));
      return cy;
    });
  }

  const redactSupplier = mode === "customer";
  y = ensureY(doc, y, 42);
  y = drawTitledBox(doc, MARGIN, y, CONTENT_W, "Internal supplier section", (iy, ix, iw) => {
    let cy = iy;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(120, 30, 30);
    doc.text("Confidential — office & carrier use. Not for customer distribution.", ix, cy);
    doc.setTextColor(0);
    cy += LINE_MM_8 + 1;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    if (redactSupplier) {
      cy = addMultilineBlock(doc, ix, cy, iw, "Agreed supplier cost and carrier instructions are held on the office copy / separate instruction.");
      return cy;
    }
    cy = addKv(doc, ix, cy, iw, "Carrier name", dash(job.carrier));
    cy = addKv(doc, ix, cy, iw, "Driver name", dash(job.assignedDriverName));
    cy = addKv(doc, ix, cy, iw, "Vehicle registration", dash(job.truckPlates));
    cy = addKv(doc, ix, cy, iw, "Supplier cost (ex VAT)", fmtMoney(Number(job.buyPrice) || 0));
    cy = addKv(doc, ix, cy, iw, "Handler", dash(job.handler));
    cy = addKv(doc, ix, cy, iw, "Created", fmtDate(job.createdAt.includes("T") ? job.createdAt.slice(0, 10) : job.createdAt));
    return cy;
  });

  const footerMsg =
    mode === "combined"
      ? [
          "VAT will be charged in line with your agreement. Customer-facing pricing is shown under Pricing.",
          "The internal supplier section is confidential.",
        ]
      : mode === "customer"
        ? ["Customer copy. VAT as agreed. Supplier assignment is managed by the office."]
        : ["Supplier copy. Agreed buy rate as shown. Not for customer distribution."];

  addFooterNote(doc, footerMsg);
  return doc;
}

/** Single PDF, one sheet (A4) where possible: template-style boxed sections, customer + internal supplier. */
export async function buildCombinedBookingPdf(job: Job, issuer?: BookingPdfIssuer): Promise<jsPDF> {
  return buildTransportBookingFormPdf(job, issuer, "combined");
}

export async function buildBookingPdf(
  job: Job,
  variant: "customer" | "supplier",
  issuer?: BookingPdfIssuer
): Promise<jsPDF> {
  return buildTransportBookingFormPdf(job, issuer, variant === "customer" ? "customer" : "supplier");
}

export async function downloadCustomerBookingPdf(job: Job, issuer?: BookingPdfIssuer): Promise<void> {
  const doc = await buildBookingPdf(job, "customer", issuer);
  doc.save(`Hayleigh-booking-customer-${job.jobNumber.replace(/[/\\?%*:|"<>]/g, "-")}.pdf`);
}

export async function downloadSupplierBookingPdf(job: Job, issuer?: BookingPdfIssuer): Promise<void> {
  const doc = await buildBookingPdf(job, "supplier", issuer);
  doc.save(`Hayleigh-booking-supplier-${job.jobNumber.replace(/[/\\?%*:|"<>]/g, "-")}.pdf`);
}

export async function downloadCombinedBookingPdf(job: Job, issuer?: BookingPdfIssuer): Promise<void> {
  const doc = await buildCombinedBookingPdf(job, issuer);
  doc.save(`Hayleigh-booking-${job.jobNumber.replace(/[/\\?%*:|"<>]/g, "-")}.pdf`);
}

/** @deprecated Use {@link downloadCombinedBookingPdf} — kept for call sites that expect this name. */
export async function downloadBothBookingPdfs(job: Job, issuer?: BookingPdfIssuer): Promise<void> {
  await downloadCombinedBookingPdf(job, issuer);
}

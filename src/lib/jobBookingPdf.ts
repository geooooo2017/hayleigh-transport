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
/** Space reserved at bottom for contact block + disclaimer (mm) */
const FOOTER_RESERVED_MM = 44;
const LINE_MM_8 = 4.1;
const KV_BLOCK_GAP = 1.1;
/** Coloured band at top of each titled box (title text sits below this) */
const BOX_HEADER_STRIP_H = 3.2;
const BOX_TITLE_BELOW_STRIP = 5;
const BOX_TITLE_AFTER_GAP = 4.5;
/** Extra space between letterhead block and main document title */
const GAP_AFTER_LETTERHEAD_MM = 9;
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

function contentYMax(): number {
  return PAGE_H - FOOTER_RESERVED_MM;
}

/** Red banner at top of supplier / office PDFs (and combined PDF page 2). */
function addInternalUseBanner(doc: jsPDF, yTop: number): number {
  const h = 7.8;
  doc.setFillColor(185, 28, 28);
  doc.rect(MARGIN, yTop, CONTENT_W, h, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("INTERNAL USE ONLY — DO NOT SEND TO CUSTOMER", PAGE_W / 2, yTop + 5.3, { align: "center" });
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  return yTop + h + 2.8;
}

function ensureY(doc: jsPDF, y: number, needMm: number): number {
  if (y + needMm > contentYMax()) {
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
  const prefixW = doc.getTextWidth(prefix) + 2;
  doc.text(prefix, x, y);
  doc.setFont("helvetica", "normal");
  const v = value.trim() || "—";
  const lines = doc.splitTextToSize(v, w - prefixW);
  doc.text(lines, x + prefixW, y);
  return y + Math.max(1, lines.length) * LINE_MM_8 + KV_BLOCK_GAP;
}

function addMultilineBlock(doc: jsPDF, x: number, y: number, w: number, text: string): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  if (!text.trim()) {
    doc.text("—", x, y);
    return y + LINE_MM_8 + KV_BLOCK_GAP;
  }
  const parts = text.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    doc.text("—", x, y);
    return y + LINE_MM_8 + KV_BLOCK_GAP;
  }
  let cy = y;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const lines = doc.splitTextToSize(p, w);
    doc.text(lines, x, cy);
    cy += lines.length * LINE_MM_8;
    if (i < parts.length - 1) cy += 1.2;
  }
  return cy + KV_BLOCK_GAP;
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
  doc.setFillColor(236, 240, 245);
  doc.roundedRect(x, yTop, w, BOX_HEADER_STRIP_H, 1, 1, "F");
  doc.setDrawColor(200, 210, 220);
  doc.setLineWidth(0.25);
  doc.line(x + 0.4, yTop + BOX_HEADER_STRIP_H, x + w - 0.4, yTop + BOX_HEADER_STRIP_H);
  doc.setDrawColor(0);
  const titleBaseline = yTop + BOX_HEADER_STRIP_H + BOX_TITLE_BELOW_STRIP;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(title, innerX, titleBaseline);
  doc.setTextColor(0, 0, 0);
  const innerStartY = titleBaseline + BOX_TITLE_AFTER_GAP;
  let y = drawInner(innerStartY, innerX, innerW);
  y += PAD + 1;
  doc.setDrawColor(55, 70, 85);
  doc.setLineWidth(0.45);
  doc.roundedRect(x, yTop, w, y - yTop, 1.2, 1.2, "S");
  doc.setDrawColor(0);
  doc.setLineWidth(0.2);
  return y + 3.5;
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
  const bits = [
    details.telephone && `Tel ${details.telephone}`,
    details.mobile && `Mob ${details.mobile}`,
    details.email,
  ]
    .filter(Boolean)
    .join(" · ");
  if (bits) doc.text(bits, MARGIN + logoW + 3, y + 8);
  if (preparedBy?.trim()) doc.text(`Prepared by: ${preparedBy.trim()}`, MARGIN + logoW + 3, y + 11.5);
  doc.setTextColor(0);
  return y + Math.max(logo ? logoH : 0, 14) + 3;
}

/** Disclaimer (upper) then company contact from Settings at the foot of the page. */
function addBookingFooterBlock(
  doc: jsPDF,
  pageNumber: number,
  details: UserCompanyDetails,
  preparedBy: string | undefined,
  disclaimerLines: string[],
  showPreparedByInFooter: boolean
) {
  doc.setPage(pageNumber);
  const t = (s: string) => s.trim();

  const discJoined = disclaimerLines.join(" ");
  const discWrapped = doc.splitTextToSize(discJoined, CONTENT_W);
  const discLineH = 3.4;
  const discH = discWrapped.length * discLineH;

  const contact: string[] = [];
  if (t(details.companyLegalName)) contact.push(t(details.companyLegalName));
  if (t(details.telephone)) contact.push(`Tel: ${t(details.telephone)}`);
  if (t(details.mobile)) contact.push(`Mob: ${t(details.mobile)}`);
  if (t(details.email)) contact.push(`Email: ${t(details.email)}`);
  if (t(details.website)) contact.push(`${t(details.website)}`);

  const contactLineH = 3.9;
  let contactH = contact.length * contactLineH;
  if (showPreparedByInFooter && preparedBy?.trim()) contactH += contactLineH + 0.5;
  const gapBetween = 3.5;
  const bottomPad = 7;

  let y = PAGE_H - bottomPad - contactH - gapBetween - discH;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text(discWrapped, MARGIN, y);
  y += discH + gapBetween;

  doc.setFontSize(8);
  doc.setTextColor(55, 65, 75);
  for (const line of contact) {
    doc.text(line, MARGIN, y);
    y += contactLineH;
  }
  if (showPreparedByInFooter && preparedBy?.trim()) {
    doc.setFontSize(7.5);
    doc.setTextColor(80);
    doc.text(`Prepared by: ${preparedBy.trim()}`, MARGIN, y);
    y += contactLineH;
  }
  doc.setTextColor(0);
}

export type BookingFormMode = "customer" | "supplier";

async function renderTransportBookingFormIntoDoc(
  doc: jsPDF,
  job: Job,
  issuer: BookingPdfIssuer | undefined,
  mode: BookingFormMode
): Promise<void> {
  const details = issuer?.details ?? defaultExportCompanyDetails();
  const preparedBy = issuer?.preparedBy;

  let y = MARGIN;
  if (mode === "supplier") {
    y = addInternalUseBanner(doc, y);
  }
  y = await addCompactLetterhead(doc, y, details, mode === "customer" ? undefined : preparedBy);
  y += GAP_AFTER_LETTERHEAD_MM;

  y = ensureY(doc, y, 14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TRANSPORT BOOKING FORM", MARGIN, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(70);
  if (mode === "customer") {
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
    cy = addMultilineBlock(doc, ix, cy + LINE_MM_8 + 1, iw, streetPostcode(job, "collection"));
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
    cy = addMultilineBlock(doc, ix, cy + LINE_MM_8 + 1, iw, streetPostcode(job, "delivery"));
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
    cy = addKv(doc, ix, cy, iw, "Special instructions", dash(job.notes));
    return cy;
  });

  const sell = Number(job.sellPrice) || 0;
  const fuel = Number(job.fuelSurcharge) || 0;
  const extra = Number(job.extraCharges) || 0;
  const total = sell + fuel + extra;

  if (mode !== "supplier") {
    y = ensureY(doc, y, 40);
    y = drawTitledBox(doc, MARGIN, y, CONTENT_W, "Pricing (ex VAT)", (iy, ix, iw) => {
      let cy = iy;
      cy = addKv(doc, ix, cy, iw, "Transport fee", fmtMoney(sell));
      cy = addKv(doc, ix, cy, iw, "Fuel surcharge", fmtMoney(fuel));
      cy = addKv(doc, ix, cy, iw, "Additional charges", fmtMoney(extra));
      cy += 1.2;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(`Total (ex VAT): ${fmtMoney(total)}`, ix, cy);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      return cy + LINE_MM_8 + 2.5;
    });
  } else {
    y = ensureY(doc, y, 52);
    y = drawTitledBox(doc, MARGIN, y, CONTENT_W, "Pricing (ex VAT) — office reference", (iy, ix, iw) => {
      let cy = iy;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(90);
      const refHint = doc.splitTextToSize("Same breakdown as the customer copy — for margin and billing checks.", iw);
      doc.text(refHint, ix, cy);
      doc.setTextColor(0, 0, 0);
      cy += Math.max(1, refHint.length) * 3.35 + 2;
      doc.setFontSize(8);
      cy = addKv(doc, ix, cy, iw, "Transport fee", fmtMoney(sell));
      cy = addKv(doc, ix, cy, iw, "Fuel surcharge", fmtMoney(fuel));
      cy = addKv(doc, ix, cy, iw, "Additional charges", fmtMoney(extra));
      cy += 1.2;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(`Total (ex VAT): ${fmtMoney(total)}`, ix, cy);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      return cy + LINE_MM_8 + 2.5;
    });
  }

  // Internal block only on supplier/office PDF — never on customer copy.
  if (mode === "supplier") {
    y = ensureY(doc, y, 42);
    y = drawTitledBox(doc, MARGIN, y, CONTENT_W, "Internal supplier section", (iy, ix, iw) => {
      let cy = iy;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(120, 30, 30);
      doc.text("Confidential — office & carrier use. Not for customer distribution.", ix, cy);
      doc.setTextColor(0);
      cy += LINE_MM_8 + 2.2;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      cy = addKv(doc, ix, cy, iw, "Carrier name", dash(job.carrier));
      cy = addKv(doc, ix, cy, iw, "Driver name", dash(job.assignedDriverName));
      cy = addKv(doc, ix, cy, iw, "Vehicle registration", dash(job.truckPlates));
      cy = addKv(doc, ix, cy, iw, "Supplier cost (ex VAT)", fmtMoney(Number(job.buyPrice) || 0));
      cy = addKv(doc, ix, cy, iw, "Handler", dash(job.handler));
      cy = addKv(doc, ix, cy, iw, "Created", fmtDate(job.createdAt.includes("T") ? job.createdAt.slice(0, 10) : job.createdAt));
      return cy;
    });
  }

  const footerMsg =
    mode === "customer"
      ? [
          "Confirmation for your records. VAT is applied as agreed in your contract or terms.",
          "Operational and subcontract arrangements are coordinated by our office and are not shown on this sheet.",
        ]
      : [
          "Supplier / carrier copy. Agreed buy rate as shown.",
          "Not for sending to the end customer.",
        ];

  addBookingFooterBlock(
    doc,
    doc.getNumberOfPages(),
    details,
    preparedBy,
    footerMsg,
    mode !== "customer"
  );
}

async function buildTransportBookingFormPdf(job: Job, issuer: BookingPdfIssuer | undefined, mode: BookingFormMode): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await renderTransportBookingFormIntoDoc(doc, job, issuer, mode);
  return doc;
}

/** Two-page PDF: page 1 customer-safe copy, page 2 supplier / internal copy. Do not send the full file to customers. */
export async function buildCombinedBookingPdf(job: Job, issuer?: BookingPdfIssuer): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await renderTransportBookingFormIntoDoc(doc, job, issuer, "customer");
  doc.addPage();
  await renderTransportBookingFormIntoDoc(doc, job, issuer, "supplier");
  return doc;
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
  const safe = job.jobNumber.replace(/[/\\?%*:|"<>]/g, "-");
  doc.save(`Hayleigh-booking-internal-${safe}.pdf`);
}

/** Page 1 = customer-safe; page 2 = internal (red banner). Filename flags that this is not a customer attachment. */
export async function downloadCombinedBookingPdf(job: Job, issuer?: BookingPdfIssuer): Promise<void> {
  const doc = await buildCombinedBookingPdf(job, issuer);
  const safe = job.jobNumber.replace(/[/\\?%*:|"<>]/g, "-");
  doc.save(`Hayleigh-booking-internal-bundle-2pg-${safe}.pdf`);
}

let bothBookingPdfsInFlight = false;

/** Downloads separate customer and supplier PDFs (two browser saves — not a double-click bug). Ignores overlapping calls while running. */
export async function downloadBothBookingPdfs(job: Job, issuer?: BookingPdfIssuer): Promise<void> {
  if (bothBookingPdfsInFlight) return;
  bothBookingPdfsInFlight = true;
  try {
    await downloadCustomerBookingPdf(job, issuer);
    await new Promise((r) => setTimeout(r, 450));
    await downloadSupplierBookingPdf(job, issuer);
  } finally {
    bothBookingPdfsInFlight = false;
  }
}

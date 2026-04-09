import { jsPDF } from "jspdf";
import type { Job } from "../types";
import { COMPANY_LEGAL_NAME, LOGO_PATH } from "./companyBrand";
import { formatAddressBlock } from "./jobAddress";
import { defaultExportCompanyDetails, type UserCompanyDetails } from "./userCompanyProfile";

export type BookingPdfIssuer = {
  details: UserCompanyDetails;
  preparedBy?: string;
};

const MARGIN = 15;
const PAGE_W = 210;
const MAX_TEXT_W = PAGE_W - 2 * MARGIN;
const LINE_MM = 5;
const FOOTER_MAX_Y = 275;

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

function drawSectionTitle(doc: jsPDF, title: string, y: number): number {
  y = nextPageIfNeeded(doc, y, 12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(title, MARGIN, y);
  doc.setFont("helvetica", "normal");
  return y + 7;
}

function addParagraph(doc: jsPDF, text: string, y: number, fontSize = 10): number {
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize((text || "").trim() || "—", MAX_TEXT_W);
  y = nextPageIfNeeded(doc, y, lines.length * LINE_MM + 2);
  doc.text(lines, MARGIN, y);
  return y + lines.length * LINE_MM + 3;
}

function addIssuerContactBlock(doc: jsPDF, y: number, d: UserCompanyDetails, preparedBy?: string): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(90);
  const lines: string[] = [];
  const t = (s: string) => s.trim();
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
    lines.push(`Prepared by: ${t(preparedBy!)}`);
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
  return y + 2;
}

function addFooter(doc: jsPDF, variant: "customer" | "supplier") {
  const msg =
    variant === "customer"
      ? "This document summarises the agreed commercial terms for the transport service described. VAT will be charged in line with your agreement."
      : "Confidential — supplier copy. Agreed buy rate as shown. Not for customer distribution.";
  const lines = doc.splitTextToSize(msg, MAX_TEXT_W);
  doc.setFontSize(8);
  doc.setTextColor(110);
  const last = doc.getNumberOfPages();
  doc.setPage(last);
  const y = 292 - (lines.length - 1) * 3.6;
  doc.text(lines, MARGIN, y);
  doc.setTextColor(0);
}

export async function buildBookingPdf(
  job: Job,
  variant: "customer" | "supplier",
  issuer?: BookingPdfIssuer
): Promise<jsPDF> {
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
  doc.setFontSize(15);
  doc.text(variant === "customer" ? "Transport booking confirmation" : "Supplier booking instruction", MARGIN, y);
  y += 9;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y = nextPageIfNeeded(doc, y, 16);
  doc.setFillColor(245, 248, 250);
  doc.roundedRect(MARGIN, y, PAGE_W - 2 * MARGIN, 11, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.text(`Job reference: ${job.jobNumber}`, MARGIN + 3, y + 7);
  doc.setFont("helvetica", "normal");
  y += 15;

  y = drawSectionTitle(doc, "Journey details", y);
  doc.setFontSize(10);
  y = addParagraph(doc, `Route: ${job.routeType === "international" ? "International" : "Domestic"}`, y);
  y = addParagraph(doc, `Collection date: ${fmtDate(job.collectionDate)}`, y);
  y = addParagraph(doc, `Delivery date: ${fmtDate(job.deliveryDate)}`, y);
  if (job.scheduledDay) {
    y = addParagraph(doc, `Scheduled day (board): ${job.scheduledDay}`, y);
  }

  y = drawSectionTitle(doc, "Collection address", y);
  y = addParagraph(doc, formatAddressBlock(job, "collection"), y);

  y = drawSectionTitle(doc, "Delivery address", y);
  y = addParagraph(doc, formatAddressBlock(job, "delivery"), y);

  if (variant === "customer") {
    y = drawSectionTitle(doc, "Customer", y);
    y = addParagraph(doc, job.customerName, y);

    y = drawSectionTitle(doc, "Agreed rate (ex VAT)", y);
    const sell = Number(job.sellPrice) || 0;
    const fuel = Number(job.fuelSurcharge) || 0;
    const extra = Number(job.extraCharges) || 0;
    const total = sell + fuel + extra;
    doc.setFontSize(10);
    y = nextPageIfNeeded(doc, y, 28);
    doc.text(`Transport fee: ${fmtMoney(sell)}`, MARGIN, y);
    y += LINE_MM;
    doc.text(`Fuel surcharge: ${fmtMoney(fuel)}`, MARGIN, y);
    y += LINE_MM;
    doc.text(`Additional charges: ${fmtMoney(extra)}`, MARGIN, y);
    y += 7;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`Total (ex VAT): ${fmtMoney(total)}`, MARGIN, y);
    doc.setFont("helvetica", "normal");
    y += 10;
  } else {
    y = drawSectionTitle(doc, "Customer (for reference)", y);
    y = addParagraph(doc, job.customerName, y);

    y = drawSectionTitle(doc, "Supplier / carrier", y);
    y = addParagraph(doc, `Carrier: ${job.carrier || "—"}`, y);
    y = addParagraph(doc, `Vehicle / plates: ${job.truckPlates || job.vehicleType || "—"}`, y);

    y = drawSectionTitle(doc, "Agreed supplier rate (ex VAT)", y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    y = nextPageIfNeeded(doc, y, 10);
    doc.text(fmtMoney(Number(job.buyPrice) || 0), MARGIN, y + 2);
    doc.setFont("helvetica", "normal");
    y += 10;
  }

  if (variant === "supplier") {
    y = drawSectionTitle(doc, "Internal reference", y);
    doc.setFontSize(9);
    doc.setTextColor(80);
    y = addParagraph(
      doc,
      `Handler: ${job.handler}  ·  Created: ${fmtDate(job.createdAt.includes("T") ? job.createdAt.slice(0, 10) : job.createdAt)}`,
      y,
      9
    );
    doc.setTextColor(0);
  }

  if (job.notes?.trim()) {
    y = drawSectionTitle(doc, variant === "customer" ? "Notes" : "Operational notes", y);
    y = addParagraph(doc, job.notes, y);
  }

  addFooter(doc, variant);
  return doc;
}

export async function downloadCustomerBookingPdf(job: Job, issuer?: BookingPdfIssuer): Promise<void> {
  const doc = await buildBookingPdf(job, "customer", issuer);
  doc.save(`Hayleigh-booking-customer-${job.jobNumber.replace(/[/\\?%*:|"<>]/g, "-")}.pdf`);
}

export async function downloadSupplierBookingPdf(job: Job, issuer?: BookingPdfIssuer): Promise<void> {
  const doc = await buildBookingPdf(job, "supplier", issuer);
  doc.save(`Hayleigh-booking-supplier-${job.jobNumber.replace(/[/\\?%*:|"<>]/g, "-")}.pdf`);
}

export async function downloadBothBookingPdfs(job: Job, issuer?: BookingPdfIssuer): Promise<void> {
  await downloadCustomerBookingPdf(job, issuer);
  await new Promise((r) => setTimeout(r, 450));
  await downloadSupplierBookingPdf(job, issuer);
}

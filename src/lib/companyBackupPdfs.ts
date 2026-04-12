import { jsPDF } from "jspdf";
import type { CompanyBackupSnapshot } from "./companyBackupSnapshot";
import { buildCombinedBookingPdf } from "./jobBookingPdf";
import { buildJobInvoicePdf } from "./invoicePdf";
import type { BookingPdfIssuer } from "./jobBookingPdf";
import { computeJobGpExVat, effectiveSupplierCostExVat } from "./jobProfit";
import { resolveInvoiceValueExVat } from "./jobNetAmount";

const MARGIN = 14;
const LINE = 4.5;
const MAX_W = 210 - 2 * MARGIN;

export type BackupPdfFile = { filename: string; blob: Blob };

function safeSegment(s: string): string {
  const t = s.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
  return t.slice(0, 72) || "file";
}

function newDoc(title: string, subtitle?: string): { doc: jsPDF; y: number } {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("Hayleigh Transport — data backup", MARGIN, 16);
  doc.setFontSize(11);
  doc.setTextColor(60);
  doc.text(title, MARGIN, 24);
  doc.setTextColor(0);
  if (subtitle) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.text(subtitle, MARGIN, 30);
    doc.setFont("helvetica", "normal");
  }
  let y = subtitle ? 38 : 32;
  doc.setFontSize(9);
  return { doc, y };
}

function pageBreak(doc: jsPDF, y: number, need = 24): number {
  if (y + need > 280) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

function writeBlock(doc: jsPDF, y: number, label: string, value: string): number {
  y = pageBreak(doc, y, LINE * 3);
  doc.setFont("helvetica", "bold");
  doc.text(`${label}:`, MARGIN, y);
  y += LINE * 0.85;
  doc.setFont("helvetica", "normal");
  const lines = doc.splitTextToSize(value || "—", MAX_W);
  doc.text(lines, MARGIN, y);
  return y + Math.max(LINE, lines.length * LINE * 0.85) + 2;
}

function writeParagraph(doc: jsPDF, y: number, text: string): number {
  y = pageBreak(doc, y, 20);
  doc.setFont("helvetica", "normal");
  const lines = doc.splitTextToSize(text, MAX_W);
  doc.text(lines, MARGIN, y);
  return y + lines.length * LINE * 0.85 + 3;
}

function toBlob(doc: jsPDF): Blob {
  return doc.output("blob");
}

export function buildCompanyProfilePdf(s: CompanyBackupSnapshot): BackupPdfFile {
  const { doc, y: y0 } = newDoc("Company profile & export metadata", `Exported ${s.exportedAt}${s.preparedBy ? ` · ${s.preparedBy}` : ""}`);
  let y = y0;
  y = writeBlock(doc, y, "Legal name", s.company.companyLegalName);
  y = writeBlock(doc, y, "Tel", s.company.telephone);
  y = writeBlock(doc, y, "Mob", s.company.mobile);
  y = writeBlock(doc, y, "Email", s.company.email);
  y = writeBlock(doc, y, "Website", s.company.website);
  y = writeBlock(doc, y, "Company number", s.company.companyNumber);
  y = writeBlock(doc, y, "VAT number", s.company.vatNumber);
  y = writeBlock(doc, y, "EORI", s.company.eoriNumber);
  y = writeParagraph(
    doc,
    y,
    "This PDF is part of an offline backup. Binary attachments embedded in jobs (e.g. large POD files) are not duplicated here in full — use job detail in the app if needed.",
  );
  return { filename: "00-company-profile.pdf", blob: toBlob(doc) };
}

export function buildBibbyTermsPdf(s: CompanyBackupSnapshot): BackupPdfFile {
  const { doc, y: y0 } = newDoc("Invoice financing terms (Bibby-style)", s.exportedAt);
  let y = y0;
  const b = s.bibby;
  y = writeBlock(doc, y, "Prepayment %", String(b.prepaymentPercent));
  y = writeBlock(doc, y, "Service fee %", String(b.serviceFeePercent));
  y = writeBlock(doc, y, "Bad debt protection %", String(b.badDebtProtectionPercent));
  y = writeBlock(doc, y, "Discount fee %", String(b.discountFeePercent));
  y = writeBlock(doc, y, "Bank base rate %", String(b.bankBaseRatePercent));
  y = writeBlock(doc, y, "Include bad debt protection", b.includeBadDebtProtection ? "Yes" : "No");
  return { filename: "01-bibby-financing-terms.pdf", blob: toBlob(doc) };
}

export function buildCustomersPdf(s: CompanyBackupSnapshot): BackupPdfFile {
  const { doc, y: y0 } = newDoc(`Customers (${s.customers.length})`, s.exportedAt);
  let y = y0;
  if (s.customers.length === 0) {
    y = writeParagraph(doc, y, "No customers stored in this browser.");
  } else {
    for (const c of s.customers) {
      y = pageBreak(doc, y, 28);
      doc.setFont("helvetica", "bold");
      doc.text(c.name || `Customer #${c.id}`, MARGIN, y);
      y += LINE;
      doc.setFont("helvetica", "normal");
      y = writeBlock(doc, y, "  Contact", c.contactPerson);
      y = writeBlock(doc, y, "  Phone", c.phone);
      y = writeBlock(doc, y, "  Email", c.email);
      y = writeBlock(doc, y, "  Address", c.address);
      y = writeBlock(doc, y, "  Company no.", c.companyNumber);
      y = writeBlock(doc, y, "  VAT", c.vatNumber);
      y = writeBlock(doc, y, "  Status / terms", `${c.status} · ${c.paymentTerms}`);
      y += 2;
    }
  }
  return { filename: "02-customers.pdf", blob: toBlob(doc) };
}

export function buildDriversPdf(s: CompanyBackupSnapshot): BackupPdfFile {
  const { doc, y: y0 } = newDoc(`Drivers (${s.drivers.length})`, s.exportedAt);
  let y = y0;
  if (s.drivers.length === 0) y = writeParagraph(doc, y, "No drivers stored.");
  else {
    for (const d of s.drivers) {
      y = pageBreak(doc, y, 22);
      doc.setFont("helvetica", "bold");
      doc.text(d.name || `Driver #${d.id}`, MARGIN, y);
      y += LINE;
      doc.setFont("helvetica", "normal");
      y = writeBlock(doc, y, "  Phone", d.phone);
      y = writeBlock(doc, y, "  Licence", d.licenseNumber);
      y = writeBlock(doc, y, "  Licence expiry", d.licenseExpiry);
      y = writeBlock(doc, y, "  Status", d.status);
      y += 2;
    }
  }
  return { filename: "03-drivers.pdf", blob: toBlob(doc) };
}

export function buildVehiclesPdf(s: CompanyBackupSnapshot): BackupPdfFile {
  const { doc, y: y0 } = newDoc(`Vehicles (${s.vehicles.length})`, s.exportedAt);
  let y = y0;
  if (s.vehicles.length === 0) y = writeParagraph(doc, y, "No vehicles stored.");
  else {
    for (const v of s.vehicles) {
      y = pageBreak(doc, y, 22);
      doc.setFont("helvetica", "bold");
      doc.text(v.name || v.registration || `Vehicle #${v.id}`, MARGIN, y);
      y += LINE;
      doc.setFont("helvetica", "normal");
      y = writeBlock(doc, y, "  Registration", v.registration);
      y = writeBlock(doc, y, "  Type", v.type);
      y = writeBlock(doc, y, "  MOT expiry", v.motExpiry);
      y = writeBlock(doc, y, "  Status", v.status);
      y += 2;
    }
  }
  return { filename: "04-vehicles.pdf", blob: toBlob(doc) };
}

export function buildJobsRegisterPdf(s: CompanyBackupSnapshot): BackupPdfFile {
  const { doc, y: y0 } = newDoc(`Jobs register (${s.jobs.length})`, s.exportedAt);
  let y = y0;
  if (s.jobs.length === 0) y = writeParagraph(doc, y, "No jobs.");
  else {
    for (const j of s.jobs) {
      y = pageBreak(doc, y, 36);
      const net = resolveInvoiceValueExVat(j);
      const cost = effectiveSupplierCostExVat(j);
      const gp = computeJobGpExVat(j).profit;
      doc.setFont("helvetica", "bold");
      doc.text(`${j.jobNumber} · ${j.customerName}`, MARGIN, y);
      y += LINE;
      doc.setFont("helvetica", "normal");
      y = writeBlock(doc, y, "  Status / dates", `${j.status} · coll ${j.collectionDate} · del ${j.deliveryDate || "—"}`);
      y = writeBlock(doc, y, "  Handler / carrier", `${j.handler} · ${j.carrier}`);
      y = writeBlock(doc, y, "  Net ex VAT / cost / GP", `£${net.toFixed(2)} · £${cost.toFixed(2)} · £${gp.toFixed(2)}`);
      y = writeBlock(doc, y, "  Invoice / POD", `Cust inv sent: ${j.invoiceSent} · POD rec: ${j.podReceived}`);
      y += 2;
    }
  }
  return { filename: "05-jobs-register.pdf", blob: toBlob(doc) };
}

export function buildJobsFullDetailPdf(s: CompanyBackupSnapshot): BackupPdfFile {
  const { doc, y: y0 } = newDoc(`Jobs — full field dump (${s.jobs.length})`, s.exportedAt);
  let y = y0;
  if (s.jobs.length === 0) y = writeParagraph(doc, y, "No jobs.");
  else {
    for (const j of s.jobs) {
      const json = JSON.stringify(j, null, 2);
      y = pageBreak(doc, y, 20);
      doc.setFont("helvetica", "bold");
      doc.text(`Job ${j.jobNumber} (id ${j.id})`, MARGIN, y);
      y += LINE + 1;
      doc.setFont("courier", "normal");
      doc.setFontSize(7);
      const lines = doc.splitTextToSize(json, MAX_W);
      for (const line of lines) {
        y = pageBreak(doc, y, LINE * 0.9);
        doc.text(line, MARGIN, y);
        y += LINE * 0.85;
      }
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      y += 4;
    }
  }
  return { filename: "06-jobs-full-detail.pdf", blob: toBlob(doc) };
}

export function buildDeletedJobsPdf(s: CompanyBackupSnapshot): BackupPdfFile {
  const { doc, y: y0 } = newDoc(`Deleted jobs bin (${s.deletedBin.length})`, s.exportedAt);
  let y = y0;
  if (s.deletedBin.length === 0) y = writeParagraph(doc, y, "Bin empty.");
  else {
    for (const e of s.deletedBin) {
      const j = e.job;
      y = pageBreak(doc, y, 28);
      doc.setFont("helvetica", "bold");
      doc.text(`${j.jobNumber} — deleted ${e.deletedAt}`, MARGIN, y);
      y += LINE;
      doc.setFont("helvetica", "normal");
      y = writeBlock(doc, y, "  By", e.deletedBy || "—");
      y = writeBlock(doc, y, "  Customer", j.customerName);
      y = writeParagraph(doc, y, JSON.stringify(j, null, 2).slice(0, 8000));
    }
  }
  return { filename: "07-deleted-jobs-bin.pdf", blob: toBlob(doc) };
}

export function buildSupportTicketsPdf(s: CompanyBackupSnapshot): BackupPdfFile {
  const { doc, y: y0 } = newDoc(`Support tickets (${s.supportTickets.length})`, s.exportedAt);
  let y = y0;
  if (s.supportTickets.length === 0) y = writeParagraph(doc, y, "No tickets.");
  else {
    for (const t of s.supportTickets) {
      y = pageBreak(doc, y, 40);
      doc.setFont("helvetica", "bold");
      doc.text(`${t.ticketNumber} · ${t.category}`, MARGIN, y);
      y += LINE;
      doc.setFont("helvetica", "normal");
      y = writeBlock(doc, y, "  Reporter", `${t.reporterName} <${t.reporterEmail}>`);
      y = writeBlock(doc, y, "  Company", t.reporterCompany);
      y = writeBlock(doc, y, "  Created", t.createdAt);
      y = writeBlock(doc, y, "  Resolved", t.resolved ? `Yes · ${t.resolvedAt ?? ""} ${t.resolvedNote ?? ""}` : "No");
      y = writeParagraph(doc, y, t.description);
      if (t.screenshotDataUrl) {
        y = writeParagraph(doc, y, "[Screenshot was attached in the app — data URL omitted from PDF for size.]");
      }
      y += 2;
    }
  }
  return { filename: "08-support-tickets.pdf", blob: toBlob(doc) };
}

const issuerFromSnapshot = (s: CompanyBackupSnapshot): BookingPdfIssuer => ({
  details: s.company,
  preparedBy: s.preparedBy,
});

/**
 * Core backup PDFs (always generated): profile, terms, CRM, fleet, jobs summaries, bin, tickets.
 */
export function buildCoreBackupPdfPack(s: CompanyBackupSnapshot): BackupPdfFile[] {
  return [
    buildCompanyProfilePdf(s),
    buildBibbyTermsPdf(s),
    buildCustomersPdf(s),
    buildDriversPdf(s),
    buildVehiclesPdf(s),
    buildJobsRegisterPdf(s),
    buildJobsFullDetailPdf(s),
    buildDeletedJobsPdf(s),
    buildSupportTicketsPdf(s),
  ];
}

/**
 * Optional per-job PDFs: combined customer+supplier booking pack and customer invoice layout.
 */
export async function buildPerJobBackupPdfs(s: CompanyBackupSnapshot): Promise<BackupPdfFile[]> {
  const issuer = issuerFromSnapshot(s);
  const out: BackupPdfFile[] = [];
  for (const job of s.jobs) {
    const base = safeSegment(job.jobNumber || String(job.id));
    const combined = await buildCombinedBookingPdf(job, issuer);
    out.push({
      filename: `job-${base}-combined-booking.pdf`,
      blob: combined.output("blob"),
    });
    const inv = await buildJobInvoicePdf(job, issuer);
    out.push({
      filename: `job-${base}-customer-invoice.pdf`,
      blob: inv.output("blob"),
    });
  }
  return out;
}

/**
 * Full pack: core PDFs plus optional per-job booking/invoice PDFs.
 */
export async function buildFullBackupPdfPack(
  s: CompanyBackupSnapshot,
  options: { includePerJobPdfs: boolean },
): Promise<BackupPdfFile[]> {
  const core = buildCoreBackupPdfPack(s);
  if (!options.includePerJobPdfs || s.jobs.length === 0) return core;
  const extra = await buildPerJobBackupPdfs(s);
  return [...core, ...extra];
}

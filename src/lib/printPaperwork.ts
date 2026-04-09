import { COMPANY_LEGAL_NAME, LOGO_PATH } from "./companyBrand";
import { defaultExportCompanyDetails, type UserCompanyDetails } from "./userCompanyProfile";

export function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function letterheadDetailsHtml(d: UserCompanyDetails, preparedBy?: string): string {
  const parts: string[] = [];
  const line = (s: string) => s.trim();
  parts.push(
    `<div style="font-size:12px;font-weight:600;color:#111827">${escapeHtml(line(d.companyLegalName) || COMPANY_LEGAL_NAME)}</div>`
  );
  if (line(d.telephone)) parts.push(`<div>Tel: ${escapeHtml(line(d.telephone))}</div>`);
  if (line(d.mobile)) parts.push(`<div>Mob: ${escapeHtml(line(d.mobile))}</div>`);
  if (line(d.email)) parts.push(`<div>Email: ${escapeHtml(line(d.email))}</div>`);
  if (line(d.website)) parts.push(`<div>Website: ${escapeHtml(line(d.website))}</div>`);
  parts.push(`<div style="margin-top:8px;font-weight:600;color:#374151">Company details</div>`);
  if (line(d.companyNumber)) parts.push(`<div>Company Number: ${escapeHtml(line(d.companyNumber))}</div>`);
  if (line(d.vatNumber)) parts.push(`<div>GB VAT Number: ${escapeHtml(line(d.vatNumber))}</div>`);
  if (line(d.eoriNumber)) parts.push(`<div>EORI Number: ${escapeHtml(line(d.eoriNumber))}</div>`);
  if (line(preparedBy ?? "")) {
    parts.push(`<div style="margin-top:8px">Prepared by: ${escapeHtml(line(preparedBy!))}</div>`);
  }
  return parts.join("");
}

/** Opens a print dialog with letterhead (logo + company block from the signed-in user when provided). */
export function printPaperwork(options: {
  title: string;
  contentHtml: string;
  companyDetails?: UserCompanyDetails;
  preparedBy?: string;
}): boolean {
  const w = window.open("", "_blank");
  if (!w) return false;
  const logoUrl = `${window.location.origin}${LOGO_PATH}`;
  const { title, contentHtml, companyDetails, preparedBy } = options;
  const details = companyDetails ?? defaultExportCompanyDetails();
  const legalInner = letterheadDetailsHtml(details, preparedBy);
  const imgAlt = escapeHtml(details.companyLegalName.trim() || COMPANY_LEGAL_NAME);
  w.document.open();
  w.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: Inter, system-ui, sans-serif; margin: 24px; color: #111827; }
  .brand { margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb; }
  .brand img { height: 52px; width: auto; display: block; }
  .legal { font-size: 11px; color: #6b7280; margin-top: 6px; line-height: 1.5; }
  h1.doc-title { font-size: 18px; font-weight: 600; margin: 0 0 16px; }
  @media print { body { margin: 12mm; } }
</style></head><body>
<div class="brand">
  <img src="${logoUrl}" alt="${imgAlt}" />
  <div class="legal">${legalInner}</div>
</div>
<h1 class="doc-title">${escapeHtml(title)}</h1>
${contentHtml}
</body></html>`);
  w.document.close();
  w.focus();
  w.print();
  return true;
}

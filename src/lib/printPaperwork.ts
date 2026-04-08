import { COMPANY_LEGAL_NAME, LOGO_PATH } from "./companyBrand";

export function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Opens a print dialog with letterhead (logo + company name). */
export function printPaperwork(options: { title: string; contentHtml: string }): boolean {
  const w = window.open("", "_blank");
  if (!w) return false;
  const logoUrl = `${window.location.origin}${LOGO_PATH}`;
  const { title, contentHtml } = options;
  w.document.open();
  w.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: Inter, system-ui, sans-serif; margin: 24px; color: #111827; }
  .brand { margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb; }
  .brand img { height: 52px; width: auto; display: block; }
  .legal { font-size: 11px; color: #6b7280; margin-top: 6px; }
  h1.doc-title { font-size: 18px; font-weight: 600; margin: 0 0 16px; }
  @media print { body { margin: 12mm; } }
</style></head><body>
<div class="brand">
  <img src="${logoUrl}" alt="${escapeHtml(COMPANY_LEGAL_NAME)}" />
  <div class="legal">${escapeHtml(COMPANY_LEGAL_NAME)}</div>
</div>
<h1 class="doc-title">${escapeHtml(title)}</h1>
${contentHtml}
</body></html>`);
  w.document.close();
  w.focus();
  w.print();
  return true;
}

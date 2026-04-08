export const COMPANY_LEGAL_NAME = "Hayleigh Transport Ltd.";
export const COMPANY_SHORT_NAME = "Hayleigh Transport";

/** Public marketing site and quote enquiries (mailto targets). */
export const OFFICE_ENQUIRIES_EMAIL = "office@hayleigh.uk";

/** Logo served from `public/ht-logo.png` (use with absolute path `/ht-logo.png`). */
export const LOGO_PATH = "/ht-logo.png";

export function mailtoOffice(subject: string, body: string): string {
  return `mailto:${OFFICE_ENQUIRIES_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Prepends branded rows so CSV opens with company context (column-aligned to `headers`). */
export function prependBrandedCsvPreamble(headers: string[]): string[] {
  const n = headers.length;
  if (n === 0) return [];
  const pad = (first: string) => [first, ...Array(n - 1).fill("")].join(",");
  const empty = Array(n).fill("").join(",");
  return [
    pad(COMPANY_LEGAL_NAME),
    pad(`Generated: ${new Date().toISOString().slice(0, 10)}`),
    empty,
  ];
}

import { userCompanyDetailsCsvRows, type UserCompanyDetails } from "./userCompanyProfile";

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
export function prependBrandedCsvPreamble(
  headers: string[],
  details?: UserCompanyDetails,
  preparedBy?: string
): string[] {
  const n = headers.length;
  if (n === 0) return [];
  const pad = (first: string) => [first, ...Array(n - 1).fill("")].join(",");
  const empty = Array(n).fill("").join(",");
  const contentRows = details
    ? userCompanyDetailsCsvRows(details, preparedBy)
    : [COMPANY_LEGAL_NAME, `Generated: ${new Date().toISOString().slice(0, 10)}`];
  return [...contentRows.map(pad), empty];
}

export type { UserCompanyDetails };

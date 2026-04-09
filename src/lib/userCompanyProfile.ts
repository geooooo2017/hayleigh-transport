/** Letterhead / export block saved per staff user (browser localStorage). */

export type UserCompanyDetails = {
  companyLegalName: string;
  telephone: string;
  mobile: string;
  email: string;
  website: string;
  companyNumber: string;
  vatNumber: string;
  eoriNumber: string;
};

const STORAGE_KEY = "ht_user_company_details";

function orgDefaults(): UserCompanyDetails {
  return {
    companyLegalName: "Hayleigh Transport Ltd",
    telephone: "01698 480314",
    mobile: "",
    email: "",
    website: "www.hayleightransport.uk",
    companyNumber: "SC818916",
    vatNumber: "474 9314 63",
    eoriNumber: "GB099347165000",
  };
}

/** First-time hints for known accounts (overridden once the user saves Settings). */
const PRESET_BY_USER_ID: Record<string, Partial<UserCompanyDetails>> = {
  nik: { mobile: "07508 144225", email: "Nik@hayleigh.uk" },
  scott: { mobile: "07377178531", email: "Scott@hayleigh.uk" },
};

function readAllStored(): Record<string, UserCompanyDetails> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, UserCompanyDetails>;
  } catch {
    return {};
  }
}

function writeAllStored(next: Record<string, UserCompanyDetails>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
}

/** Org-wide defaults only (no per-user seed) — fallback when no user context. */
export function defaultExportCompanyDetails(): UserCompanyDetails {
  return orgDefaults();
}

/**
 * Effective profile: org defaults → optional preset for known user ids → saved overrides for that user.
 * Keir (and others) start from org defaults with blank mobile/email until they save under Settings.
 */
export function getUserCompanyDetails(userId: string | undefined): UserCompanyDetails {
  const base = orgDefaults();
  const preset = userId ? PRESET_BY_USER_ID[userId] ?? {} : {};
  const stored = userId ? readAllStored()[userId] : undefined;
  return { ...base, ...preset, ...(stored ?? {}) };
}

export function saveUserCompanyDetails(userId: string, details: UserCompanyDetails): void {
  const all = readAllStored();
  all[userId] = details;
  writeAllStored(all);
}

/** Rows before the CSV header column (first cell spans logical “block”, rest empty). */
export function userCompanyDetailsCsvRows(d: UserCompanyDetails, preparedBy?: string): string[] {
  const rows: string[] = [];
  const push = (s: string) => {
    const t = s.trim();
    if (t) rows.push(t);
  };
  push(d.companyLegalName);
  if (d.telephone.trim()) push(`Tel: ${d.telephone.trim()}`);
  if (d.mobile.trim()) push(`Mob: ${d.mobile.trim()}`);
  if (d.email.trim()) push(`Email: ${d.email.trim()}`);
  if (d.website.trim()) push(`Website: ${d.website.trim()}`);
  rows.push("");
  rows.push("Company details");
  if (d.companyNumber.trim()) push(`Company Number: ${d.companyNumber.trim()}`);
  if (d.vatNumber.trim()) push(`GB VAT Number: ${d.vatNumber.trim()}`);
  if (d.eoriNumber.trim()) push(`EORI Number: ${d.eoriNumber.trim()}`);
  rows.push("");
  if (preparedBy?.trim()) push(`Prepared by: ${preparedBy.trim()}`);
  rows.push(`Generated: ${new Date().toISOString().slice(0, 10)}`);
  return rows;
}

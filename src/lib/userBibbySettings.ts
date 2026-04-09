import { DEFAULT_BIBBY_TERMS, type BibbyTerms } from "./bibbyFinancing";

const STORAGE_KEY = "ht_user_bibby_terms";

function readAll(): Record<string, BibbyTerms> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, BibbyTerms>;
  } catch {
    return {};
  }
}

function writeAll(next: Record<string, BibbyTerms>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
}

function mergeWithDefaults(partial: Partial<BibbyTerms> | undefined): BibbyTerms {
  return {
    ...DEFAULT_BIBBY_TERMS,
    ...partial,
    includeBadDebtProtection:
      partial?.includeBadDebtProtection ?? DEFAULT_BIBBY_TERMS.includeBadDebtProtection,
  };
}

export function getUserBibbyTerms(userId: string | undefined): BibbyTerms {
  if (!userId) return { ...DEFAULT_BIBBY_TERMS };
  const row = readAll()[userId];
  return mergeWithDefaults(row);
}

export function saveUserBibbyTerms(userId: string, terms: BibbyTerms): void {
  const all = readAll();
  all[userId] = { ...terms };
  writeAll(all);
}

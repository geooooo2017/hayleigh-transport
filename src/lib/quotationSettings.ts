import type { QuotationEngineMode, QuotationRateCard, QuotationSettings } from "../types";

export const QUOTATION_SETTINGS_KEY = "ht_quotation_settings_v1";

export const DEFAULT_RATE_CARD: QuotationRateCard = {
  domesticPerMile: 1.2,
  internationalMult: 1.5,
  articMult: 1.5,
  rigidMult: 1.2,
  vanMult: 1,
  fuelPct: 12,
  explanation:
    "Indicative lines use an estimated distance between postcodes and the multipliers below. Staff always review and edit amounts; customers never see prices until a logged-in user approves.",
};

/** Default: manual — no auto cost lines on public submit until staff tune rates and switch mode. */
export const DEFAULT_QUOTATION_SETTINGS: QuotationSettings = {
  mode: "manual",
  rateCard: DEFAULT_RATE_CARD,
};

export function readQuotationSettings(): QuotationSettings {
  try {
    const raw = localStorage.getItem(QUOTATION_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_QUOTATION_SETTINGS, rateCard: { ...DEFAULT_RATE_CARD } };
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== "object") return { ...DEFAULT_QUOTATION_SETTINGS, rateCard: { ...DEFAULT_RATE_CARD } };
    const rec = o as Record<string, unknown>;
    const mode = rec.mode === "automatic" || rec.mode === "manual" || rec.mode === "disabled" ? rec.mode : "manual";
    const rc = rec.rateCard;
    let rateCard = { ...DEFAULT_RATE_CARD };
    if (rc && typeof rc === "object") {
      const r = rc as Record<string, unknown>;
      const num = (k: keyof QuotationRateCard, def: number) =>
        typeof r[k] === "number" && Number.isFinite(r[k] as number) ? (r[k] as number) : def;
      const str = (k: "explanation", def: string) => (typeof r[k] === "string" ? (r[k] as string) : def);
      rateCard = {
        domesticPerMile: num("domesticPerMile", DEFAULT_RATE_CARD.domesticPerMile),
        internationalMult: num("internationalMult", DEFAULT_RATE_CARD.internationalMult),
        articMult: num("articMult", DEFAULT_RATE_CARD.articMult),
        rigidMult: num("rigidMult", DEFAULT_RATE_CARD.rigidMult),
        vanMult: num("vanMult", DEFAULT_RATE_CARD.vanMult),
        fuelPct: num("fuelPct", DEFAULT_RATE_CARD.fuelPct),
        explanation: str("explanation", DEFAULT_RATE_CARD.explanation),
      };
    }
    return { mode: mode as QuotationEngineMode, rateCard };
  } catch {
    return { ...DEFAULT_QUOTATION_SETTINGS, rateCard: { ...DEFAULT_RATE_CARD } };
  }
}

export function writeQuotationSettings(s: QuotationSettings) {
  try {
    localStorage.setItem(QUOTATION_SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* quota */
  }
}

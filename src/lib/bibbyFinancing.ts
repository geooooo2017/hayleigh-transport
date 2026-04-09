import type { Job } from "../types";
import { jobNetExVat } from "./jobNetAmount";

/** Editable agreement terms (Bibby-style invoice financing). Percentages are e.g. 85 for 85%. */
export type BibbyTerms = {
  prepaymentPercent: number;
  serviceFeePercent: number;
  badDebtProtectionPercent: number;
  discountFeePercent: number;
  bankBaseRatePercent: number;
  /** When false, bad debt protection fee is treated as 0. */
  includeBadDebtProtection: boolean;
};

export const DEFAULT_BIBBY_TERMS: BibbyTerms = {
  prepaymentPercent: 85,
  serviceFeePercent: 0.95,
  badDebtProtectionPercent: 1.13,
  discountFeePercent: 2.99,
  bankBaseRatePercent: 3.75,
  includeBadDebtProtection: true,
};

export function bibbyTotalDiscountAprPercent(terms: BibbyTerms): number {
  return terms.discountFeePercent + terms.bankBaseRatePercent;
}

export type BibbyBreakdown = {
  invoiceValue: number;
  prepaymentPercent: number;
  amountAdvanced: number;
  serviceFee: number;
  badDebtProtection: number;
  totalDiscountAprPercent: number;
  annualDiscountCost: number;
  dailyDiscount: number;
  /** Days used for discount period; 0 if user entered 0 or if days not yet provided. */
  daysOutstanding: number;
  /** False until `bibbyDaysOutstanding` is set on the job — discount fee is then 0 in totals below. */
  daysProvided: boolean;
  discountFeeForPeriod: number;
  /** SF + BDP + discount; when `!daysProvided`, excludes discount component. */
  overallCost: number;
  costPercentOfTurnover: number;
  operatingProfit: number;
  profitAfterBibby: number;
  marginAfterBibbyPercent: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Invoice value on the facility: explicit job override, else net customer turnover (sell + fuel + extras, ex VAT). */
export function resolveBibbyInvoiceValue(job: Pick<Job, "bibbyInvoiceValueExVat" | "sellPrice" | "fuelSurcharge" | "extraCharges">): number {
  const v = job.bibbyInvoiceValueExVat;
  if (v != null && Number.isFinite(v) && v > 0) return v;
  return jobNetExVat(job as Job);
}

export function computeOperatingProfit(job: Pick<Job, "sellPrice" | "buyPrice" | "fuelSurcharge" | "extraCharges">): number {
  const sell = Number(job.sellPrice) || 0;
  const buy = Number(job.buyPrice) || 0;
  const fuel = Number(job.fuelSurcharge) || 0;
  const extra = Number(job.extraCharges) || 0;
  return sell - buy - fuel - extra;
}

/**
 * Full Bibby-style cost stack. If `daysOutstanding` is undefined, discount fee for the period is 0 (caller should prompt for days).
 */
export function computeBibbyBreakdown(
  job: Pick<Job, "sellPrice" | "buyPrice" | "fuelSurcharge" | "extraCharges" | "bibbyInvoiceValueExVat" | "bibbyDaysOutstanding">,
  terms: BibbyTerms
): BibbyBreakdown | null {
  const invoiceValue = resolveBibbyInvoiceValue(job);
  if (!(invoiceValue > 0)) return null;

  const daysOutstanding = job.bibbyDaysOutstanding;
  const daysProvided = daysOutstanding != null && Number.isFinite(daysOutstanding);
  const days = daysProvided ? Math.max(0, Math.floor(daysOutstanding as number)) : 0;

  const prep = terms.prepaymentPercent / 100;
  const amountAdvanced = round2(invoiceValue * prep);

  const serviceFee = round2(invoiceValue * (terms.serviceFeePercent / 100));
  const badDebtProtection = terms.includeBadDebtProtection
    ? round2(invoiceValue * (terms.badDebtProtectionPercent / 100))
    : 0;

  const apr = bibbyTotalDiscountAprPercent(terms) / 100;
  const annualDiscountCost = round2(amountAdvanced * apr);
  const dailyDiscount = round2(annualDiscountCost / 365);
  const discountFeeForPeriod = daysProvided ? round2(dailyDiscount * days) : 0;

  const overallCost = round2(serviceFee + badDebtProtection + discountFeeForPeriod);
  const costPercentOfTurnover = round2((overallCost / invoiceValue) * 100);

  const operatingProfit = computeOperatingProfit(job);
  const profitAfterBibby = round2(operatingProfit - overallCost);
  const marginAfterBibbyPercent = invoiceValue > 0 ? round2((profitAfterBibby / invoiceValue) * 100) : 0;

  return {
    invoiceValue,
    prepaymentPercent: terms.prepaymentPercent,
    amountAdvanced,
    serviceFee,
    badDebtProtection,
    totalDiscountAprPercent: bibbyTotalDiscountAprPercent(terms),
    annualDiscountCost,
    dailyDiscount,
    daysOutstanding: days,
    daysProvided,
    discountFeeForPeriod,
    overallCost,
    costPercentOfTurnover,
    operatingProfit,
    profitAfterBibby,
    marginAfterBibbyPercent,
  };
}

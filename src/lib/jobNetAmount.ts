import type { Job } from "../types";

/** Customer-facing net (ex VAT): sell + fuel surcharge + extra charges. */
export function jobNetExVat(j: Job): number {
  return (Number(j.sellPrice) || 0) + (Number(j.fuelSurcharge) || 0) + (Number(j.extraCharges) || 0);
}

/**
 * Value on customer invoice for GP / financing (explicit Bibby override when set, else full customer net ex VAT).
 */
export function resolveInvoiceValueExVat(
  job: Pick<Job, "bibbyInvoiceValueExVat" | "sellPrice" | "fuelSurcharge" | "extraCharges">,
): number {
  const v = job.bibbyInvoiceValueExVat;
  if (v != null && Number.isFinite(v) && v > 0) return v;
  return jobNetExVat(job as Job);
}

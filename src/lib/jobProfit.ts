import type { Job } from "../types";
import { resolveInvoiceValueExVat } from "./jobNetAmount";

/** Supplier cost for GP: sum of uploaded supplier lines when present, else buy price (ex VAT). */
export function effectiveSupplierCostExVat(job: Pick<Job, "buyPrice" | "supplierInvoiceLines">): number {
  const lines = job.supplierInvoiceLines;
  if (Array.isArray(lines) && lines.length > 0) {
    return Math.round(lines.reduce((s, l) => s + (Number(l.amountExVat) || 0), 0) * 100) / 100;
  }
  return Number(job.buyPrice) || 0;
}

/**
 * Gross profit (ex VAT): customer invoice value (see `resolveInvoiceValueExVat`) minus supplier cost.
 * Margin = profit ÷ that same customer value.
 */
export function computeJobGpExVat(
  job: Pick<Job, "sellPrice" | "buyPrice" | "fuelSurcharge" | "extraCharges" | "bibbyInvoiceValueExVat" | "supplierInvoiceLines">,
): { profit: number; margin: number } {
  const revenue = resolveInvoiceValueExVat(job);
  const cost = effectiveSupplierCostExVat(job);
  const profit = Math.round((revenue - cost) * 100) / 100;
  const margin = revenue > 0 ? Math.round((profit / revenue) * 10000) / 100 : 0;
  return { profit, margin };
}

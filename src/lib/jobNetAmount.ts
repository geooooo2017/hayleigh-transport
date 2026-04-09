import type { Job } from "../types";

/** Customer-facing net (ex VAT): sell + fuel surcharge + extra charges. */
export function jobNetExVat(j: Job): number {
  return (Number(j.sellPrice) || 0) + (Number(j.fuelSurcharge) || 0) + (Number(j.extraCharges) || 0);
}

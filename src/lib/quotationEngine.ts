import type { PublicQuoteFormShape, QuotationCostLine, QuotationRateCard } from "../types";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Deterministic “lane length” for suggested lines (not a surveyed mile). */
export function estimateDistanceMiles(collectionPostcode: string, deliveryPostcode: string): number {
  const h = hashStr(`${collectionPostcode.trim().toUpperCase()}|${deliveryPostcode.trim().toUpperCase()}`);
  return 50 + (h % 300);
}

function vehicleMult(vehicleType: string, rate: QuotationRateCard): number {
  if (vehicleType === "artic") return rate.articMult;
  if (vehicleType === "rigid") return rate.rigidMult;
  return rate.vanMult;
}

export function suggestQuotationCostLines(form: PublicQuoteFormShape, rate: QuotationRateCard): {
  lines: QuotationCostLine[];
  estimatedDistanceMiles: number;
  estimatedDurationText: string;
} {
  const dist = estimateDistanceMiles(form.collectionPostcode, form.deliveryPostcode);
  const serviceMult = form.serviceType === "international" ? rate.internationalMult : 1;
  const vm = vehicleMult(form.vehicleType, rate);
  const base = Math.round(dist * rate.domesticPerMile * serviceMult * vm * 100) / 100;
  const fuel = Math.round((base * (rate.fuelPct / 100)) * 100) / 100;
  const lines: QuotationCostLine[] = [
    {
      id: crypto.randomUUID(),
      label: "Transport (indicative)",
      amountExVat: base,
      approved: false,
    },
    {
      id: crypto.randomUUID(),
      label: "Fuel surcharge (indicative)",
      amountExVat: fuel,
      approved: false,
    },
  ];
  const hoursLo = Math.floor(dist / 50);
  const hoursHi = Math.ceil(dist / 40);
  return {
    lines,
    estimatedDistanceMiles: dist,
    estimatedDurationText: `${hoursLo} – ${hoursHi} hours (indicative)`,
  };
}

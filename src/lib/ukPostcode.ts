import { normalizeUkPostcodeInput } from "./geocode";

/**
 * True if the string is a full valid UK postcode format (not a partial like "M1" or "SW1").
 * Does not prove the postcode exists — use postcodes.io for that.
 */
export function isValidUkPostcodeFormat(raw: string): boolean {
  const s = raw.trim();
  if (!s) return true; // empty allowed (optional field)
  const pc = normalizeUkPostcodeInput(s);
  if (pc.length < 5 || pc.length > 8) return false;
  if (pc === "GIR0AA") return true;
  // Outward + inward: inward is always one digit + two letters
  return /^[A-Z]{1,2}\d[0-9A-Z]?\d[A-Z]{2}$/.test(pc);
}

export function ukPostcodeValidationMessage(fieldLabel: string): string {
  return `${fieldLabel} must be a complete UK postcode (e.g. M1 1AA, SW1A 1AA, CR0 2AA), not a partial.`;
}

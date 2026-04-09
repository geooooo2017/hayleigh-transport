/**
 * UK postcodes → lat/lng via postcodes.io (no API key; OK from the browser).
 * For non‑UK / full addresses, uses Nominatim (may be rate‑limited; use sparingly).
 */

const NOMINATIM_UA = "HayleighTransport/1.0 (+https://github.com/geooooo2017/hayleigh-transport)";

export type GeocodeResult = { lat: number; lng: number };

/** Normalise UK postcode for APIs (e.g. "SW1A 1AA" → "SW1A1AA"). */
export function normalizeUkPostcodeInput(raw: string): string {
  return raw.trim().replace(/\s+/g, "").toUpperCase();
}

/** Resolve a GB postcode to coordinates. Returns null if invalid or not found. */
export async function geocodeUkPostcode(postcode: string): Promise<GeocodeResult | null> {
  const pc = normalizeUkPostcodeInput(postcode);
  if (pc.length < 5) return null;
  try {
    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      status: number;
      result?: { latitude: number; longitude: number };
    };
    if (json.status !== 200 || !json.result) return null;
    return { lat: json.result.latitude, lng: json.result.longitude };
  } catch {
    return null;
  }
}

/** Free‑text search (full address, city, or foreign address). Throttle in UI. */
export async function geocodeNominatim(query: string): Promise<GeocodeResult | null> {
  const q = query.trim();
  if (q.length < 3) return null;
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("q", q);
    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
        "User-Agent": NOMINATIM_UA,
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { lat?: string; lon?: string }[];
    const row = data[0];
    if (!row?.lat || !row?.lon) return null;
    const lat = parseFloat(row.lat);
    const lng = parseFloat(row.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

/** Small delay to respect Nominatim usage (max ~1 req/s). */
export function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

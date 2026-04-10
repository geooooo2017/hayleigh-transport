/**
 * Free address search via OpenStreetMap Nominatim (no API key).
 * @see https://operations.osmfoundation.org/policies/nominatim/ — throttle ~1 request/sec; identify the app.
 */

import type { PlaceResolvedPayload } from "./googlePlaceToAddress";
import { delay } from "./geocode";

const NOMINATIM_UA = "HayleighTransport/1.0 (+https://github.com/geooooo2017/hayleigh-transport)";

/** Shared throttle so collection + delivery searches do not burst the public endpoint. */
let lastNominatimSearchAt = 0;
const MIN_INTERVAL_MS = 1100;

type NominatimAddr = {
  house_number?: string;
  road?: string;
  pedestrian?: string;
  residential?: string;
  path?: string;
  neighbourhood?: string;
  suburb?: string;
  quarter?: string;
  village?: string;
  town?: string;
  city?: string;
  county?: string;
  hamlet?: string;
  municipality?: string;
  postcode?: string;
};

type NominatimHit = {
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  class?: string;
  type?: string;
  address?: NominatimAddr;
};

const POI_CLASSES = new Set([
  "amenity",
  "shop",
  "tourism",
  "office",
  "leisure",
  "craft",
  "healthcare",
  "railway",
]);

function organisationFromHit(hit: NominatimHit): string {
  const n = hit.name?.trim();
  if (!n) return "";
  if (POI_CLASSES.has(hit.class ?? "")) return n;
  if (hit.class === "building" && hit.type && hit.type !== "house" && hit.type !== "residential") return n;
  return "";
}

export function nominatimHitToPayload(hit: NominatimHit): PlaceResolvedPayload {
  const a = hit.address ?? {};
  const hn = a.house_number ?? "";
  const street =
    a.road ?? a.pedestrian ?? a.residential ?? a.path ?? "";
  const line1 = [hn, street].filter(Boolean).join(" ").trim();

  const line2 = [a.suburb, a.neighbourhood, a.quarter].filter(Boolean).join(", ").trim();

  const town =
    a.city ??
    a.town ??
    a.village ??
    a.hamlet ??
    a.municipality ??
    a.county ??
    "";

  const postcode = a.postcode ?? "";
  const organisation = organisationFromHit(hit);

  const lat = parseFloat(hit.lat);
  const lng = parseFloat(hit.lon);
  return {
    organisation,
    line1,
    line2,
    town,
    postcode,
    lat: Number.isFinite(lat) ? lat : undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
  };
}

export type NominatimAddressChoice = PlaceResolvedPayload & { displayName: string };

export async function searchNominatimAddresses(
  query: string,
  opts?: { countryCode?: string }
): Promise<NominatimAddressChoice[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const now = Date.now();
  const wait = Math.max(0, MIN_INTERVAL_MS - (now - lastNominatimSearchAt));
  if (wait > 0) await delay(wait);
  lastNominatimSearchAt = Date.now();

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");
  url.searchParams.set("q", q);
  if (opts?.countryCode) url.searchParams.set("countrycodes", opts.countryCode.toLowerCase());

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "Accept-Language": "en",
      "User-Agent": NOMINATIM_UA,
    },
  });
  if (!res.ok) return [];

  const data = (await res.json()) as NominatimHit[];
  if (!Array.isArray(data)) return [];

  return data.map((hit) => ({
    ...nominatimHitToPayload(hit),
    displayName: hit.display_name,
  }));
}

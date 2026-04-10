/** Driving route for Leaflet polylines + ETA. */

export type DrivingRouteLeg = {
  /** [lat, lng][] for L.polyline */
  points: [number, number][];
  durationSeconds: number;
  /** Present when Google returned traffic-adjusted time */
  durationInTrafficSeconds?: number;
  distanceMeters: number;
  source: "google_traffic" | "osrm";
};

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

function finiteLatLng(p: { lat: number; lng: number }): boolean {
  return Number.isFinite(p.lat) && Number.isFinite(p.lng);
}

export async function fetchOsrmRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<DrivingRouteLeg | null> {
  if (!finiteLatLng(from) || !finiteLatLng(to)) return null;
  const url = `${OSRM_BASE}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      routes?: { duration?: number; distance?: number; geometry?: { coordinates?: [number, number][] } }[];
    };
    const r = data.routes?.[0];
    const coords = r?.geometry?.coordinates;
    if (!r || !coords?.length || r.duration == null) return null;
    const points: [number, number][] = coords.map((c) => [c[1], c[0]]);
    return {
      points,
      durationSeconds: r.duration,
      distanceMeters: r.distance ?? 0,
      source: "osrm",
    };
  } catch {
    return null;
  }
}

let googleMapsLoadPromise: Promise<void> | null = null;

function loadGoogleMapsScript(): Promise<void> {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  if (!key?.trim()) return Promise.reject(new Error("no_google_key"));

  if (typeof window !== "undefined" && window.google?.maps?.DirectionsService) {
    return Promise.resolve();
  }
  if (googleMapsLoadPromise) return googleMapsLoadPromise;

  googleMapsLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-ht-google-maps="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("google_maps_script")));
      return;
    }
    const s = document.createElement("script");
    s.dataset.htGoogleMaps = "1";
    s.async = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key.trim())}`;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("google_maps_script"));
    document.head.appendChild(s);
  });
  return googleMapsLoadPromise;
}

/**
 * Google Directions with traffic (requires billing + Directions API on the key).
 * Falls back to null on any failure — caller should use OSRM.
 */
export async function fetchGoogleTrafficRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<DrivingRouteLeg | null> {
  if (!finiteLatLng(from) || !finiteLatLng(to)) return null;
  try {
    await loadGoogleMapsScript();
  } catch {
    return null;
  }
  const g = window.google;
  if (!g?.maps?.DirectionsService) return null;

  const svc = new g.maps.DirectionsService();
  return new Promise((resolve) => {
    svc.route(
      {
        origin: from,
        destination: to,
        travelMode: g.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: g.maps.TrafficModel.BEST_GUESS,
        },
        region: "GB",
      },
      (result, status) => {
        if (status !== g.maps.DirectionsStatus.OK || !result?.routes?.[0]) {
          resolve(null);
          return;
        }
        const route = result.routes[0];
        const leg = route.legs?.[0];
        const path = route.overview_path;
        if (!path?.length || !leg) {
          resolve(null);
          return;
        }
        const points: [number, number][] = path.map((pt) => [pt.lat(), pt.lng()]);
        const base = leg.duration?.value ?? 0;
        const traffic = leg.duration_in_traffic?.value;
        resolve({
          points,
          durationSeconds: traffic ?? base,
          durationInTrafficSeconds: traffic,
          distanceMeters: leg.distance?.value ?? 0,
          source: "google_traffic",
        });
      }
    );
  });
}

/** Prefer Google (traffic), then OSRM. */
export async function fetchDrivingRouteWithTrafficFallback(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<DrivingRouteLeg | null> {
  const g = await fetchGoogleTrafficRoute(from, to);
  if (g) return g;
  return fetchOsrmRoute(from, to);
}

export function formatDriveDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const m = Math.max(1, Math.round(seconds / 60));
  if (m >= 120) {
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r ? `~${h}h ${r}m` : `~${h}h`;
  }
  return `~${m} min`;
}

export function formatEtaClock(secondsFromNow: number): string {
  if (!Number.isFinite(secondsFromNow) || secondsFromNow < 0) return "—";
  const eta = new Date(Date.now() + secondsFromNow * 1000);
  return eta.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function formatEtaSummary(leg: DrivingRouteLeg): string {
  const dur = formatDriveDuration(leg.durationSeconds);
  const clock = formatEtaClock(leg.durationSeconds);
  const traffic =
    leg.source === "google_traffic" && leg.durationInTrafficSeconds != null
      ? " (traffic-aware)"
      : leg.source === "osrm"
        ? " (typical roads, no live traffic)"
        : "";
  return `${dur} · arrive ~${clock}${traffic}`;
}

import type { Job } from "../types";
import { haversineKm } from "./customerNotifications";
import { fetchOsrmRoute } from "./drivingDirections";

/** Synthetic job id — not stored in cloud; only merged on Live Tracking for showroom demo. */
export const LIVE_TRACKING_DEMO_JOB_ID = 91000055;

/** Must match `truckPlates` on the demo job (driver pin matching). */
export const LIVE_TRACKING_DEMO_REG = "DEMO12";

/** ~6 road miles: Warwick (A) → south of Leamington Spa (B). */
const POINT_A = { lat: 52.2814, lng: -1.5849 };
const POINT_B = { lat: 52.2678, lng: -1.5224 };

export function createLiveTrackingDemoJob(): Job {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: LIVE_TRACKING_DEMO_JOB_ID,
    jobNumber: "DEMO-LIVE",
    handler: "Demo",
    routeType: "domestic",
    collectionDate: today,
    deliveryDate: today,
    customerName: "Customer demo (not a real job)",
    carrier: "Hayleigh Transport",
    truckPlates: LIVE_TRACKING_DEMO_REG,
    buyPrice: 0,
    sellPrice: 1,
    fuelSurcharge: 0,
    extraCharges: 0,
    collectionAddressLines: "Demo collection — Warwick area",
    collectionContactName: "",
    collectionContactPhone: "",
    collectionContactEmail: "",
    deliveryAddressLines: "Demo delivery — Leamington area",
    deliveryContactName: "",
    deliveryContactPhone: "",
    deliveryContactEmail: "",
    collectionPostcode: "CV34 4EW",
    deliveryPostcode: "CV31 3AB",
    collectionLat: POINT_A.lat,
    collectionLng: POINT_A.lng,
    deliveryLat: POINT_B.lat,
    deliveryLng: POINT_B.lng,
    podReceived: "no",
    podSent: "no",
    invoiceSent: "no",
    supplierInvoiceReceived: "no",
    supplierDueDate: today,
    billable: "no",
    hayleighPo: "",
    collectionRef: "",
    customerInvoiceRef: "",
    customerPaymentDate: "",
    profit: 0,
    margin: 0,
    notes: "Showroom demo only — simulated vehicle on Live Tracking (no GPS, not saved to jobs list).",
    createdAt: new Date().toISOString(),
    status: "in-progress",
    vehicleType: "rigid",
    assignedDriverName: "Demo driver",
  };
}

function segmentLengthsM(points: [number, number][]): number[] {
  const out: number[] = [0];
  let acc = 0;
  for (let i = 1; i < points.length; i++) {
    acc += haversineKm(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]) * 1000;
    out.push(acc);
  }
  return out;
}

/** `frac` in [0, 1] along total path length (approximate, haversine per segment). */
export function pointAlongDemoRoute(points: [number, number][], frac: number): [number, number] {
  if (points.length === 0) return [POINT_A.lat, POINT_A.lng];
  if (points.length === 1) return points[0];
  const f = Math.max(0, Math.min(1, frac));
  const lens = segmentLengthsM(points);
  const total = lens[lens.length - 1] || 1;
  const targetM = f * total;
  let i = 1;
  while (i < lens.length && lens[i] < targetM) i++;
  const i0 = i - 1;
  const segLen = lens[i] - lens[i0];
  const segT = segLen > 1e-6 ? (targetM - lens[i0]) / segLen : 0;
  const lat = points[i0][0] + segT * (points[i][0] - points[i0][0]);
  const lng = points[i0][1] + segT * (points[i][1] - points[i0][1]);
  return [lat, lng];
}

/** Road geometry when OSRM is reachable; otherwise straight A→B. */
export async function fetchLiveTrackingDemoRoutePoints(): Promise<[number, number][]> {
  const leg = await fetchOsrmRoute(POINT_A, POINT_B);
  if (leg?.points && leg.points.length >= 2) return leg.points;
  return [
    [POINT_A.lat, POINT_A.lng],
    [POINT_B.lat, POINT_B.lng],
  ];
}

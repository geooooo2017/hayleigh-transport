import type { Job } from "../types";
import { demoPositionForJob } from "./demoMapPosition";

export type MapCoordSource = "geocoded" | "demo";

export function collectionMapPoint(job: Job): { lat: number; lng: number; source: MapCoordSource } {
  const glat = job.collectionLat;
  const glng = job.collectionLng;
  if (glat != null && glng != null && Number.isFinite(glat) && Number.isFinite(glng)) {
    return { lat: glat, lng: glng, source: "geocoded" };
  }
  const id = typeof job.id === "number" && Number.isFinite(job.id) ? job.id : 0;
  const p = demoPositionForJob(id);
  return { lat: p.lat, lng: p.lng, source: "demo" };
}

export function deliveryMapPoint(job: Job): { lat: number; lng: number; source: MapCoordSource } | null {
  const dlat = job.deliveryLat;
  const dlng = job.deliveryLng;
  if (dlat != null && dlng != null && Number.isFinite(dlat) && Number.isFinite(dlng)) {
    return { lat: dlat, lng: dlng, source: "geocoded" };
  }
  return null;
}

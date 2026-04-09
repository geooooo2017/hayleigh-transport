import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import type { Job } from "../types";
import { collectionMapPoint, deliveryMapPoint } from "../lib/jobMapPosition";
import { platformPath } from "../routes/paths";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function escapeHtml(s: string | undefined | null) {
  const t = String(s ?? "");
  return t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type FleetDriverPin = {
  driverName: string;
  vehicleRegistration: string;
  lat: number;
  lng: number;
  updatedAt: string;
};

type Props = {
  jobs: Job[];
  driverPins?: FleetDriverPin[];
};

const driverDotIcon = L.divIcon({
  className: "fleet-driver-pin",
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#059669;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.35)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const deliveryDotIcon = L.divIcon({
  className: "fleet-driver-pin",
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#ea580c;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.35)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function driverPinKey(d: FleetDriverPin): string {
  const name = (d.driverName ?? "").trim().toLowerCase();
  const reg = (d.vehicleRegistration ?? "").replace(/\s+/g, "").toLowerCase();
  return `${name}|${reg}`;
}

export function FleetMap({ jobs, driverPins = [] }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const jobsLayerRef = useRef<L.LayerGroup | null>(null);
  const driversLayerRef = useRef<L.LayerGroup | null>(null);
  const driverMarkersRef = useRef<Map<string, L.Marker>>(new Map());

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    let map: L.Map;
    try {
      map = L.map(el, { scrollWheelZoom: true }).setView([54.5, -3.5], 6);
    } catch (e) {
      console.error("[FleetMap] could not create map", e);
      return;
    }

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" rel="noreferrer">OpenStreetMap</a>',
    }).addTo(map);

    const jobsLayer = L.layerGroup().addTo(map);
    const driversLayer = L.layerGroup().addTo(map);
    mapRef.current = map;
    jobsLayerRef.current = jobsLayer;
    driversLayerRef.current = driversLayer;

    const fixSize = () => map.invalidateSize();
    window.addEventListener("resize", fixSize);
    requestAnimationFrame(fixSize);

    return () => {
      window.removeEventListener("resize", fixSize);
      driverMarkersRef.current.clear();
      map.remove();
      mapRef.current = null;
      jobsLayerRef.current = null;
      driversLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const jobsLayer = jobsLayerRef.current;
    const driversLayer = driversLayerRef.current;
    if (!map || !jobsLayer || !driversLayer) return;

    try {
    jobsLayer.clearLayers();
    const active = jobs.filter((j) => j && j.status !== "completed");

    for (const j of active) {
      const href = `${window.location.origin}${platformPath(`/jobs/${j.id}`)}`;
      const statusRaw = j.status;
      const statusLabel =
        typeof statusRaw === "string" ? statusRaw.replace(/-/g, " ") : "scheduled";
      const coll = collectionMapPoint(j);
      if (!Number.isFinite(coll.lat) || !Number.isFinite(coll.lng)) continue;
      const pcC = j.collectionPostcode ? ` · ${escapeHtml(j.collectionPostcode)}` : "";
      const srcC = coll.source === "geocoded" ? " (postcode/map)" : " (demo — add postcodes)";
      const popupC = `<div class="text-sm"><strong>${escapeHtml(j.jobNumber)}</strong> — Collection${pcC}${srcC}<br/><span class="capitalize">${escapeHtml(statusLabel)}</span> · ${escapeHtml(j.customerName)}<br/><a href="${href}" class="text-ht-slate underline">Job details</a></div>`;
      L.marker([coll.lat, coll.lng]).bindPopup(popupC).addTo(jobsLayer);

      const del = deliveryMapPoint(j);
      if (del) {
        const pcD = j.deliveryPostcode ? ` · ${escapeHtml(j.deliveryPostcode)}` : "";
        const popupD = `<div class="text-sm"><strong>${escapeHtml(j.jobNumber)}</strong> — Delivery${pcD}<br/>${escapeHtml(j.customerName)}<br/><a href="${href}" class="text-ht-slate underline">Job details</a></div>`;
        const dLat = Math.abs(del.lat - coll.lat);
        const dLng = Math.abs(del.lng - coll.lng);
        if (
          (dLat > 0.002 || dLng > 0.002) &&
          Number.isFinite(del.lat) &&
          Number.isFinite(del.lng)
        ) {
          L.marker([del.lat, del.lng], { icon: deliveryDotIcon }).bindPopup(popupD).addTo(jobsLayer);
          L.polyline(
            [
              [coll.lat, coll.lng],
              [del.lat, del.lng],
            ],
            {
              color: "#0d9488",
              weight: 4,
              opacity: 0.65,
              dashArray: "10 8",
            }
          ).bindPopup(`<div class="text-sm"><strong>${escapeHtml(j.jobNumber)}</strong> — planned leg (straight line)</div>`).addTo(jobsLayer);
        }
      }
    }

    const seenDriverKeys = new Set<string>();
    for (const d of driverPins) {
      if (!Number.isFinite(d.lat) || !Number.isFinite(d.lng)) continue;
      const key = driverPinKey(d);
      seenDriverKeys.add(key);
      const when = new Date(d.updatedAt).toLocaleString();
      const popup = `<div class="text-sm"><strong>${escapeHtml(d.driverName)}</strong> (driver)<br/>${escapeHtml(d.vehicleRegistration)}<br/><span class="text-gray-600">Updated ${escapeHtml(when)}</span></div>`;
      const latlng: L.LatLngTuple = [d.lat, d.lng];
      let marker = driverMarkersRef.current.get(key);
      if (marker) {
        marker.setLatLng(latlng);
        marker.setPopupContent(popup);
      } else {
        marker = L.marker(latlng, { icon: driverDotIcon }).bindPopup(popup).addTo(driversLayer);
        driverMarkersRef.current.set(key, marker);
      }
    }
    for (const [key, marker] of [...driverMarkersRef.current.entries()]) {
      if (!seenDriverKeys.has(key)) {
        driversLayer.removeLayer(marker);
        driverMarkersRef.current.delete(key);
      }
    }

    const jobPoints: L.LatLngTuple[] = [];
    for (const j of active) {
      const c = collectionMapPoint(j);
      if (Number.isFinite(c.lat) && Number.isFinite(c.lng)) jobPoints.push([c.lat, c.lng]);
      const d = deliveryMapPoint(j);
      if (d && Number.isFinite(d.lat) && Number.isFinite(d.lng)) jobPoints.push([d.lat, d.lng]);
    }
    const driverPoints = driverPins.map((d) => [d.lat, d.lng] as L.LatLngTuple);
    const allPoints = [...jobPoints, ...driverPoints];

    const finitePoints = allPoints.filter(
      (p) => p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1])
    );
    if (finitePoints.length > 0) {
      try {
        const bounds = L.latLngBounds(finitePoints);
        map.fitBounds(bounds, { padding: [48, 48], maxZoom: 11 });
      } catch {
        map.setView([54.5, -3.5], 6);
      }
    } else {
      map.setView([54.5, -3.5], 6);
    }
    } catch (e) {
      console.error("[FleetMap] update layers failed", e);
    }
  }, [jobs, driverPins]);

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-ht-border bg-slate-100">
      <div ref={containerRef} className="z-0 h-[min(420px,55vh)] w-full min-h-[280px]" />
      <p className="border-t border-ht-border bg-ht-canvas px-3 py-2 text-xs leading-snug text-slate-600">
        <span className="font-semibold text-ht-navy">Map:</span> OpenStreetMap.{" "}
        <span className="font-semibold text-ht-navy">Jobs:</span> blue = collection; orange = delivery; teal dashed = straight-line route between them.{" "}
        <span className="font-semibold text-ht-navy">Drivers:</span> green dots = live GPS from the driver app (last 45
        min). Requires Supabase and HTTPS on phones.
      </p>
    </div>
  );
}

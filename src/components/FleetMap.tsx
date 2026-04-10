import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import type { Job } from "../types";
import { jobBoardHasIssues, JOB_BOARD_MAP_COLORS } from "../lib/jobBoardVisual";
import { collectionMapPoint, deliveryMapPoint } from "../lib/jobMapPosition";
import { formatEtaSummary } from "../lib/drivingDirections";
import { buildDriverPositionKey, normalizeVehiclePlate, type FleetDriverPin } from "../lib/driverPositionsApi";
import type { FleetRoutesState } from "../hooks/useFleetDrivingRoutes";
import { platformPath } from "../routes/paths";

export type { FleetDriverPin };

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

type Props = {
  jobs: Job[];
  driverPins?: FleetDriverPin[];
  /** When set, draws road geometry and ETA popups (from `useFleetDrivingRoutes`). */
  fleetRoutes?: FleetRoutesState;
};

const driverDotIcon = L.divIcon({
  className: "fleet-driver-pin",
  html: `<div style="width:16px;height:16px;border-radius:50%;background:${JOB_BOARD_MAP_COLORS.driver};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.35)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function collectionJobIcon(hasIssue: boolean) {
  const ring = hasIssue ? `0 0 0 3px ${JOB_BOARD_MAP_COLORS.issue}, ` : "";
  return L.divIcon({
    className: "fleet-job-pin-collection",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${JOB_BOARD_MAP_COLORS.booked};border:2px solid #fff;box-shadow:${ring}0 1px 4px rgba(0,0,0,0.35)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function deliveryJobIcon(hasIssue: boolean) {
  const ring = hasIssue ? `0 0 0 3px ${JOB_BOARD_MAP_COLORS.issue}, ` : "";
  return L.divIcon({
    className: "fleet-job-pin-delivery",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${JOB_BOARD_MAP_COLORS.delivered};border:2px solid #fff;box-shadow:${ring}0 1px 4px rgba(0,0,0,0.35)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function driverPinKey(d: FleetDriverPin): string {
  if (d.jobIds.length > 0) return buildDriverPositionKey(d.vehicleRegistration, d.jobIds);
  const name = (d.driverName ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  return `${name}|${normalizeVehiclePlate(d.vehicleRegistration ?? "")}`;
}

export function FleetMap({ jobs, driverPins = [], fleetRoutes }: Props) {
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
      const hasIssue = jobBoardHasIssues(j);
      const coll = collectionMapPoint(j);
      if (!Number.isFinite(coll.lat) || !Number.isFinite(coll.lng)) continue;
      const pcC = j.collectionPostcode ? ` · ${escapeHtml(j.collectionPostcode)}` : "";
      const srcC = coll.source === "geocoded" ? " (postcode/map)" : " (demo — add postcodes)";
      const issueNote = hasIssue ? "<br/><span style='color:#b91c1c;font-weight:600'>Data incomplete — fix on job</span>" : "";
      const popupC = `<div class="text-sm"><strong>${escapeHtml(j.jobNumber)}</strong> — Collection${pcC}${srcC}<br/><span class="capitalize">${escapeHtml(statusLabel)}</span> · ${escapeHtml(j.customerName)}${issueNote}<br/><a href="${href}" class="text-ht-slate underline">Job details</a></div>`;
      L.marker([coll.lat, coll.lng], { icon: collectionJobIcon(hasIssue) }).bindPopup(popupC).addTo(jobsLayer);

      const del = deliveryMapPoint(j);
      const bundle = fleetRoutes?.byJobId[j.id];
      const planLeg = bundle?.planLeg;
      const driverLeg = bundle?.driverLeg;

      if (del) {
        const pcD = j.deliveryPostcode ? ` · ${escapeHtml(j.deliveryPostcode)}` : "";
        const popupD = `<div class="text-sm"><strong>${escapeHtml(j.jobNumber)}</strong> — Delivery${pcD}<br/>${escapeHtml(j.customerName)}${issueNote}<br/><a href="${href}" class="text-ht-slate underline">Job details</a></div>`;
        const dLat = Math.abs(del.lat - coll.lat);
        const dLng = Math.abs(del.lng - coll.lng);
        const showDeliveryAndLeg =
          (dLat > 0.002 || dLng > 0.002) && Number.isFinite(del.lat) && Number.isFinite(del.lng);

        if (showDeliveryAndLeg) {
          const legColor = hasIssue ? JOB_BOARD_MAP_COLORS.issue : JOB_BOARD_MAP_COLORS.inTransit;
          if (planLeg?.points && planLeg.points.length >= 2) {
            L.polyline(planLeg.points, {
              color: legColor,
              weight: 4,
              opacity: 0.82,
            })
              .bindPopup(
                `<div class="text-sm"><strong>${escapeHtml(j.jobNumber)}</strong> — planned road route (collection → delivery)<br/><span class="text-gray-700">${escapeHtml(formatEtaSummary(planLeg))}</span></div>`
              )
              .addTo(jobsLayer);
          } else {
            L.polyline(
              [
                [coll.lat, coll.lng],
                [del.lat, del.lng],
              ],
              {
                color: legColor,
                weight: 4,
                opacity: 0.7,
                dashArray: "10 8",
              }
            )
              .bindPopup(
                `<div class="text-sm"><strong>${escapeHtml(j.jobNumber)}</strong> — planned leg (straight line — road route loading or unavailable)</div>`
              )
              .addTo(jobsLayer);
          }

          if (driverLeg?.points && driverLeg.points.length >= 2) {
            L.polyline(driverLeg.points, {
              color: "#1d4ed8",
              weight: 5,
              opacity: 0.88,
            })
              .bindPopup(
                `<div class="text-sm"><strong>${escapeHtml(j.jobNumber)}</strong> — live route to delivery (matched driver)<br/><span class="text-gray-800">${escapeHtml(formatEtaSummary(driverLeg))}</span></div>`
              )
              .addTo(jobsLayer);
          }

          L.marker([del.lat, del.lng], { icon: deliveryJobIcon(hasIssue) }).bindPopup(popupD).addTo(jobsLayer);
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
  }, [jobs, driverPins, fleetRoutes]);

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-ht-border bg-slate-100">
      <div ref={containerRef} className="z-0 h-[min(420px,55vh)] w-full min-h-[280px]" />
      <p className="border-t border-ht-border bg-ht-canvas px-3 py-2 text-xs leading-snug text-slate-600">
        <span className="font-semibold text-ht-navy">Map:</span> OpenStreetMap.{" "}
        <span className="font-semibold text-ht-navy">Jobs:</span> yellow = collection; green = delivery; amber = planned
        collection→delivery on roads (OSRM typical speeds) or dashed straight line if routing is not ready; blue = matched
        driver→delivery (Google traffic when <code className="rounded bg-slate-200/80 px-0.5">VITE_GOOGLE_MAPS_API_KEY</code>{" "}
        is set, otherwise same road engine as amber). Red ring / red styling = data issues (job board rules).{" "}
        <span className="font-semibold text-ht-navy">Drivers:</span> green dots = live GPS (last 45 min). Tap lines for ETA.
        {fleetRoutes?.loading ? (
          <span className="ml-1 font-medium text-ht-slate"> — updating routes…</span>
        ) : null}
      </p>
    </div>
  );
}

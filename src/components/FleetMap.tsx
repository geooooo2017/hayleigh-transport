import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import type { Job, Vehicle } from "../types";
import {
  driverReportedIssueSig,
  formatDriverIssuePopupLine,
  jobHasDriverReportedIssue,
} from "../lib/driverIssueCommon";
import { jobBoardHasIssues, jobBoardOrMapNeedsIssueHighlight, JOB_BOARD_MAP_COLORS } from "../lib/jobBoardVisual";
import { collectionMapPoint, deliveryMapPoint } from "../lib/jobMapPosition";
import { formatEtaSummary } from "../lib/drivingDirections";
import { buildDriverPositionKey, normalizeVehiclePlate, type FleetDriverPin } from "../lib/driverPositionsApi";
import {
  fleetMapDriverPinsKey,
  fleetMapJobsGeometryKey,
  type FleetRoutesState,
} from "../hooks/useFleetDrivingRoutes";
import { platformPath } from "../routes/paths";
import { driverPinMatchesJob } from "../lib/customerNotifications";
import { FleetMapLegend } from "./FleetMapLegend";
import { fleetVehicleDivIcon, resolveFleetVehicleCategory } from "../lib/fleetVehicleMapIcon";

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
  /** Fleet list: registration match + non-Auto map icon overrides the job-based icon. */
  fleetVehicles?: Vehicle[];
};

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

/** When this string is unchanged, skip fitBounds so user zoom/pan survives polls and route geometry updates. */
function fleetMapAutoFitSignature(active: Job[], driverPins: FleetDriverPin[]): string {
  const jobParts = active
    .map((j) => {
      const c = collectionMapPoint(j);
      const d = deliveryMapPoint(j);
      const cOk = Number.isFinite(c.lat) && Number.isFinite(c.lng);
      const dPart =
        d && Number.isFinite(d.lat) && Number.isFinite(d.lng)
          ? `${d.lat.toFixed(4)},${d.lng.toFixed(4)}`
          : "x";
      return `${j.id}:${cOk ? `${c.lat.toFixed(4)},${c.lng.toFixed(4)}` : "x"}:${dPart}`;
    })
    .sort()
    .join("|");
  const driverParts = driverPins
    .filter((d) => Number.isFinite(d.lat) && Number.isFinite(d.lng))
    .map((d) => driverPinKey(d))
    .sort()
    .join(";");
  return `${jobParts}#${driverParts}`;
}

/** When unchanged, skip clearing/redrawing polylines (avoids churn from new `fleetRoutes` object identity). */
function fleetRoutesPolylineKey(fr: FleetRoutesState | undefined): string {
  if (!fr) return "";
  const ids = Object.keys(fr.byJobId)
    .map(Number)
    .sort((a, b) => a - b);
  return ids
    .map((id) => {
      const b = fr.byJobId[id];
      if (!b) return `${id}:x`;
      const pp = b.planLeg?.points;
      const dp = b.driverLeg?.points;
      const pLast = pp && pp.length >= 2 ? pp[pp.length - 1] : null;
      const dLast = dp && dp.length >= 2 ? dp[dp.length - 1] : null;
      const ph =
        pp && pp.length >= 2 && pp[0] && pLast
          ? `${pp.length}:${pp[0][0].toFixed(4)},${pp[0][1].toFixed(4)}-${pLast[0].toFixed(4)},${pLast[1].toFixed(4)}`
          : "0";
      const dh =
        dp && dp.length >= 2 && dp[0] && dLast
          ? `${dp.length}:${dp[0][0].toFixed(4)},${dp[0][1].toFixed(4)}-${dLast[0].toFixed(4)},${dLast[1].toFixed(4)}`
          : "0";
      return `${id}:p${ph}:d${dh}`;
    })
    .join("|");
}

function fleetVehiclesMapIconKey(vehicles: Vehicle[]): string {
  return [...vehicles]
    .sort((a, b) => a.id - b.id)
    .map((v) => `${v.id}:${(v.registration ?? "").replace(/\s+/g, "").toLowerCase()}:${v.liveMapVehicleIcon ?? ""}`)
    .join("|");
}

function boundsFromRoutePoints(points: [number, number][]): L.LatLngBounds | null {
  if (points.length < 2) return null;
  try {
    const b = L.latLngBounds(points as L.LatLngTuple[]);
    return b.isValid() ? b : null;
  } catch {
    return null;
  }
}

/** Prefer live driver→delivery geometry; else planned collection→delivery. */
function matchedRouteBoundsForPin(
  pin: FleetDriverPin,
  fleetRoutes: FleetRoutesState | undefined,
  activeJobs: Job[]
): L.LatLngBounds | null {
  if (!fleetRoutes) return null;
  const tryJobId = (jobId: number) => {
    const bundle = fleetRoutes.byJobId[jobId];
    if (!bundle) return null;
    const d = bundle.driverLeg?.points;
    if (d && d.length >= 2) return boundsFromRoutePoints(d);
    const p = bundle.planLeg?.points;
    if (p && p.length >= 2) return boundsFromRoutePoints(p);
    return null;
  };
  for (const jid of pin.jobIds) {
    const b = tryJobId(jid);
    if (b) return b;
  }
  for (const j of activeJobs) {
    if (!driverPinMatchesJob(j, pin)) continue;
    const b = tryJobId(j.id);
    if (b) return b;
  }
  return null;
}

export function FleetMap({ jobs, driverPins = [], fleetRoutes, fleetVehicles = [] }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const jobsLayerRef = useRef<L.LayerGroup | null>(null);
  const driversLayerRef = useRef<L.LayerGroup | null>(null);
  const driverMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const lastAutoFitSignatureRef = useRef<string | null>(null);
  const [followingDriverKey, setFollowingDriverKey] = useState<string | null>(null);
  const followDriverKeyRef = useRef<string | null>(null);
  followDriverKeyRef.current = followingDriverKey;

  const jobsMapKey = useMemo(() => fleetMapJobsGeometryKey(jobs), [jobs]);
  const driverPinsMapKey = useMemo(() => fleetMapDriverPinsKey(driverPins), [driverPins]);
  const fleetRoutesMapKey = useMemo(() => fleetRoutesPolylineKey(fleetRoutes), [fleetRoutes]);
  const fleetVehiclesMapKey = useMemo(() => fleetVehiclesMapIconKey(fleetVehicles), [fleetVehicles]);
  const jobsDriverIssueMapKey = useMemo(
    () =>
      jobs
        .filter((j) => j && j.status !== "completed")
        .map((j) => `${j.id}:${driverReportedIssueSig(j)}`)
        .sort()
        .join(";"),
    [jobs]
  );

  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;
  const driverPinsRef = useRef(driverPins);
  driverPinsRef.current = driverPins;
  const fleetRoutesRef = useRef(fleetRoutes);
  fleetRoutesRef.current = fleetRoutes;
  const fleetVehiclesRef = useRef(fleetVehicles);
  fleetVehiclesRef.current = fleetVehicles;

  const driverMarkerClickRef = useRef<(key: string, marker: L.Marker) => void>(() => {});
  driverMarkerClickRef.current = (key, marker) => {
    setFollowingDriverKey(key);
    const map = mapRef.current;
    const pin = driverPinsRef.current.find((p) => driverPinKey(p) === key);
    if (!map || !pin) return;
    const active = jobsRef.current.filter((j) => j && j.status !== "completed");
    const routeBounds = matchedRouteBoundsForPin(pin, fleetRoutesRef.current, active);
    const pos = marker.getLatLng();
    if (routeBounds) {
      try {
        map.fitBounds(routeBounds, { padding: [56, 56], maxZoom: 15, animate: true });
        return;
      } catch {
        /* fall through */
      }
    }
    map.setView(pos, Math.max(map.getZoom(), 13), { animate: true });
  };

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

    const fixSize = () => {
      map.invalidateSize({ animate: false });
    };
    map.whenReady(fixSize);
    window.addEventListener("resize", fixSize);
    requestAnimationFrame(fixSize);

    let roFrame = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(roFrame);
      roFrame = requestAnimationFrame(fixSize);
    });
    ro.observe(el);

    map.on("click", () => {
      setFollowingDriverKey(null);
    });

    return () => {
      window.removeEventListener("resize", fixSize);
      ro.disconnect();
      cancelAnimationFrame(roFrame);
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
    const jobs = jobsRef.current;
    const driverPins = driverPinsRef.current;
    const fleetRoutes = fleetRoutesRef.current;
    const fleetVehicles = fleetVehiclesRef.current;

    jobsLayer.clearLayers();
    const active = jobs.filter((j) => j && j.status !== "completed");

    for (const j of active) {
      const href = `${window.location.origin}${platformPath(`/jobs/${j.id}`)}`;
      const statusRaw = j.status;
      const statusLabel =
        typeof statusRaw === "string" ? statusRaw.replace(/-/g, " ") : "scheduled";
      const dataIssue = jobBoardHasIssues(j);
      const driverIssue = jobHasDriverReportedIssue(j);
      const hasIssue = jobBoardOrMapNeedsIssueHighlight(j);
      const coll = collectionMapPoint(j);
      if (!Number.isFinite(coll.lat) || !Number.isFinite(coll.lng)) continue;
      const pcC = j.collectionPostcode ? ` · ${escapeHtml(j.collectionPostcode)}` : "";
      const srcC = coll.source === "geocoded" ? " (postcode/map)" : " (demo — add postcodes)";
      let issueNote = "";
      if (dataIssue) {
        issueNote += "<br/><span style='color:#b91c1c;font-weight:600'>Data incomplete — fix on job</span>";
      }
      if (driverIssue && j.driverReportedIssue) {
        issueNote += `<br/><span style='color:#b91c1c;font-weight:600'>Driver: ${escapeHtml(formatDriverIssuePopupLine(j.driverReportedIssue))}</span>`;
      }
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
      const vCat = resolveFleetVehicleCategory(active, d, fleetVehicles);
      const popup = `<div class="text-sm"><strong>${escapeHtml(d.driverName)}</strong> (live)<br/>${escapeHtml(d.vehicleRegistration)}<br/><span class="text-gray-600">Updated ${escapeHtml(when)}</span><br/><span class="text-gray-500 text-xs">Click the vehicle to follow position &amp; route (tap map to stop)</span></div>`;
      const latlng: L.LatLngTuple = [d.lat, d.lng];
      const following = followingDriverKey === key;
      const icon = fleetVehicleDivIcon(vCat, following);
      let marker = driverMarkersRef.current.get(key);
      if (marker) {
        marker.setLatLng(latlng);
        marker.setIcon(icon);
        marker.setPopupContent(popup);
        marker.off("click");
        marker.on("click", () => driverMarkerClickRef.current(key, marker!));
      } else {
        marker = L.marker(latlng, { icon, bubblingMouseEvents: false }).bindPopup(popup).addTo(driversLayer);
        marker.on("click", () => driverMarkerClickRef.current(key, marker!));
        driverMarkersRef.current.set(key, marker);
      }
      if (followDriverKeyRef.current === key) {
        map.panTo(latlng, { animate: true, duration: 0.35 });
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
    const autoFitSig = fleetMapAutoFitSignature(active, driverPins);
    if (finitePoints.length > 0) {
      if (autoFitSig !== lastAutoFitSignatureRef.current) {
        lastAutoFitSignatureRef.current = autoFitSig;
        try {
          const bounds = L.latLngBounds(finitePoints);
          map.fitBounds(bounds, { padding: [48, 48], maxZoom: 11 });
        } catch {
          map.setView([54.5, -3.5], 6);
        }
      }
    } else {
      lastAutoFitSignatureRef.current = null;
      map.setView([54.5, -3.5], 6);
    }
    } catch (e) {
      console.error("[FleetMap] update layers failed", e);
    }
  }, [
    jobsMapKey,
    driverPinsMapKey,
    fleetRoutesMapKey,
    fleetVehiclesMapKey,
    jobsDriverIssueMapKey,
    followingDriverKey,
  ]);

  const followingLabel = followingDriverKey
    ? (() => {
        const pin = driverPins.find((p) => driverPinKey(p) === followingDriverKey);
        return pin ? pin.driverName.trim() || pin.vehicleRegistration : "vehicle";
      })()
    : null;

  return (
    <div className="w-full space-y-3">
      <FleetMapLegend />

      <div className="fleet-map-shell relative flex flex-col overflow-hidden rounded-xl border border-ht-border bg-slate-100">
        {followingLabel ? (
          <div className="pointer-events-none absolute left-2 right-2 top-2 z-[500] rounded-lg border border-amber-200 bg-amber-50/95 px-3 py-2 text-center text-xs font-medium text-amber-950 shadow-sm backdrop-blur-sm sm:text-left">
            Following {followingLabel} — tap empty map to stop
          </div>
        ) : null}
        <div
          ref={containerRef}
          className="fleet-map-pane-host z-0 h-[min(580px,72vh)] w-full min-h-[360px]"
        />
        <p className="shrink-0 border-t border-ht-border bg-ht-canvas px-3 py-2 text-xs leading-snug text-slate-600">
          <span className="font-semibold text-ht-navy">Basemap:</span> OpenStreetMap.{" "}
          <span className="font-semibold text-ht-navy">Routing:</span> road geometry from OSRM; traffic-adjusted times when{" "}
          <code className="rounded bg-slate-200/80 px-0.5">VITE_GOOGLE_MAPS_API_KEY</code> is set. Dashed lines = straight
          fallback. <span className="font-semibold text-ht-navy">Interaction:</span> click a live vehicle to follow; tap the map
          to stop; click route lines for ETA.
          {fleetRoutes?.loading ? (
            <span className="ml-1 font-medium text-ht-slate">— updating routes…</span>
          ) : null}
        </p>
      </div>
    </div>
  );
}

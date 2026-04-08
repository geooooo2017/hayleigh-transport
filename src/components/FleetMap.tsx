import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import type { Job } from "../types";
import { demoPositionForJob } from "../lib/demoMapPosition";
import { platformPath } from "../routes/paths";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type Props = {
  jobs: Job[];
};

export function FleetMap({ jobs }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el, { scrollWheelZoom: true }).setView([54.5, -3.5], 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" rel="noreferrer">OpenStreetMap</a>',
    }).addTo(map);

    const layer = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerRef.current = layer;

    const fixSize = () => map.invalidateSize();
    window.addEventListener("resize", fixSize);
    requestAnimationFrame(fixSize);

    return () => {
      window.removeEventListener("resize", fixSize);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    const active = jobs.filter((j) => j.status !== "completed");

    for (const j of active) {
      const { lat, lng } = demoPositionForJob(j.id);
      const href = `${window.location.origin}${platformPath(`/jobs/${j.id}`)}`;
      const statusLabel = j.status.replace("-", " ");
      const popup = `<div class="text-sm"><strong>${escapeHtml(j.jobNumber)}</strong><br/><span class="capitalize">${escapeHtml(statusLabel)}</span> · ${escapeHtml(j.customerName)}<br/><a href="${href}" class="text-ht-slate underline">Job details</a></div>`;
      L.marker([lat, lng]).bindPopup(popup).addTo(layer);
    }

    if (active.length > 0) {
      const bounds = L.latLngBounds(
        active.map((j) => {
          const p = demoPositionForJob(j.id);
          return [p.lat, p.lng] as L.LatLngTuple;
        })
      );
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 10 });
    } else {
      map.setView([54.5, -3.5], 6);
    }
  }, [jobs]);

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-ht-border bg-slate-100">
      <div ref={containerRef} className="z-0 h-[min(420px,55vh)] w-full min-h-[280px]" />
      <p className="border-t border-ht-border bg-ht-canvas px-3 py-2 text-xs leading-snug text-slate-600">
        <span className="font-semibold text-ht-navy">Map:</span> OpenStreetMap.{" "}
        <span className="font-semibold text-ht-navy">Positions:</span> demo placement from job IDs — swap in telematics
        (lat/lng per vehicle) when your provider is connected.
      </p>
    </div>
  );
}

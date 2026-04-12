import L from "leaflet";
import type { Job, LiveMapVehicleIconPreference, Vehicle } from "../types";
import { normalizeVehiclePlate, type FleetDriverPin } from "./driverPositionsApi";
import { driverPinMatchesJob } from "./customerNotifications";

export type FleetVehicleCategory = "van" | "rigid" | "artic" | "unknown";

export const LIVE_MAP_VEHICLE_ICON_OPTIONS: { value: LiveMapVehicleIconPreference; label: string }[] = [
  { value: "auto", label: "Auto — from job (vehicle type) or generic truck" },
  { value: "van", label: "Van" },
  { value: "rigid", label: "Rigid truck" },
  { value: "artic", label: "Articulated lorry" },
];

/** Hayleigh-style fleet: white cab, navy/slate body, realistic trim (no shared gradients — safe for many markers). */
const CAB = "#f4f4f5";
const CAB_SHADE = "#d4d4d8";
const CAB_STROKE = "#a1a1aa";
const BODY = "#1e3a5f";
const BODY_DARK = "#152a45";
const BODY_HI = "#2d4a6f";
const GLASS = "#93c5fd";
const GLASS_DEEP = "#3b82f6";
const CHROME = "#cbd5e1";
const GRILLE = "#0f172a";
const TYRE = "#171717";
const TYRE_WALL = "#fafafa";
const HUB = "#e5e5e5";
const HUB_CTR = "#a3a3a3";
const AMBER_LAMP = "#fbbf24";
const RED_TAIL = "#ef4444";
const STRIPE_LIVE = "#059669";
const FOLLOW_RING = "#d97706";

export const FLEET_VEHICLE_LEGEND_ITEMS: {
  category: FleetVehicleCategory;
  title: string;
  subtitle: string;
}[] = [
  { category: "van", title: "Van", subtitle: "Smaller delivery vehicle" },
  { category: "rigid", title: "Rigid truck", subtitle: "One unit — box or curtainsider" },
  {
    category: "artic",
    title: "Articulated lorry",
    subtitle: "Cab + separate trailer (road haulage)",
  },
  { category: "unknown", title: "Large truck", subtitle: "When vehicle class isn’t set on the job" },
];

type Vb = { w: number; h: number };

const VB: Record<FleetVehicleCategory, Vb> = {
  van: { w: 96, h: 44 },
  rigid: { w: 118, h: 46 },
  artic: { w: 148, h: 48 },
  unknown: { w: 96, h: 44 },
};

function groundShadow(cx: number, w: number, h: number): string {
  return `<ellipse cx="${cx}" cy="${h - 3}" rx="${w * 0.42}" ry="3.2" fill="#0f172a" opacity="0.14"/>`;
}

function wheel(cx: number, cy: number): string {
  return `<circle cx="${cx}" cy="${cy}" r="5.6" fill="${TYRE}" stroke="#0a0a0a" stroke-width="0.45"/>
    <circle cx="${cx}" cy="${cy}" r="4.1" fill="${TYRE}" stroke="${TYRE_WALL}" stroke-width="0.85"/>
    <circle cx="${cx}" cy="${cy}" r="2.5" fill="${HUB}" stroke="${CAB_STROKE}" stroke-width="0.35"/>
    <circle cx="${cx}" cy="${cy}" r="0.95" fill="${HUB_CTR}"/>`;
}

/** Full <svg>…</svg> markup (map markers + legend). */
export function fleetVehicleSvgMarkup(category: FleetVehicleCategory): string {
  const { w, h } = VB[category];
  const sw = 1.05;
  const S = "rgba(255,255,255,0.92)";

  let body = "";
  switch (category) {
    case "van": {
      const cx = w / 2;
      body = `
        ${groundShadow(cx, w, h)}
        <!-- cargo box -->
        <rect x="10" y="16" width="48" height="16" rx="2.2" fill="${BODY}" stroke="${S}" stroke-width="${sw}"/>
        <rect x="10" y="28" width="48" height="4" rx="0" fill="${BODY_DARK}" opacity="0.85"/>
        <rect x="12" y="18" width="44" height="2.2" rx="1" fill="${STRIPE_LIVE}" opacity="0.9"/>
        <line x1="22" y1="20" x2="22" y2="30" stroke="${BODY_HI}" stroke-width="0.55" opacity="0.7"/>
        <line x1="34" y1="20" x2="34" y2="30" stroke="${BODY_HI}" stroke-width="0.55" opacity="0.7"/>
        <!-- cab -->
        <path d="M58 16h24c2.2 0 4 1.4 4.6 3.4l2.4 8.2V32H58V16z" fill="${CAB}" stroke="${S}" stroke-width="${sw}" stroke-linejoin="round"/>
        <path d="M60 17.5h18l2.8 1.2 2 7.3H60v-8.5z" fill="${GLASS}" stroke="${GLASS_DEEP}" stroke-width="0.4" opacity="0.95"/>
        <path d="M61 18.5 L76 17.5 L78 24 L61 23 Z" fill="white" opacity="0.22"/>
        <rect x="78" y="19" width="6" height="9" rx="0.8" fill="${CAB_SHADE}" stroke="${CAB_STROKE}" stroke-width="0.5"/>
        <rect x="80" y="20.5" width="2.8" height="2.8" rx="0.3" fill="${GRILLE}" opacity="0.35"/>
        <circle cx="84.5" cy="28" r="1.4" fill="${AMBER_LAMP}"/>
        <path d="M58 30h28v3H58z" fill="${CHROME}" stroke="${CAB_STROKE}" stroke-width="0.4"/>
        <circle cx="12" cy="30" r="1.2" fill="${RED_TAIL}"/>
        ${wheel(26, 36.5)}
        ${wheel(44, 36.5)}
        ${wheel(72, 36.5)}
      `;
      break;
    }
    case "rigid": {
      const cx = w / 2;
      body = `
        ${groundShadow(cx, w, h)}
        <!-- curtainsider body -->
        <rect x="8" y="15" width="72" height="17" rx="2" fill="${BODY}" stroke="${S}" stroke-width="${sw}"/>
        <rect x="8" y="28" width="72" height="4" fill="${BODY_DARK}" opacity="0.9"/>
        <rect x="10" y="17" width="68" height="2" rx="1" fill="${STRIPE_LIVE}" opacity="0.85"/>
        <!-- curtain folds -->
        <path d="M14 19v12M22 18.5v12.5M30 18v13M38 18.5v12.5M46 18v13M54 18.5v12.5M62 18v13M70 18.5v12.5" stroke="${BODY_HI}" stroke-width="0.65" stroke-linecap="round" opacity="0.55"/>
        <path d="M16 19 Q20 22 16 25 T16 31" fill="none" stroke="white" stroke-width="0.35" opacity="0.12"/>
        <path d="M32 19 Q36 22 32 25 T32 31" fill="none" stroke="white" stroke-width="0.35" opacity="0.12"/>
        <path d="M48 19 Q52 22 48 25 T48 31" fill="none" stroke="white" stroke-width="0.35" opacity="0.12"/>
        <!-- cab -->
        <path d="M82 15h28l3.5 2.2 2.5 9.8V32H82V15z" fill="${CAB}" stroke="${S}" stroke-width="${sw}" stroke-linejoin="round"/>
        <path d="M84 16.5h20l3 1.5 2 8H84v-9.5z" fill="${GLASS}" stroke="${GLASS_DEEP}" stroke-width="0.4"/>
        <path d="M85 17.5 L100 16.5 L102 23 L85 22 Z" fill="white" opacity="0.2"/>
        <rect x="104" y="18" width="7" height="10" rx="0.9" fill="${CAB_SHADE}" stroke="${CAB_STROKE}" stroke-width="0.45"/>
        <rect x="106" y="20" width="3" height="3" rx="0.35" fill="${GRILLE}" opacity="0.4"/>
        <circle cx="110" cy="29" r="1.5" fill="${AMBER_LAMP}"/>
        <path d="M82 30h30v3H82z" fill="${CHROME}" stroke="${CAB_STROKE}" stroke-width="0.4"/>
        <circle cx="10" cy="29" r="1.2" fill="${RED_TAIL}"/>
        ${wheel(22, 37)}
        ${wheel(40, 37)}
        ${wheel(58, 37)}
        ${wheel(94, 37)}
      `;
      break;
    }
    case "artic": {
      const cx = w / 2;
      body = `
        ${groundShadow(cx, w, h)}
        <!-- tractor unit -->
        <path d="M10 20h22l4 2 2 10H10V20z" fill="${CAB}" stroke="${S}" stroke-width="${sw}" stroke-linejoin="round"/>
        <path d="M12 21h16l3.5 1.5 1.5 8.5H12V21z" fill="${GLASS}" stroke="${GLASS_DEEP}" stroke-width="0.4"/>
        <path d="M13 22 L26 21 L27.5 26 L13 25.5 Z" fill="white" opacity="0.22"/>
        <rect x="28" y="22" width="8" height="8" rx="0.9" fill="${CAB_SHADE}" stroke="${CAB_STROKE}" stroke-width="0.45"/>
        <line x1="30" y1="24" x2="34" y2="24" stroke="${GRILLE}" stroke-width="0.9" opacity="0.5"/>
        <line x1="30" y1="26" x2="34" y2="26" stroke="${GRILLE}" stroke-width="0.9" opacity="0.5"/>
        <circle cx="34" cy="29.5" r="1.4" fill="${AMBER_LAMP}"/>
        <rect x="10" y="30" width="26" height="3.5" fill="${CHROME}" stroke="${CAB_STROKE}" stroke-width="0.35"/>
        <!-- chassis & fifth wheel -->
        <rect x="32" y="24" width="14" height="5" rx="0.6" fill="${BODY_DARK}" stroke="${S}" stroke-width="0.5"/>
        <ellipse cx="39" cy="26.5" rx="4.2" ry="2.2" fill="${GRILLE}" stroke="${CHROME}" stroke-width="0.5" opacity="0.92"/>
        <rect x="44" y="26" width="4" height="6" rx="0.5" fill="${BODY}" stroke="${S}" stroke-width="0.4"/>
        <!-- trailer -->
        <rect x="50" y="14" width="86" height="18" rx="2.2" fill="${BODY}" stroke="${S}" stroke-width="${sw}"/>
        <path d="M50 14h86v5H50z" fill="${BODY_DARK}" opacity="0.35"/>
        <rect x="52" y="16" width="82" height="2" rx="1" fill="${STRIPE_LIVE}" opacity="0.8"/>
        <path d="M56 19v11M64 18.5v11.5M72 18v12M80 18.5v11.5M88 18v12M96 18.5v11.5M104 18v12M112 18.5v11.5M120 18v12M128 18.5v11.5" stroke="${BODY_HI}" stroke-width="0.6" stroke-linecap="round" opacity="0.5"/>
        <path d="M58 19 Q62 23 58 27 T58 32" fill="none" stroke="white" stroke-width="0.3" opacity="0.1"/>
        <path d="M90 19 Q94 23 90 27 T90 32" fill="none" stroke="white" stroke-width="0.3" opacity="0.1"/>
        <path d="M122 19 Q126 23 122 27 T122 32" fill="none" stroke="white" stroke-width="0.3" opacity="0.1"/>
        <circle cx="50" cy="28" r="1.2" fill="${RED_TAIL}"/>
        ${wheel(18, 38)}
        ${wheel(28, 38)}
        ${wheel(72, 38)}
        ${wheel(98, 38)}
        ${wheel(124, 38)}
      `;
      break;
    }
    default: {
      const cx = w / 2;
      body = `
        ${groundShadow(cx, w, h)}
        <rect x="10" y="16" width="46" height="16" rx="2" fill="${BODY}" stroke="${S}" stroke-width="${sw}"/>
        <rect x="10" y="28" width="46" height="4" fill="${BODY_DARK}" opacity="0.88"/>
        <rect x="12" y="18" width="42" height="2" rx="1" fill="${STRIPE_LIVE}" opacity="0.85"/>
        <line x1="24" y1="20" x2="24" y2="30" stroke="${BODY_HI}" stroke-width="0.5" opacity="0.6"/>
        <line x1="38" y1="20" x2="38" y2="30" stroke="${BODY_HI}" stroke-width="0.5" opacity="0.6"/>
        <path d="M56 16h22l3 1.8 2.2 9.2V32H56V16z" fill="${CAB}" stroke="${S}" stroke-width="${sw}" stroke-linejoin="round"/>
        <path d="M58 17.5h16l2.8 1.2 1.8 7.8H58v-9z" fill="${GLASS}" stroke="${GLASS_DEEP}" stroke-width="0.4"/>
        <rect x="74" y="19" width="6" height="9" rx="0.75" fill="${CAB_SHADE}" stroke="${CAB_STROKE}" stroke-width="0.45"/>
        <circle cx="77.5" cy="28" r="1.35" fill="${AMBER_LAMP}"/>
        <path d="M56 30h26v3H56z" fill="${CHROME}" stroke="${CAB_STROKE}" stroke-width="0.35"/>
        <circle cx="12" cy="30" r="1.1" fill="${RED_TAIL}"/>
        ${wheel(26, 36.5)}
        ${wheel(44, 36.5)}
        ${wheel(68, 36.5)}
      `;
      break;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;display:block" aria-hidden="true">${body}</svg>`;
}

export function classifyFleetVehicleType(raw: string | undefined | null): FleetVehicleCategory {
  const t = (raw ?? "").trim().toLowerCase();
  if (!t) return "unknown";
  if (t === "artic" || t.includes("artic")) return "artic";
  if (t === "rigid" || t.includes("rigid")) return "rigid";
  if (t === "van" || t.includes("van")) return "van";
  return "unknown";
}

/**
 * Map icon: fleet vehicle registration (if set and not Auto) → job `liveMapVehicleIcon` → `vehicleType` text.
 */
export function resolveFleetVehicleCategory(
  activeJobs: Job[],
  pin: FleetDriverPin,
  fleetVehicles: Vehicle[] = []
): FleetVehicleCategory {
  const vp = normalizeVehiclePlate(pin.vehicleRegistration ?? "");
  if (vp) {
    const v = fleetVehicles.find((x) => normalizeVehiclePlate(x.registration) === vp);
    const pref = v?.liveMapVehicleIcon;
    if (pref && pref !== "auto") return pref;
  }
  for (const j of activeJobs) {
    if (!j || j.status === "completed") continue;
    if (!driverPinMatchesJob(j, pin)) continue;
    const jobPref = j.liveMapVehicleIcon;
    if (jobPref && jobPref !== "auto") return jobPref;
    const c = classifyFleetVehicleType(j.vehicleType);
    if (c !== "unknown") return c;
  }
  return "unknown";
}

export function fleetVehicleDivIcon(category: FleetVehicleCategory, following: boolean): L.DivIcon {
  const { w, h } = VB[category];
  const iw = Math.round(w * 0.56);
  const ih = Math.round(h * 0.56);
  const ring = following ? `0 0 0 3px ${FOLLOW_RING}, ` : "";
  const html = `<div class="fleet-vehicle-marker-inner" style="width:${iw}px;height:${ih}px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(${ring}0 4px 10px rgba(15,23,42,0.4))">${fleetVehicleSvgMarkup(category)}</div>`;
  return L.divIcon({
    className: "fleet-vehicle-marker",
    html,
    iconSize: [iw, ih],
    iconAnchor: [iw / 2, ih / 2],
    popupAnchor: [0, -ih / 2],
  });
}

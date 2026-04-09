import type { Job } from "../types";
import { normalizeVehiclePlate } from "./driverPositionsApi";

/** Distinct customer / delivery contact emails for mailto (deduped). */
export function customerNotificationEmails(job: Job): string[] {
  const set = new Set<string>();
  const add = (s?: string) => {
    const t = (s ?? "").trim();
    if (t) set.add(t);
  };
  add(job.customerEmail);
  add(job.deliveryContactEmail);
  return [...set];
}

export function build24hBeforeMailto(job: Job): string | null {
  const targets = customerNotificationEmails(job);
  if (targets.length === 0) return null;
  const subject = `Delivery reminder — ${job.jobNumber}`;
  const when = job.deliveryDate
    ? new Date(job.deliveryDate).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "the planned delivery date";
  const body = `Dear ${job.customerName},

This is a reminder that your goods for job ${job.jobNumber} are scheduled to arrive within approximately 24 hours (around ${when}).

Please ensure someone will be on site to receive the delivery and that appropriate equipment is available to unload the vehicle safely.

Thank you.`;
  return `mailto:${targets.join(",")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function build1hAwayMailto(job: Job): string | null {
  const targets = customerNotificationEmails(job);
  if (targets.length === 0) return null;
  const subject = `Delivery in about one hour — ${job.jobNumber}`;
  const body = `Dear ${job.customerName},

Our driver is approximately one hour away from your delivery address for job ${job.jobNumber}.

Please make sure you have someone on site to take delivery of the goods and appropriate equipment to unload the vehicle.

Thank you.`;
  return `mailto:${targets.join(",")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function buildDriverUpdateSmsUrl(phone: string, jobNumber: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const body = `Hayleigh: Job ${jobNumber} was updated in the office system. Open the driver app and pull to refresh your jobs — check collection & delivery details.`;
  return `sms:${digits}?body=${encodeURIComponent(body)}`;
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Rough road ETA (hours) from straight-line distance — tuned for mixed truck driving. */
export const ETA_ASSUMED_SPEED_KMH = 48;

export function estimatedDriveHoursStraightLineKm(distanceKm: number): number {
  return distanceKm / ETA_ASSUMED_SPEED_KMH;
}

export function driverPinMatchesJob(
  job: Job,
  pin: { driverName: string; vehicleRegistration: string }
): boolean {
  const assigned = (job.assignedDriverName ?? "").trim().toLowerCase();
  const pinName = pin.driverName.trim().toLowerCase();
  if (!assigned || assigned !== pinName) return false;
  const jp = normalizeVehiclePlate(job.truckPlates ?? "");
  const vp = normalizeVehiclePlate(pin.vehicleRegistration);
  if (!jp || jp !== vp) return false;
  return true;
}

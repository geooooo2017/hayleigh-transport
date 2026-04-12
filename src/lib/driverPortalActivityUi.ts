import type { DriverPortalActivityEntry, DriverPortalActivityKind } from "../types";

const LABELS: Record<DriverPortalActivityKind, string> = {
  signed_in: "Signed in to driver portal",
  signed_out: "Signed out of driver portal",
  location_share_started: "Tapped “Share my location”",
  location_share_stopped: "Stopped sharing location",
  location_first_gps_sent: "First GPS position sent to live map",
  location_share_error: "Location sharing error",
  location_share_blocked_no_cloud: "Share location blocked (cloud sync off)",
  location_share_blocked_not_https: "Share location blocked (not HTTPS)",
  refresh_jobs_manual: "Tapped Refresh (jobs)",
  delivery_eta_set: "Saved delivery ETA",
  delivery_eta_cleared: "Cleared delivery ETA",
  issue_reported: "Submitted issue report",
  issue_withdrawn: "Withdrew issue report",
  office_update_notice_shown: "Office update alert shown (job data changed)",
};

export function driverPortalActivityKindLabel(kind: DriverPortalActivityKind): string {
  return LABELS[kind] ?? kind;
}

export function formatDriverPortalActivityWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function sortDriverPortalActivityNewestFirst(entries: DriverPortalActivityEntry[]): DriverPortalActivityEntry[] {
  return [...entries].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

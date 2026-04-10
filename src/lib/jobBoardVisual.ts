import type { Job } from "../types";
import { isJobAddressComplete } from "./jobAddressValidation";

/** Incomplete address, core job fields, or sell price — same rule as the job board red cards. */
export function jobBoardHasIssues(job: Job): boolean {
  if (!isJobAddressComplete(job)) return true;
  if (
    !job.customerName?.trim() ||
    !job.collectionDate?.trim() ||
    !job.deliveryDate?.trim() ||
    !job.carrier?.trim() ||
    !job.truckPlates?.trim()
  ) {
    return true;
  }
  if (!(Number(job.sellPrice) > 0)) return true;
  return false;
}

/** Hex colours aligned with job board cards (FleetMap, exports, etc.). */
export const JOB_BOARD_MAP_COLORS = {
  /** Booked / scheduled — collection pin */
  booked: "#eab308",
  /** Collected / in progress — leg line */
  inTransit: "#f59e0b",
  /** Delivered — delivery pin */
  delivered: "#22c55e",
  /** Data issues — emphasis ring / stressed leg */
  issue: "#ef4444",
  /** Live driver GPS (unchanged) */
  driver: "#059669",
} as const;

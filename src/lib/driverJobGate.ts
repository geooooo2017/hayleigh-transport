import type { Job } from "../types";
import { formatVehicleRegistrationDisplay, normalizeVehiclePlate } from "./driverPositionsApi";

export function parseJobNumberTokens(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export type DriverLoginEval =
  | { kind: "ok"; jobs: Job[] }
  | {
      kind: "needs_office";
      matchedJobs: Job[];
      pendingTargets: Job[];
      vehicleRegDisplay: string;
      driverName?: string;
    }
  | { kind: "error"; message: string };

/**
 * Driver sign-in rules:
 * - Job number must exist.
 * - If the job has truck plates set, they must match the driver’s registration.
 * - If the job has no truck plates yet, the office must confirm (pending allocation) before full access;
 *   jobs that already match can still sign in (partial session).
 */
export function evaluateDriverLogin(
  jobs: Job[],
  vehicleRegRaw: string,
  jobNumbersRaw: string,
  driverNameRaw: string
): DriverLoginEval {
  const vehicleRegDisplay = formatVehicleRegistrationDisplay(vehicleRegRaw);
  const plateNorm = normalizeVehiclePlate(vehicleRegDisplay);
  if (!plateNorm) {
    return { kind: "error", message: "Enter your vehicle registration." };
  }

  const tokens = parseJobNumberTokens(jobNumbersRaw);
  if (tokens.length === 0) {
    return { kind: "error", message: "Enter at least one job number." };
  }

  const matched: Job[] = [];
  const pendingTargets: Job[] = [];

  for (const token of tokens) {
    const t = token.toLowerCase();
    const job = jobs.find((j) => j.jobNumber.trim().toLowerCase() === t);
    if (!job) {
      return { kind: "error", message: `No job found with number “${token}”.` };
    }

    const jobPlate = normalizeVehiclePlate(job.truckPlates ?? "");
    if (jobPlate && jobPlate !== plateNorm) {
      return {
        kind: "error",
        message: `Vehicle registration does not match job ${job.jobNumber}. It must match the truck plates saved on the job.`,
      };
    }
    if (!jobPlate) {
      if (!pendingTargets.some((j) => j.id === job.id)) pendingTargets.push(job);
    } else if (!matched.some((j) => j.id === job.id)) {
      matched.push(job);
    }
  }

  if (pendingTargets.length > 0) {
    const dn = driverNameRaw.trim();
    return {
      kind: "needs_office",
      matchedJobs: matched,
      pendingTargets,
      vehicleRegDisplay,
      ...(dn ? { driverName: dn } : {}),
    };
  }

  if (matched.length === 0) {
    return { kind: "error", message: "No matching jobs for this sign-in." };
  }

  return { kind: "ok", jobs: matched };
}

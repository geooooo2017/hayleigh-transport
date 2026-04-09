import type { Job } from "../types";
import { normalizeVehiclePlate } from "./driverPositionsApi";

export function parseJobNumberTokens(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export type GateResult =
  | { ok: true; jobs: Job[] }
  | { ok: false; message: string };

/**
 * Driver must match job number(s), assigned driver name (as set in the office), and vehicle plates on the job.
 */
export function verifyDriverJobs(
  jobs: Job[],
  driverName: string,
  vehicleReg: string,
  jobNumbersRaw: string
): GateResult {
  const nameNorm = driverName.trim().toLowerCase();
  const plateNorm = normalizeVehiclePlate(vehicleReg);
  if (!nameNorm || !plateNorm) {
    return { ok: false, message: "Enter your name and vehicle registration." };
  }

  const tokens = parseJobNumberTokens(jobNumbersRaw);
  if (tokens.length === 0) {
    return { ok: false, message: "Enter at least one job number." };
  }

  const matched: Job[] = [];
  for (const token of tokens) {
    const t = token.toLowerCase();
    const job = jobs.find((j) => j.jobNumber.trim().toLowerCase() === t);
    if (!job) {
      return { ok: false, message: `No job found with number “${token}”.` };
    }

    const assigned = (job.assignedDriverName ?? "").trim().toLowerCase();
    if (!assigned) {
      return {
        ok: false,
        message: `Job ${job.jobNumber} has no assigned driver yet. Ask the office to set your name on that job.`,
      };
    }
    if (assigned !== nameNorm) {
      return { ok: false, message: `Job ${job.jobNumber} is not assigned to this driver name.` };
    }

    const jobPlate = normalizeVehiclePlate(job.truckPlates ?? "");
    if (!jobPlate || jobPlate !== plateNorm) {
      return {
        ok: false,
        message: `Vehicle registration does not match job ${job.jobNumber}. It must match the truck plates saved on the job.`,
      };
    }

    if (!matched.some((j) => j.id === job.id)) matched.push(job);
  }

  return { ok: true, jobs: matched };
}

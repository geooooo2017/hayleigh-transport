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
 * Driver must match job number(s) and vehicle plates on each job (same as the office job sheet).
 * Assigned driver name on the job is not required for sign-in.
 */
export function verifyDriverJobs(jobs: Job[], vehicleReg: string, jobNumbersRaw: string): GateResult {
  const plateNorm = normalizeVehiclePlate(vehicleReg);
  if (!plateNorm) {
    return { ok: false, message: "Enter your vehicle registration." };
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

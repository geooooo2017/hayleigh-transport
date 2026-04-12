import { formatVehicleRegistrationDisplay } from "./driverPositionsApi";
import type { Job } from "../types";

export function pendingDriverAllocationBellSig(j: Job): string {
  const p = j.pendingDriverAllocationRequest;
  if (!p) return "";
  return `${j.id}|${p.requestedAt}|${p.vehicleReg}`;
}

export function applyAcceptPendingAllocation(job: Job): Job | null {
  const p = job.pendingDriverAllocationRequest;
  if (!p) return null;
  const name = p.driverName?.trim();
  return {
    ...job,
    truckPlates: formatVehicleRegistrationDisplay(p.vehicleReg),
    ...(name ? { assignedDriverName: name } : {}),
    pendingDriverAllocationRequest: undefined,
    officeRevision: (job.officeRevision ?? 0) + 1,
    officeUpdatedAt: new Date().toISOString(),
  };
}

export function applyDismissPendingAllocation(job: Job): Job | null {
  if (!job.pendingDriverAllocationRequest) return null;
  return {
    ...job,
    pendingDriverAllocationRequest: undefined,
    officeRevision: (job.officeRevision ?? 0) + 1,
    officeUpdatedAt: new Date().toISOString(),
  };
}

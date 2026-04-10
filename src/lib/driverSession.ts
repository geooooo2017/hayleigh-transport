export const DRIVER_SESSION_KEY = "ht_driver_session";

export type DriverSession = {
  /** Optional; shown on the live map — falls back to vehicle registration. */
  driverName?: string;
  vehicleReg: string;
  jobIds: number[];
};

export function readDriverSession(): DriverSession | null {
  try {
    const raw = sessionStorage.getItem(DRIVER_SESSION_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as DriverSession & { driverName?: string };
    if (!o.vehicleReg || !Array.isArray(o.jobIds)) return null;
    const jobIds = o.jobIds.filter((id) => typeof id === "number" && Number.isFinite(id));
    if (jobIds.length === 0) return null;
    return {
      vehicleReg: String(o.vehicleReg).trim(),
      jobIds,
      ...(typeof o.driverName === "string" && o.driverName.trim() ? { driverName: o.driverName.trim() } : {}),
    };
  } catch {
    return null;
  }
}

export function writeDriverSession(s: DriverSession) {
  sessionStorage.setItem(DRIVER_SESSION_KEY, JSON.stringify(s));
}

export function clearDriverSession() {
  sessionStorage.removeItem(DRIVER_SESSION_KEY);
}

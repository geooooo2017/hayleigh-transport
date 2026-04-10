export const DRIVER_SESSION_KEY = "ht_driver_session";

export type DriverSession = {
  driverName: string;
  vehicleReg: string;
  jobIds: number[];
};

export function readDriverSession(): DriverSession | null {
  try {
    const raw = sessionStorage.getItem(DRIVER_SESSION_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as DriverSession;
    if (!o.driverName || !o.vehicleReg || !Array.isArray(o.jobIds)) return null;
    if (o.jobIds.length === 0) return null;
    return o;
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

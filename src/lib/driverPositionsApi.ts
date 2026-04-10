import { getSupabase } from "./supabase";

export type DriverMapPin = {
  driverName: string;
  vehicleRegistration: string;
  lat: number;
  lng: number;
  updatedAt: string;
  /** From driver sign-in; used with registration to match jobs on the map. */
  jobIds: number[];
};

/** Alias for map / routing hooks (same shape as Supabase driver row). */
export type FleetDriverPin = DriverMapPin;

/** Stable row key: vehicle + sorted job ids (matches sign-in gate). */
export function buildDriverPositionKey(vehicleReg: string, jobIds: number[]): string {
  const v = normalizeVehiclePlate(vehicleReg);
  const ids = [...jobIds].sort((a, b) => a - b).join(",");
  return `${v}|${ids}`;
}

export function normalizeVehiclePlate(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

/** Push current GPS (call periodically while sharing). */
export async function upsertDriverPosition(params: {
  driverName: string;
  vehicleRegistration: string;
  jobIds: number[];
  lat: number;
  lng: number;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Cloud sync is not configured." };
  const jobIds = [...params.jobIds].filter((id) => Number.isFinite(id));
  if (jobIds.length === 0) return { ok: false, error: "No jobs in session." };
  const key = buildDriverPositionKey(params.vehicleRegistration, jobIds);
  const displayName = params.driverName.trim() || params.vehicleRegistration.trim();
  const { error } = await supabase.from("driver_positions").upsert(
    {
      driver_key: key,
      driver_name: displayName,
      vehicle_registration: params.vehicleRegistration.trim(),
      job_ids: jobIds,
      lat: params.lat,
      lng: params.lng,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "driver_key" }
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Remove row when driver stops sharing (optional cleanup). */
export async function deleteDriverPosition(
  vehicleRegistration: string,
  jobIds: number[]
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const ids = [...jobIds].filter((id) => Number.isFinite(id));
  if (ids.length === 0) return;
  const key = buildDriverPositionKey(vehicleRegistration, ids);
  await supabase.from("driver_positions").delete().eq("driver_key", key);
}

const STALE_MS = 45 * 60 * 1000;

/** Pins for the map (recent fixes only). */
export async function fetchDriverPositionsForMap(): Promise<DriverMapPin[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase.from("driver_positions").select("*");
  if (error || !data?.length) return [];
  const cutoff = Date.now() - STALE_MS;
  return data
    .filter((row) => {
      const t = new Date(row.updated_at as string).getTime();
      return Number.isFinite(t) && t >= cutoff;
    })
    .filter(
      (row) =>
        typeof row.driver_name === "string" &&
        typeof row.vehicle_registration === "string" &&
        typeof row.lat === "number" &&
        typeof row.lng === "number" &&
        Number.isFinite(row.lat) &&
        Number.isFinite(row.lng)
    )
    .map((row) => {
      const rawIds = row.job_ids as number[] | null | undefined;
      const jobIds = Array.isArray(rawIds) ? rawIds.filter((id) => typeof id === "number" && Number.isFinite(id)) : [];
      return {
        driverName: row.driver_name as string,
        vehicleRegistration: row.vehicle_registration as string,
        lat: row.lat as number,
        lng: row.lng as number,
        updatedAt: row.updated_at as string,
        jobIds,
      };
    });
}

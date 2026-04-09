import { getSupabase } from "./supabase";

export type DriverMapPin = {
  driverName: string;
  vehicleRegistration: string;
  lat: number;
  lng: number;
  updatedAt: string;
};

function driverKey(driverName: string, vehicleReg: string): string {
  const n = driverName.trim().toLowerCase().replace(/\s+/g, " ");
  const v = vehicleReg.replace(/\s+/g, "").toLowerCase();
  return `${n}|${v}`;
}

export function normalizeVehiclePlate(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

/** Push current GPS (call periodically while sharing). */
export async function upsertDriverPosition(params: {
  driverName: string;
  vehicleRegistration: string;
  lat: number;
  lng: number;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Cloud sync is not configured." };
  const key = driverKey(params.driverName, params.vehicleRegistration);
  const { error } = await supabase.from("driver_positions").upsert(
    {
      driver_key: key,
      driver_name: params.driverName.trim(),
      vehicle_registration: params.vehicleRegistration.trim(),
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
export async function deleteDriverPosition(driverName: string, vehicleRegistration: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const key = driverKey(driverName, vehicleRegistration);
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
    .map((row) => ({
      driverName: row.driver_name,
      vehicleRegistration: row.vehicle_registration,
      lat: row.lat,
      lng: row.lng,
      updatedAt: row.updated_at as string,
    }));
}

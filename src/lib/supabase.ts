import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null | undefined;

/** Returns a client when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set; otherwise `null` (localStorage-only jobs). */
export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (typeof url !== "string" || !url || typeof key !== "string" || !key) {
    cached = null;
    return null;
  }
  cached = createClient(url, key);
  return cached;
}

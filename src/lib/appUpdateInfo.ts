/**
 * Build time of this JS bundle (set when Vite compiles — not “last data sync”).
 * Use `getAppBuildTimeIso()` in app code; `__APP_BUILD_ISO__` is compile-time global.
 */
export function getAppBuildTimeIso(): string {
  return __APP_BUILD_ISO__;
}

export function formatAppBuildForUser(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/**
 * Best-effort: unregisters service workers, deletes Cache Storage entries for this origin, then reloads.
 * Helps when a browser kept an old `index.html` or cached shell; does not erase Supabase data or localStorage jobs.
 */
export async function clearSiteCachesAndHardReload(): Promise<void> {
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    }
  } catch {
    /* ignore */
  }
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((name) => caches.delete(name)));
    }
  } catch {
    /* ignore */
  }
  window.location.reload();
}

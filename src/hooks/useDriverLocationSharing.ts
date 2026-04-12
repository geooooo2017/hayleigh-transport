import { useCallback, useEffect, useRef, useState } from "react";
import { deleteDriverPosition, upsertDriverPosition } from "../lib/driverPositionsApi";

type Status = "idle" | "requesting" | "active" | "error";

export function useDriverLocationSharing(
  driverName: string,
  vehicleRegistration: string,
  jobIds: number[],
  opts?: { onFirstGpsSuccess?: () => void }
) {
  const onFirstGpsSuccess = opts?.onFirstGpsSuccess;
  const [status, setStatus] = useState<Status>("idle");
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSentRef = useRef<{ lat: number; lng: number; t: number } | null>(null);
  const firstGpsLoggedRef = useRef(false);

  const stop = useCallback(async () => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current != null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    await deleteDriverPosition(vehicleRegistration, jobIds);
    setStatus("idle");
    setLastError(null);
    lastSentRef.current = null;
    firstGpsLoggedRef.current = false;
  }, [vehicleRegistration, jobIds]);

  const pushPosition = useCallback(
    async (lat: number, lng: number) => {
      const r = await upsertDriverPosition({ driverName, vehicleRegistration, jobIds, lat, lng });
      if (!r.ok) {
        setLastError(r.error ?? "Could not save location");
        setStatus("error");
        return;
      }
      if (!firstGpsLoggedRef.current) {
        firstGpsLoggedRef.current = true;
        onFirstGpsSuccess?.();
      }
      setLastError(null);
      setLastUpdated(new Date().toISOString());
      setStatus("active");
    },
    [driverName, vehicleRegistration, jobIds, onFirstGpsSuccess]
  );

  const start = useCallback(() => {
    setLastError(null);
    setStatus("requesting");

    if (!navigator.geolocation) {
      setLastError("This device does not support location.");
      setStatus("error");
      return;
    }

    const onPos = (pos: GeolocationPosition) => {
      const { latitude, longitude } = pos.coords;
      const now = Date.now();
      const prev = lastSentRef.current;
      const moved =
        !prev ||
        Math.abs(prev.lat - latitude) > 0.0002 ||
        Math.abs(prev.lng - longitude) > 0.0002 ||
        now - prev.t > 20000;
      if (moved) {
        lastSentRef.current = { lat: latitude, lng: longitude, t: now };
        void pushPosition(latitude, longitude);
      }
    };

    const onErr = (e: GeolocationPositionError) => {
      setLastError(e.message || "Location permission denied or unavailable.");
      setStatus("error");
    };

    watchIdRef.current = navigator.geolocation.watchPosition(onPos, onErr, {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 20000,
    });

    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(onPos, () => {}, {
        enableHighAccuracy: true,
        maximumAge: 15000,
        timeout: 15000,
      });
    }, 25000);
  }, [pushPosition]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (intervalRef.current != null) clearInterval(intervalRef.current);
    };
  }, []);

  return { status, lastError, lastUpdated, start, stop };
}

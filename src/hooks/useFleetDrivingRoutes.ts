import { useEffect, useMemo, useState } from "react";
import type { Job } from "../types";
import type { FleetDriverPin } from "../lib/driverPositionsApi";
import { driverPinMatchesJob } from "../lib/customerNotifications";
import { collectionMapPoint, deliveryMapPoint } from "../lib/jobMapPosition";
import {
  fetchDrivingRouteWithTrafficFallback,
  fetchOsrmRoute,
  type DrivingRouteLeg,
} from "../lib/drivingDirections";

export type FleetRouteBundle = {
  /** Collection → delivery along roads (typical speeds, OSRM). */
  planLeg: DrivingRouteLeg | null;
  /** Matched driver GPS → delivery (Google traffic when configured, else OSRM). */
  driverLeg: DrivingRouteLeg | null;
  matchedPin: FleetDriverPin | null;
};

export type FleetRoutesState = {
  byJobId: Record<number, FleetRouteBundle>;
  loading: boolean;
};

/** Stable string for map effects — avoids re-running on new `driverPins` array refs from polling. */
export function fleetMapDriverPinsKey(pins: FleetDriverPin[]): string {
  return pins
    .map((p) => {
      const n = p.driverName.trim().toLowerCase();
      const v = p.vehicleRegistration.replace(/\s+/g, "").toLowerCase();
      return `${n}|${v}|${p.lat.toFixed(4)}|${p.lng.toFixed(4)}`;
    })
    .sort()
    .join(";");
}

/** Active-job geometry key for route fetch + map layer updates. */
export function fleetMapJobsGeometryKey(jobs: Job[]): string {
  const active = jobs.filter((j) => j && j.status !== "completed");
  return active
    .map((j) => {
      const c = collectionMapPoint(j);
      const d = deliveryMapPoint(j);
      return `${j.id}:${c.lat.toFixed(4)},${c.lng.toFixed(4)}:${d ? `${d.lat.toFixed(4)},${d.lng.toFixed(4)}` : "x"}`;
    })
    .sort()
    .join("|");
}

/**
 * Fetches road geometry for the fleet map: planned collection→delivery legs, and driver→delivery when a pin matches the job.
 */
export function useFleetDrivingRoutes(jobs: Job[], driverPins: FleetDriverPin[]): FleetRoutesState {
  const [byJobId, setByJobId] = useState<Record<number, FleetRouteBundle>>({});
  const [loading, setLoading] = useState(false);

  const jobsKey = useMemo(() => fleetMapJobsGeometryKey(jobs), [jobs]);
  const pinsKey = useMemo(() => fleetMapDriverPinsKey(driverPins), [driverPins]);
  const depsKey = `${jobsKey}##${pinsKey}`;

  useEffect(() => {
    let cancelled = false;
    const active = jobs.filter((j) => j && j.status !== "completed");

    void (async () => {
      if (active.length === 0) {
        setByJobId({});
        setLoading(false);
        return;
      }
      setLoading(true);

      const nextByJobId: Record<number, FleetRouteBundle> = {};

      for (const j of active) {
        if (cancelled) return;
        const coll = collectionMapPoint(j);
        const del = deliveryMapPoint(j);
        if (
          !del ||
          !Number.isFinite(coll.lat) ||
          !Number.isFinite(coll.lng) ||
          !Number.isFinite(del.lat) ||
          !Number.isFinite(del.lng)
        ) {
          nextByJobId[j.id] = { planLeg: null, driverLeg: null, matchedPin: null };
          continue;
        }

        const planLeg = await fetchOsrmRoute(
          { lat: coll.lat, lng: coll.lng },
          { lat: del.lat, lng: del.lng }
        );
        if (cancelled) return;

        const matchedPin = driverPins.find((p) => driverPinMatchesJob(j, p)) ?? null;
        let driverLeg: DrivingRouteLeg | null = null;
        if (matchedPin && Number.isFinite(matchedPin.lat) && Number.isFinite(matchedPin.lng)) {
          driverLeg = await fetchDrivingRouteWithTrafficFallback(
            { lat: matchedPin.lat, lng: matchedPin.lng },
            { lat: del.lat, lng: del.lng }
          );
        }
        if (cancelled) return;

        nextByJobId[j.id] = { planLeg, driverLeg, matchedPin };
        await new Promise((r) => setTimeout(r, 60));
      }

      if (!cancelled) {
        setByJobId(nextByJobId);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // depsKey already hashes `driverPins` (rounded); omitting `driverPins` avoids refetch every poll when coords unchanged.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [depsKey]);

  return useMemo(() => ({ byJobId, loading }), [byJobId, loading]);
}

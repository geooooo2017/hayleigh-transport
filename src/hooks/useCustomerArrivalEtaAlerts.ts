import { useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { notifyMessage } from "../lib/platformNotify";
import { platformPath } from "../routes/paths";
import type { Job } from "../types";
import type { DriverMapPin } from "../lib/driverPositionsApi";
import {
  build1hAwayMailto,
  driverPinMatchesJob,
  estimatedDriveHoursStraightLineKm,
  haversineKm,
} from "../lib/customerNotifications";
import { openMailtoUrl } from "../lib/podMailto";

const TICK_MS = 45_000;

/**
 * When a matched driver is within ~1h drive of delivery (straight-line estimate), opens a customer email draft once per job.
 * Requires delivery coordinates, in-progress status, and at least one notification email on the job.
 */
export function useCustomerArrivalEtaAlerts(
  jobs: Job[],
  driverPins: DriverMapPin[],
  setJobs: Dispatch<SetStateAction<Job[]>>
) {
  const jobsRef = useRef(jobs);
  const pinsRef = useRef(driverPins);
  jobsRef.current = jobs;
  pinsRef.current = driverPins;

  useEffect(() => {
    const id = window.setInterval(() => {
      const list = jobsRef.current;
      const pins = pinsRef.current;

      for (const job of list) {
        if (job.status !== "in-progress") continue;
        if (job.deliveryLat == null || job.deliveryLng == null) continue;
        if (job.customerNotified1hEtaAt) continue;
        if (!build1hAwayMailto(job)) continue;

        const pin = pins.find((p) => driverPinMatchesJob(job, p));
        if (!pin) continue;

        const km = haversineKm(pin.lat, pin.lng, job.deliveryLat, job.deliveryLng);
        const hours = estimatedDriveHoursStraightLineKm(km);
        if (hours > 1 || hours < 0.08) continue;

        const url = build1hAwayMailto(job);
        if (!url) continue;

        openMailtoUrl(url);
        setJobs((prev) => {
          let hit = false;
          const next = prev.map((j) => {
            if (j.id !== job.id) return j;
            if (j.customerNotified1hEtaAt) return j;
            hit = true;
            return { ...j, customerNotified1hEtaAt: new Date().toISOString() };
          });
          return hit ? next : prev;
        });
        notifyMessage("Customer 1-hour email draft opened", {
          description: `${job.jobNumber}: review and send. ETA is estimated from live GPS (~${Math.round(km)} km).`,
          duration: 8000,
          href: platformPath(`/jobs/${job.id}`),
        });
        break;
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [setJobs]);
}

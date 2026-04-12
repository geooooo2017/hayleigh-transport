import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import type { Vehicle } from "../types";
import { Link } from "react-router-dom";
import { useCustomerArrivalEtaAlerts } from "../hooks/useCustomerArrivalEtaAlerts";
import { useJobs } from "../context/JobsContext";
import { Btn, Card } from "../components/Layout";
import { FleetMap, type FleetDriverPin } from "../components/FleetMap";
import { useFleetDrivingRoutes } from "../hooks/useFleetDrivingRoutes";
import { formatEtaSummary } from "../lib/drivingDirections";
import { formatJobCardDate } from "../lib/jobAddress";
import {
  fetchDriverPositionsForMap,
  OFFICE_DRIVER_POSITIONS_POLL_MS,
  officeDriverPositionsPollDescription,
} from "../lib/driverPositionsApi";
import {
  createLiveTrackingDemoJob,
  fetchLiveTrackingDemoRoutePoints,
  LIVE_TRACKING_DEMO_JOB_ID,
  LIVE_TRACKING_DEMO_REG,
  pointAlongDemoRoute,
} from "../lib/liveTrackingCustomerDemo";
import { platformPath } from "../routes/paths";

const DEMO_ANIM_MS = 450;
/** Refresh road-route geometry for the blue line occasionally (moving pin every frame would hammer OSRM). */
const DEMO_ROUTE_PIN_MS = 12_000;
const DEMO_CYCLE_MS = 95_000;

function buildDemoFleetPin(lat: number, lng: number): FleetDriverPin {
  return {
    driverName: "Demo driver",
    vehicleRegistration: LIVE_TRACKING_DEMO_REG,
    jobIds: [LIVE_TRACKING_DEMO_JOB_ID],
    lat,
    lng,
    updatedAt: new Date().toISOString(),
  };
}

export default function LiveTrackingPage() {
  const [jobs, setJobs] = useJobs();
  const [fleetVehicles] = useLocalStorage<Vehicle[]>("vehicles", []);
  const [driverPins, setDriverPins] = useState<FleetDriverPin[]>([]);
  const active = jobs.filter((j) => j.status !== "completed");

  const demoJob = useMemo(() => createLiveTrackingDemoJob(), []);
  const [customerDemoActive, setCustomerDemoActive] = useState(false);
  const [customerDemoLoading, setCustomerDemoLoading] = useState(false);
  const [demoRoutePoints, setDemoRoutePoints] = useState<[number, number][]>([]);
  const [demoPinDisplay, setDemoPinDisplay] = useState<FleetDriverPin | null>(null);
  const [demoRoutePin, setDemoRoutePin] = useState<FleetDriverPin | null>(null);
  const demoPinDisplayRef = useRef<FleetDriverPin | null>(null);
  demoPinDisplayRef.current = demoPinDisplay;

  useEffect(() => {
    const tick = () => void fetchDriverPositionsForMap().then(setDriverPins);
    tick();
    const id = setInterval(tick, OFFICE_DRIVER_POSITIONS_POLL_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!customerDemoActive || demoRoutePoints.length < 2) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      const phase = (t % DEMO_CYCLE_MS) / DEMO_CYCLE_MS;
      const frac = phase < 0.5 ? phase * 2 : 2 - phase * 2;
      const [lat, lng] = pointAlongDemoRoute(demoRoutePoints, frac);
      setDemoPinDisplay(buildDemoFleetPin(lat, lng));
    }, DEMO_ANIM_MS);
    return () => clearInterval(id);
  }, [customerDemoActive, demoRoutePoints]);

  useEffect(() => {
    if (!customerDemoActive) {
      setDemoRoutePin(null);
      return;
    }
    const push = () => {
      const p = demoPinDisplayRef.current;
      if (p) setDemoRoutePin(p);
    };
    push();
    const id = window.setInterval(push, DEMO_ROUTE_PIN_MS);
    return () => clearInterval(id);
  }, [customerDemoActive]);

  const startCustomerDemo = useCallback(async () => {
    setCustomerDemoLoading(true);
    try {
      const pts = await fetchLiveTrackingDemoRoutePoints();
      setDemoRoutePoints(pts);
      const [lat, lng] = pointAlongDemoRoute(pts, 0);
      const initial = buildDemoFleetPin(lat, lng);
      setDemoPinDisplay(initial);
      setDemoRoutePin(initial);
      setCustomerDemoActive(true);
    } finally {
      setCustomerDemoLoading(false);
    }
  }, []);

  const stopCustomerDemo = useCallback(() => {
    setCustomerDemoActive(false);
    setDemoPinDisplay(null);
    setDemoRoutePin(null);
    setDemoRoutePoints([]);
  }, []);

  const mapJobs = useMemo(() => {
    if (!customerDemoActive) return jobs;
    const rest = jobs.filter((j) => j.id !== LIVE_TRACKING_DEMO_JOB_ID);
    return [...rest, demoJob];
  }, [customerDemoActive, jobs, demoJob]);

  const pinsForMap =
    customerDemoActive && demoPinDisplay ? [demoPinDisplay] : driverPins;
  const pinsForRoutes =
    customerDemoActive && demoRoutePin ? [demoRoutePin] : driverPins;

  useCustomerArrivalEtaAlerts(jobs, driverPins, setJobs);
  const fleetRoutes = useFleetDrivingRoutes(mapJobs, pinsForRoutes);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 lg:text-3xl">Live Tracking</h1>
          <p className="mt-1 text-gray-500">Monitor active jobs on the road</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {customerDemoActive ? (
            <Btn variant="outline" className="text-sm" onClick={stopCustomerDemo}>
              Stop customer demo
            </Btn>
          ) : (
            <Btn
              className="text-sm"
              disabled={customerDemoLoading}
              onClick={() => void startCustomerDemo()}
            >
              {customerDemoLoading ? "Preparing demo…" : "Customer demo (no GPS)"}
            </Btn>
          )}
        </div>
      </div>

      <Card className="space-y-3 p-5">
        <h2 className="text-base font-semibold text-gray-900">How to get a driver on the map</h2>
        <p className="text-sm text-gray-600">
          The driver must use the real site address (HTTPS). Sign-in needs the <strong>vehicle registration</strong> and{" "}
          <strong>job number(s)</strong> to match the office job (truck plates on the job sheet).
        </p>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-gray-800">
          <li>
            <strong>Office — create or open the job.</strong> Set status to <em>Scheduled</em> or <em>In progress</em> (completed
            jobs are hidden from the live map).
          </li>
          <li>
            <strong>Office — map pins.</strong> On the job, enter <strong>full UK postcodes</strong> for collection and delivery,
            then use <strong>Look up UK postcodes → map</strong> so stops appear on the fleet map.
          </li>
          <li>
            <strong>Office — truck plates.</strong> Set <strong>truck plates</strong> on the job to the registration the driver
            will enter (spacing ignored when matching). Assigned driver name is optional for the driver app.
          </li>
          <li>
            <strong>Driver — sign in.</strong> Open the driver page (e.g. <code className="rounded bg-gray-100 px-1 text-xs">/driver</code> on your
            live website). Enter <strong>vehicle registration</strong> and one or more <strong>job numbers</strong> they are
            running. An optional name is only used as a label on the map.
          </li>
          <li>
            <strong>Driver — share location.</strong> After sign-in, tap to start live location. Allow the browser location
            prompt. Keep sharing turned on while on the road so this page can show their position.
          </li>
          <li>
            <strong>Office — refresh.</strong> This page reloads driver positions about every {officeDriverPositionsPollDescription()};
            the live vehicle icon should appear near their GPS fix while the job stays active.
          </li>
          <li>
            <strong>Showroom — customer demo.</strong> Use <strong>Customer demo (no GPS)</strong> above to play a short simulated
            rigid HGV moving between two UK points (~6 miles on roads when routing loads). Nothing is saved; it does not use real
            driver positions.
          </li>
        </ol>
      </Card>

      {customerDemoActive ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <strong>Customer demo active:</strong> simulated vehicle and job only — your real GPS feeds are hidden until you stop
          the demo.
        </p>
      ) : null}

      <FleetMap jobs={mapJobs} driverPins={pinsForMap} fleetRoutes={fleetRoutes} fleetVehicles={fleetVehicles} />

      {active.length === 0 ? (
        <Card className="p-8 text-center text-gray-600">
          <p className="mb-4">No active jobs.</p>
          <Link to={platformPath("/jobs/create")}>
            <Btn>Create Job</Btn>
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {active.map((j) => {
            const driverLeg = fleetRoutes.byJobId[j.id]?.driverLeg;
            return (
            <Card key={j.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div>
                <div className="font-semibold text-ht-slate">{j.jobNumber}</div>
                <dl className="mt-1.5 space-y-0.5 text-[11px] leading-snug text-gray-700">
                  <div className="flex justify-between gap-6 sm:min-w-[220px]">
                    <dt className="shrink-0 text-gray-500">Customer job no.</dt>
                    <dd className="truncate text-right font-medium text-gray-800">{j.customerInvoiceRef?.trim() || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-6">
                    <dt className="shrink-0 text-gray-500">Collection date</dt>
                    <dd className="text-right">{formatJobCardDate(j.collectionDate)}</dd>
                  </div>
                  <div className="flex justify-between gap-6">
                    <dt className="shrink-0 text-gray-500">Collection postcode</dt>
                    <dd className="truncate text-right font-mono uppercase">{(j.collectionPostcode ?? "").trim() || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-6">
                    <dt className="shrink-0 text-gray-500">Delivery postcode</dt>
                    <dd className="truncate text-right font-mono uppercase">{(j.deliveryPostcode ?? "").trim() || "—"}</dd>
                  </div>
                  {driverLeg ? (
                    <div className="flex justify-between gap-6 border-t border-gray-100 pt-1">
                      <dt className="shrink-0 text-gray-500">ETA to delivery</dt>
                      <dd className="text-right font-medium text-ht-slate">{formatEtaSummary(driverLeg)}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
              <div className="text-right text-sm">
                <div className="text-gray-600">Status</div>
                <div className="font-medium capitalize text-ht-slate">{j.status.replace("-", " ")}</div>
              </div>
              <Link to={platformPath(`/jobs/${j.id}`)}>
                <Btn variant="outline" className="text-sm">
                  Details
                </Btn>
              </Link>
            </Card>
          );
          })}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { useCustomerArrivalEtaAlerts } from "../hooks/useCustomerArrivalEtaAlerts";
import { useJobs } from "../context/JobsContext";
import { Btn, Card } from "../components/Layout";
import { FleetMap, type FleetDriverPin } from "../components/FleetMap";
import { formatAddressSummary } from "../lib/jobAddress";
import { fetchDriverPositionsForMap } from "../lib/driverPositionsApi";
import {
  LIVE_TRACKING_DEMO_FAST_POLL_MS,
  readLiveTrackingDemoFastPoll,
  writeLiveTrackingDemoFastPoll,
} from "../lib/liveTrackingDemo";
import { platformPath } from "../routes/paths";

const DEFAULT_DRIVER_POLL_MS = 8000;

export default function LiveTrackingPage() {
  const [jobs, setJobs] = useJobs();
  const [driverPins, setDriverPins] = useState<FleetDriverPin[]>([]);
  /** DEMO: remove with liveTrackingDemo.ts */
  const [demoFastPoll, setDemoFastPoll] = useState(() => readLiveTrackingDemoFastPoll());
  const active = jobs.filter((j) => j.status !== "completed");

  useEffect(() => {
    const ms = demoFastPoll ? LIVE_TRACKING_DEMO_FAST_POLL_MS : DEFAULT_DRIVER_POLL_MS;
    const tick = () => void fetchDriverPositionsForMap().then(setDriverPins);
    tick();
    const id = setInterval(tick, ms);
    return () => clearInterval(id);
  }, [demoFastPoll]);

  useCustomerArrivalEtaAlerts(jobs, driverPins, setJobs);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 lg:text-3xl">Live Tracking</h1>
        <p className="mt-1 text-gray-500">Monitor active jobs on the road</p>
      </div>

      {/* DEMO: remove this card when live-tracking demo is no longer needed */}
      <Card className="space-y-3 border-2 border-amber-200 bg-amber-50/60 p-5">
        <h2 className="text-base font-semibold text-amber-950">Demo: live map without a job</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-amber-950/95">
          <li>
            Open the driver page (<code className="rounded bg-white/80 px-1 text-xs">/driver</code>) on a phone with HTTPS.
          </li>
          <li>
            Tick <strong>Demo: test live map without a job</strong>, enter any name and registration, continue — no job numbers
            needed.
          </li>
          <li>
            Tap <strong>Share my location</strong>. Return here: the green dot should appear and move as you walk or drive
            (Supabase required).
          </li>
        </ol>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-amber-950">
          <input
            type="checkbox"
            checked={demoFastPoll}
            onChange={(e) => {
              const on = e.target.checked;
              writeLiveTrackingDemoFastPoll(on);
              setDemoFastPoll(on);
            }}
            className="h-4 w-4 rounded border-gray-300 text-ht-slate focus:ring-ht-slate"
          />
          <span>
            Faster map refresh for demos ({LIVE_TRACKING_DEMO_FAST_POLL_MS / 1000}s instead of {DEFAULT_DRIVER_POLL_MS / 1000}s)
          </span>
        </label>
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="text-base font-semibold text-gray-900">How to get a driver on the map (normal use)</h2>
        <p className="text-sm text-gray-600">
          Follow these steps in order. The driver must use the real site address (HTTPS), and their name and vehicle must match
          the job in the office system.
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
            <strong>Office — match the driver app.</strong> Set <strong>Assigned driver name</strong> to the exact name the
            driver will type (e.g. Nik). Set <strong>truck plates</strong> on the job to the exact registration the driver will
            enter (spacing ignored when matching).
          </li>
          <li>
            <strong>Driver — sign in.</strong> Open the driver page (e.g. <code className="rounded bg-gray-100 px-1 text-xs">/driver</code> on your
            live website). Enter their <strong>name</strong>, <strong>vehicle registration</strong>, and one or more{" "}
            <strong>job numbers</strong> they are running. The app checks these against the jobs in the system.
          </li>
          <li>
            <strong>Driver — share location.</strong> After sign-in, tap to start live location. Allow the browser location
            prompt. Keep sharing turned on while on the road so this page can show their position.
          </li>
          <li>
            <strong>Office — refresh.</strong> This page reloads driver positions about every {DEFAULT_DRIVER_POLL_MS / 1000}{" "}
            seconds (or every {LIVE_TRACKING_DEMO_FAST_POLL_MS / 1000}s if “Faster map refresh for demos” is on); the green
            driver dot should appear near their GPS fix while the job stays active.
          </li>
        </ol>
      </Card>

      <FleetMap jobs={jobs} driverPins={driverPins} />

      {active.length === 0 ? (
        <Card className="p-8 text-center text-gray-600">
          <p className="mb-4">No active jobs.</p>
          <Link to={platformPath("/jobs/create")}>
            <Btn>Create Job</Btn>
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {active.map((j) => (
            <Card key={j.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div>
                <div className="font-semibold text-gray-900">{j.jobNumber}</div>
                <div className="text-sm text-gray-600">
                  {j.customerName} · {j.handler}
                </div>
                <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                  <MapPin size={14} />
                  {(formatAddressSummary(j, "collection", 52) || "—") + " → " + (formatAddressSummary(j, "delivery", 40) || "—")}
                </div>
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
          ))}
        </div>
      )}
    </div>
  );
}

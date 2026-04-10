import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCustomerArrivalEtaAlerts } from "../hooks/useCustomerArrivalEtaAlerts";
import { useJobs } from "../context/JobsContext";
import { Btn, Card } from "../components/Layout";
import { FleetMap, type FleetDriverPin } from "../components/FleetMap";
import { formatJobCardDate } from "../lib/jobAddress";
import { fetchDriverPositionsForMap } from "../lib/driverPositionsApi";
import { platformPath } from "../routes/paths";

const DRIVER_POLL_MS = 8000;

export default function LiveTrackingPage() {
  const [jobs, setJobs] = useJobs();
  const [driverPins, setDriverPins] = useState<FleetDriverPin[]>([]);
  const active = jobs.filter((j) => j.status !== "completed");

  useEffect(() => {
    const tick = () => void fetchDriverPositionsForMap().then(setDriverPins);
    tick();
    const id = setInterval(tick, DRIVER_POLL_MS);
    return () => clearInterval(id);
  }, []);

  useCustomerArrivalEtaAlerts(jobs, driverPins, setJobs);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 lg:text-3xl">Live Tracking</h1>
        <p className="mt-1 text-gray-500">Monitor active jobs on the road</p>
      </div>

      <Card className="space-y-3 p-5">
        <h2 className="text-base font-semibold text-gray-900">How to get a driver on the map</h2>
        <p className="text-sm text-gray-600">
          The driver must use the real site address (HTTPS), and their name and vehicle must match the job in the office system.
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
            <strong>Office — refresh.</strong> This page reloads driver positions about every {DRIVER_POLL_MS / 1000} seconds;
            the green driver dot should appear near their GPS fix while the job stays active.
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
          ))}
        </div>
      )}
    </div>
  );
}

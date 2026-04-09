import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, MapPin, Plus, Smartphone, Truck, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useJobs } from "../context/JobsContext";
import type { Customer, Driver, Job, Vehicle } from "../types";
import { useCustomerArrivalEtaAlerts } from "../hooks/useCustomerArrivalEtaAlerts";
import { formatAddressSummary } from "../lib/jobAddress";
import { fetchDriverPositionsForMap } from "../lib/driverPositionsApi";
import { FleetMap, type FleetDriverPin } from "../components/FleetMap";
import { Btn, Card } from "../components/Layout";
import {
  applyMobileTrackingTestProject,
  MOBILE_TEST_JOB_ID,
  MOBILE_TEST_JOB_NUMBER,
} from "../lib/mobileTrackingTestProject";
import { notifySuccess } from "../lib/platformNotify";
import { platformPath } from "../routes/paths";

function statusRank(s: Job["status"]): number {
  if (s === "in-progress") return 0;
  if (s === "scheduled") return 1;
  return 2;
}

function readLs<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [customers, setCustomers] = useLocalStorage<Customer[]>("customers", []);
  const [drivers, setDrivers] = useLocalStorage<Driver[]>("drivers", []);
  const [vehicles, setVehicles] = useLocalStorage<Vehicle[]>("vehicles", []);
  const [jobs, setJobs] = useJobs();
  const [driverPins, setDriverPins] = useState<FleetDriverPin[]>([]);

  const empty = customers.length === 0 && jobs.length === 0;
  const today = new Date();
  const jobsToday = jobs.filter((j) => new Date(j.collectionDate).toDateString() === today.toDateString());
  const completed = jobs.filter((j) => j.status === "completed");
  const scheduled = jobs.filter((j) => j.status === "scheduled");
  const inProgress = jobs.filter((j) => j.status === "in-progress");
  const revenueToday = jobsToday.reduce((s, j) => s + (Number(j.sellPrice) || 0), 0);
  const revenueTotal = jobs.reduce((s, j) => s + (Number(j.sellPrice) || 0), 0);

  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      const dr = statusRank(a.status) - statusRank(b.status);
      if (dr !== 0) return dr;
      const ta = new Date(a.collectionDate).getTime();
      const tb = new Date(b.collectionDate).getTime();
      if (a.status === "completed" && b.status === "completed") return tb - ta;
      return ta - tb;
    });
  }, [jobs]);

  useEffect(() => {
    const tick = () => void fetchDriverPositionsForMap().then(setDriverPins);
    tick();
    const id = setInterval(tick, 8000);
    return () => clearInterval(id);
  }, []);

  useCustomerArrivalEtaAlerts(jobs, driverPins, setJobs);

  return (
    <div className="space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ht-navy lg:text-3xl">Operations dashboard</h1>
        <p className="mt-1 text-sm text-slate-600 lg:text-base">
          Control tower for transport: every job in one list, live map positions for work in progress, and driver GPS when
          available. Updates about every 8 seconds.
        </p>
      </div>

      <Card className="border-2 border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 to-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-emerald-950">
              <Smartphone className="shrink-0 text-emerald-700" size={22} aria-hidden />
              Mobile tracking test (George Sweeney → Mauchline)
            </h2>
            <p className="mt-2 text-sm text-emerald-950/90">
              Loads one end-to-end demo job: <strong>Bellshill (ML4 1RZ)</strong> →{" "}
              <strong>Mauchline (KA5 5DW)</strong>, <strong>completed</strong> with POD, supplier invoice, customer
              invoice and payment — visible under <strong>Customer Invoicing</strong>, job timeline, and reports. Route
              pins stay on the map for history.               For <strong>live GPS</strong> on the map, open the job and set status back
              to <strong>In progress</strong>; driver app: George Sweeney / SG65 KDK / {MOBILE_TEST_JOB_NUMBER} (HTTPS +
              Supabase). <strong>No customer login</strong> exists — your freight customer appears under{" "}
              <Link className="font-medium text-emerald-800 underline" to={platformPath("/customers")}>
                Customers
              </Link>{" "}
              (CRM); this button also adds that demo record.
            </p>
            <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-emerald-950/85">
              <li>
                <strong>Driver sign-in:</strong>{" "}
                <Link className="font-medium text-emerald-800 underline" to="/driver">
                  /driver
                </Link>{" "}
                — Name: <code className="rounded bg-white/80 px-1">George Sweeney</code>, Reg:{" "}
                <code className="rounded bg-white/80 px-1">SG65 KDK</code> (or SG65KDK), Job:{" "}
                <code className="rounded bg-white/80 px-1">{MOBILE_TEST_JOB_NUMBER}</code>
              </li>
              <li>
                <strong>Office:</strong> open{" "}
                <Link className="font-medium text-emerald-800 underline" to={platformPath("/live-tracking")}>
                  Live Tracking
                </Link>{" "}
                or the map below — enable location on the phone after sign-in.
              </li>
            </ul>
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <Btn
              type="button"
              className="gap-2 bg-emerald-700 text-white hover:bg-emerald-800"
              onClick={() => {
                applyMobileTrackingTestProject(setJobs, user?.name ?? "Nik");
                setDrivers(readLs<Driver[]>("drivers", []));
                setVehicles(readLs<Vehicle[]>("vehicles", []));
                setCustomers(readLs<Customer[]>("customers", []));
                notifySuccess("Mobile test job loaded", {
                  description: `${MOBILE_TEST_JOB_NUMBER} — completed & invoiced demo. Try Customer Invoicing or job detail timeline; use In progress for live map.`,
                  href: platformPath(`/jobs/${MOBILE_TEST_JOB_ID}`),
                });
              }}
            >
              Load / refresh test job
            </Btn>
            <Link to={platformPath(`/jobs/${MOBILE_TEST_JOB_ID}`)}>
              <Btn variant="outline" className="w-full gap-2" type="button">
                Open test job
              </Btn>
            </Link>
          </div>
        </div>
      </Card>

      {empty && (
        <Card className="border-2 border-ht-border bg-gradient-to-br from-ht-canvas to-white p-6">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-ht-slate">
              <Truck size={24} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="mb-2 text-xl font-semibold text-ht-navy">Welcome — set up your operation</h3>
              <p className="mb-4 text-slate-600">
                Complete these steps to run jobs, quotes and haulage activity from one place:
              </p>
              <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <Link to={platformPath("/customers")} className="block rounded-lg border border-ht-border bg-white p-4 transition-shadow hover:shadow-md">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-sm font-semibold text-green-600">
                      1
                    </div>
                    <Users size={20} className="text-green-600" />
                  </div>
                  <h4 className="mb-1 font-semibold text-gray-900">Add Customers</h4>
                  <p className="text-xs text-gray-600">Build your customer database</p>
                  <Btn variant="outline" className="mt-3 w-full gap-1 py-1.5 text-xs">
                    <Plus size={14} /> Add Customer
                  </Btn>
                </Link>
                <Link to={platformPath("/drivers-vehicles")} className="block rounded-lg border border-ht-border bg-white p-4 transition-shadow hover:shadow-md">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-600">
                      2
                    </div>
                    <Truck size={20} className="text-orange-600" />
                  </div>
                  <h4 className="mb-1 font-semibold text-gray-900">Add Fleet</h4>
                  <p className="text-xs text-gray-600">Add drivers and vehicles</p>
                  <Btn variant="outline" className="mt-3 w-full gap-1 py-1.5 text-xs">
                    <Plus size={14} /> Add Driver
                  </Btn>
                </Link>
                <Link to={platformPath("/jobs/create")} className="block rounded-lg border border-ht-slate/25 bg-ht-slate/5 p-4 transition-shadow hover:shadow-md">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ht-slate text-sm font-semibold text-white">
                      3
                    </div>
                    <ClipboardList size={20} className="text-ht-slate" />
                  </div>
                  <h4 className="mb-1 font-semibold text-gray-900">Create First Job</h4>
                  <p className="text-xs text-gray-600">Start tracking jobs!</p>
                  <Btn className="mt-3 w-full gap-1 py-1.5 text-xs">
                    <Plus size={14} /> Create Job
                  </Btn>
                </Link>
              </div>
              <p className="text-sm text-gray-600">
                <strong>Tip:</strong> Start by adding 2-3 customers, then create your first job to see profit calculations
                in real-time!
              </p>
            </div>
          </div>
        </Card>
      )}

      {empty && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <Card className="p-6 text-center">
            <div className="text-4xl font-bold text-gray-900">{customers.length}</div>
            <div className="mt-1 text-sm text-gray-600">Customers</div>
          </Card>
          <Card className="p-6 text-center">
            <div className="text-4xl font-bold text-gray-900">{drivers.length + vehicles.length}</div>
            <div className="mt-1 text-sm text-gray-600">Fleet Items</div>
          </Card>
          <Card className="col-span-2 p-6 text-center lg:col-span-1">
            <div className="text-4xl font-bold text-gray-900">{jobs.length}</div>
            <div className="mt-1 text-sm text-gray-600">Jobs Created</div>
          </Card>
        </div>
      )}

      {!empty && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            <Card>
              <div className="flex flex-row items-center justify-between border-b border-ht-border px-6 pb-2 pt-6">
                <h2 className="text-sm font-medium text-slate-600">Jobs Today</h2>
                <ClipboardList className="text-ht-slate" size={20} />
              </div>
              <div className="px-6 pb-6 pt-2">
                <div className="mb-4 text-3xl font-semibold text-gray-900">{jobsToday.length}</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Completed</span>
                    <span className="text-sm font-medium text-green-600">{completed.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Scheduled</span>
                    <span className="text-sm font-medium text-ht-slate">{scheduled.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">In Progress</span>
                    <span className="text-sm font-medium text-orange-600">{inProgress.length}</span>
                  </div>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex flex-row items-center justify-between border-b border-ht-border px-6 pb-2 pt-6">
                <h2 className="text-sm font-medium text-slate-600">Revenue</h2>
                <span className="text-[#10B981]" aria-hidden>
                  £
                </span>
              </div>
              <div className="px-6 pb-6 pt-2">
                <div className="mb-4 text-3xl font-semibold text-gray-900">£{revenueToday.toFixed(2)}</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Today</span>
                    <span className="text-sm font-medium">£{revenueToday.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total</span>
                    <span className="text-sm font-medium">£{revenueTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Jobs</span>
                    <span className="text-sm font-medium">{jobs.length}</span>
                  </div>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex flex-row items-center justify-between border-b border-ht-border px-6 pb-2 pt-6">
                <h2 className="text-sm font-medium text-slate-600">System Overview</h2>
                <Users className="text-ht-slate" size={20} />
              </div>
              <div className="space-y-3 px-6 pb-6 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Jobs</span>
                  <span className="text-2xl font-semibold text-gray-900">{jobs.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Customers</span>
                  <span className="text-2xl font-semibold text-gray-900">{customers.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Fleet</span>
                  <span className="text-2xl font-semibold text-gray-900">{drivers.length + vehicles.length}</span>
                </div>
              </div>
            </Card>
          </div>

          {jobs.length > 0 && (
            <>
              <Card className="overflow-hidden p-0">
                <div className="flex flex-col gap-1 border-b border-ht-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-ht-navy">
                      <MapPin className="text-ht-slate" size={22} aria-hidden />
                      Live map & tracking
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Active jobs (not completed) show collection and delivery pins. Green dots are drivers sharing location.
                      Positions refresh automatically.
                    </p>
                  </div>
                  <Link to={platformPath("/live-tracking")} className="shrink-0">
                    <Btn variant="outline" className="gap-2 text-sm">
                      <MapPin size={16} aria-hidden />
                      Full live tracking
                    </Btn>
                  </Link>
                </div>
                <div className="px-3 pb-3 pt-0 sm:px-4">
                  <FleetMap jobs={jobs} driverPins={driverPins} />
                </div>
              </Card>

              <Card>
                <div className="flex flex-col gap-3 border-b border-ht-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-ht-navy">All jobs</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {jobs.length} total — in progress first, then scheduled by date, then completed (newest first).
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link to={platformPath("/jobs")}>
                      <Btn variant="outline" className="gap-2 py-1.5 text-sm">
                        <ClipboardList size={16} aria-hidden />
                        Jobs table & export
                      </Btn>
                    </Link>
                    <Link to={platformPath("/jobs/create")}>
                      <Btn className="gap-2 py-1.5 text-sm">
                        <Plus size={16} aria-hidden />
                        New job
                      </Btn>
                    </Link>
                  </div>
                </div>
                <div className="overflow-x-auto p-6 pt-4">
                  <table className="w-full min-w-[920px]">
                    <thead>
                      <tr className="border-b border-ht-border">
                        <th className="px-3 py-3 text-left text-sm font-medium text-gray-600">Job</th>
                        <th className="px-3 py-3 text-left text-sm font-medium text-gray-600">Customer</th>
                        <th className="px-3 py-3 text-left text-sm font-medium text-gray-600">Handler</th>
                        <th className="px-3 py-3 text-left text-sm font-medium text-gray-600">Driver</th>
                        <th className="px-3 py-3 text-left text-sm font-medium text-gray-600">Collection</th>
                        <th className="px-3 py-3 text-left text-sm font-medium text-gray-600">Delivery</th>
                        <th className="px-3 py-3 text-left text-sm font-medium text-gray-600">Coll. date</th>
                        <th className="px-3 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedJobs.map((p) => (
                        <tr key={p.id} className="border-b border-ht-border/60 hover:bg-ht-canvas">
                          <td className="px-3 py-3 text-sm font-medium">
                            <Link
                              to={platformPath(`/jobs/${p.id}`)}
                              className="text-ht-slate hover:underline"
                            >
                              {p.jobNumber}
                            </Link>
                          </td>
                          <td className="max-w-[140px] truncate px-3 py-3 text-sm text-gray-700" title={p.customerName}>
                            {p.customerName}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-700">{p.handler}</td>
                          <td className="max-w-[100px] truncate px-3 py-3 text-sm text-gray-600" title={p.assignedDriverName}>
                            {p.assignedDriverName || "—"}
                          </td>
                          <td className="max-w-[160px] px-3 py-3 text-sm text-gray-700">
                            <span className="line-clamp-2" title={formatAddressSummary(p, "collection", 200)}>
                              {formatAddressSummary(p, "collection", 56) || "—"}
                            </span>
                          </td>
                          <td className="max-w-[160px] px-3 py-3 text-sm text-gray-700">
                            <span className="line-clamp-2" title={formatAddressSummary(p, "delivery", 200)}>
                              {formatAddressSummary(p, "delivery", 56) || "—"}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-700">
                            {new Date(p.collectionDate).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                                p.status === "scheduled"
                                  ? "bg-ht-slate/12 text-ht-slate-dark"
                                  : p.status === "in-progress"
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-green-100 text-green-700"
                              }`}
                            >
                              {p.status === "scheduled"
                                ? "Scheduled"
                                : p.status === "in-progress"
                                  ? "In progress"
                                  : "Completed"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}

          {jobs.length === 0 && (
            <Card className="py-10 text-center">
              <ClipboardList size={44} className="mx-auto mb-3 text-gray-300" />
              <h3 className="mb-1 text-lg font-semibold text-gray-900">No jobs yet</h3>
              <p className="mb-4 text-sm text-gray-600">Create a job to see it here and on the live map.</p>
              <Link to={platformPath("/jobs/create")}>
                <Btn className="gap-2">
                  <Plus size={16} aria-hidden /> Create job
                </Btn>
              </Link>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

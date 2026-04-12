import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeftRight,
  Calendar,
  ClipboardList,
  FileText,
  MapPin,
  Plus,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useJobs } from "../context/JobsContext";
import type { Customer, Driver, Job, Quotation, Vehicle } from "../types";
import { useCustomerArrivalEtaAlerts } from "../hooks/useCustomerArrivalEtaAlerts";
import { formatAddressSummary } from "../lib/jobAddress";
import { jobHasDriverReportedIssue } from "../lib/jobBoardVisual";
import {
  fetchDriverPositionsForMap,
  OFFICE_DRIVER_POSITIONS_POLL_MS,
  officeDriverPositionsPollDescription,
} from "../lib/driverPositionsApi";
import { FleetMap, type FleetDriverPin } from "../components/FleetMap";
import { DashboardSupplierInvoiceMatch } from "../components/DashboardSupplierInvoiceMatch";
import { useFleetDrivingRoutes } from "../hooks/useFleetDrivingRoutes";
import { Btn, Card } from "../components/Layout";
import { platformPath } from "../routes/paths";
import { computeJobGpExVat, effectiveSupplierCostExVat } from "../lib/jobProfit";
import { resolveInvoiceValueExVat } from "../lib/jobNetAmount";
import { QUOTATIONS_STORAGE_KEY, quotationNetExVat } from "../lib/quotationStorage";

function statusRank(s: Job["status"]): number {
  if (s === "in-progress") return 0;
  if (s === "scheduled") return 1;
  return 2;
}

type DashboardMainTab = "operations" | "buySell";

function blendedMarginPct(totalRevenue: number, totalGp: number): number {
  if (!(totalRevenue > 0)) return 0;
  return Math.round((totalGp / totalRevenue) * 10000) / 100;
}

/** Local calendar date from job.collectionDate (YYYY-MM-DD prefix); avoids UTC shift on date-only strings. */
function parseJobCollectionLocalDate(job: Job): Date | null {
  const raw = (job.collectionDate ?? "").trim().slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const d = parseInt(m[3], 10);
  const dt = new Date(y, mo, d, 12, 0, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function startOfCalendarWeekMondayLocal(ref: Date): Date {
  const x = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 12, 0, 0, 0);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return new Date(x.getFullYear(), x.getMonth(), x.getDate(), 12, 0, 0, 0);
}

function endOfCalendarWeekSundayLocal(ref: Date): Date {
  const s = startOfCalendarWeekMondayLocal(ref);
  return new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6, 12, 0, 0, 0);
}

export default function DashboardPage() {
  const [customers] = useLocalStorage<Customer[]>("customers", []);
  const [drivers] = useLocalStorage<Driver[]>("drivers", []);
  const [vehicles] = useLocalStorage<Vehicle[]>("vehicles", []);
  const [quotations] = useLocalStorage<Quotation[]>(QUOTATIONS_STORAGE_KEY, []);
  const [jobs, setJobs] = useJobs();
  const [driverPins, setDriverPins] = useState<FleetDriverPin[]>([]);
  const [mainTab, setMainTab] = useState<DashboardMainTab>("operations");

  const empty = customers.length === 0 && jobs.length === 0;
  const today = new Date();
  const jobsToday = jobs.filter((j) => new Date(j.collectionDate).toDateString() === today.toDateString());
  const completed = jobs.filter((j) => j.status === "completed");
  const scheduled = jobs.filter((j) => j.status === "scheduled");
  const inProgress = jobs.filter((j) => j.status === "in-progress");
  const revenueToday = jobsToday.reduce((s, j) => s + resolveInvoiceValueExVat(j), 0);
  const revenueTotal = jobs.reduce((s, j) => s + resolveInvoiceValueExVat(j), 0);
  const sellExToday = jobsToday.reduce((s, j) => s + (Number(j.sellPrice) || 0), 0);
  const sellExTotal = jobs.reduce((s, j) => s + (Number(j.sellPrice) || 0), 0);
  const buyExToday = jobsToday.reduce((s, j) => s + effectiveSupplierCostExVat(j), 0);
  const buyExTotal = jobs.reduce((s, j) => s + effectiveSupplierCostExVat(j), 0);
  const gpTotal = jobs.reduce((s, j) => s + computeJobGpExVat(j).profit, 0);
  const gpCompleted = completed.reduce((s, j) => s + computeJobGpExVat(j).profit, 0);
  const quotationsApproved = quotations.filter((q) => q.pricesApproved);
  const quotationsValueExVat = quotationsApproved.reduce((s, q) => s + quotationNetExVat(q), 0);
  const revenueJobsToday = jobsToday.reduce((s, j) => s + resolveInvoiceValueExVat(j), 0);
  const gpJobsToday = jobsToday.reduce((s, j) => s + computeJobGpExVat(j).profit, 0);
  const marginJobsToday = blendedMarginPct(revenueJobsToday, gpJobsToday);
  const marginAllJobs = blendedMarginPct(revenueTotal, gpTotal);

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

  const jobPeriodCounts = useMemo(() => {
    const clock = new Date();
    const todayStr = clock.toDateString();
    const nowLocal = new Date(clock.getFullYear(), clock.getMonth(), clock.getDate(), 12, 0, 0, 0);
    const y = nowLocal.getFullYear();
    const month = nowLocal.getMonth();
    const quarterIndex = Math.floor(month / 3);
    const weekStart = startOfCalendarWeekMondayLocal(nowLocal);
    const weekEnd = endOfCalendarWeekSundayLocal(nowLocal);

    let today = 0;
    let week = 0;
    let monthCount = 0;
    let quarter = 0;
    let year = 0;

    for (const j of jobs) {
      if (new Date(j.collectionDate).toDateString() === todayStr) today++;
      const jd = parseJobCollectionLocalDate(j);
      if (!jd) continue;
      if (jd >= weekStart && jd <= weekEnd) week++;
      if (jd.getFullYear() === y && jd.getMonth() === month) monthCount++;
      if (jd.getFullYear() === y && Math.floor(jd.getMonth() / 3) === quarterIndex) quarter++;
      if (jd.getFullYear() === y) year++;
    }

    return {
      today,
      week,
      month: monthCount,
      quarter,
      year,
      quarterLabel: `Q${quarterIndex + 1} ${y}`,
      monthLabel: clock.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
      weekLabel: `${weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${weekEnd.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`,
    };
  }, [jobs]);

  useEffect(() => {
    const tick = () => void fetchDriverPositionsForMap().then(setDriverPins);
    tick();
    const id = setInterval(tick, OFFICE_DRIVER_POSITIONS_POLL_MS);
    return () => clearInterval(id);
  }, []);

  useCustomerArrivalEtaAlerts(jobs, driverPins, setJobs);
  const fleetRoutes = useFleetDrivingRoutes(jobs, driverPins);

  return (
    <div className="space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ht-navy lg:text-3xl">Operations dashboard</h1>
        <p className="mt-1 text-sm text-slate-600 lg:text-base">
          Control tower for transport: every job in one list, live map positions for work in progress, and driver GPS when
          available. Driver positions on the map refresh about every {officeDriverPositionsPollDescription()}.
        </p>
      </div>

      {!empty && (
        <div className="flex flex-wrap gap-2 border-b border-ht-border pb-4" role="tablist" aria-label="Dashboard sections">
          <button
            type="button"
            role="tab"
            aria-selected={mainTab === "operations"}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              mainTab === "operations"
                ? "bg-ht-slate text-white"
                : "border border-ht-border bg-white text-slate-700 hover:bg-ht-canvas"
            }`}
            onClick={() => setMainTab("operations")}
          >
            <ClipboardList size={18} aria-hidden />
            Operations
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mainTab === "buySell"}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              mainTab === "buySell"
                ? "bg-ht-slate text-white"
                : "border border-ht-border bg-white text-slate-700 hover:bg-ht-canvas"
            }`}
            onClick={() => setMainTab("buySell")}
          >
            <ArrowLeftRight size={18} aria-hidden />
            Buy vs sell (ex VAT)
          </button>
        </div>
      )}

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

      {!empty && mainTab === "buySell" && (
        <>
          <p className="text-sm text-slate-600">
            <strong>Buy</strong> is supplier cost (uploaded lines or job buy price). <strong>Sell</strong> is the main transport
            line only. <strong>Customer net</strong> is sell + fuel + extras (or your invoiced-value override) — the figure GP
            and margin use.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Buy (ex VAT) — all jobs</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-gray-900">£{buyExTotal.toFixed(2)}</p>
              <p className="mt-2 text-xs text-slate-500">Today: £{buyExToday.toFixed(2)}</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sell line (ex VAT) — all jobs</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-gray-900">£{sellExTotal.toFixed(2)}</p>
              <p className="mt-2 text-xs text-slate-500">Transport sell only · Today: £{sellExToday.toFixed(2)}</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer net (ex VAT)</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-emerald-800">£{revenueTotal.toFixed(2)}</p>
              <p className="mt-2 text-xs text-slate-500">Today: £{revenueJobsToday.toFixed(2)}</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">GP &amp; blended margin</p>
              <p className={`mt-1 font-mono text-2xl font-semibold ${gpTotal < 0 ? "text-red-600" : "text-gray-900"}`}>
                £{gpTotal.toFixed(2)}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                All jobs: <strong>{marginAllJobs.toFixed(1)}%</strong>
                {jobsToday.length > 0 ? (
                  <>
                    {" "}
                    · Today: <strong>{marginJobsToday.toFixed(1)}%</strong>
                  </>
                ) : null}
              </p>
            </Card>
          </div>

          {jobs.length > 0 ? (
            <Card className="overflow-hidden p-0">
              <div className="border-b border-ht-border px-5 py-4">
                <h2 className="text-lg font-semibold text-ht-navy">Per job — cost vs sell</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Margin % is gross profit ÷ customer net for that job. Rows where buy exceeds customer net are highlighted.
                </p>
              </div>
              <div className="overflow-x-auto p-4 sm:p-5">
                <table className="w-full min-w-[1100px] text-sm">
                  <thead>
                    <tr className="border-b border-ht-border text-left text-xs font-medium uppercase tracking-wide text-slate-600">
                      <th className="px-3 py-2">Job</th>
                      <th className="px-3 py-2">Customer</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2 text-right">Buy (ex VAT)</th>
                      <th className="px-3 py-2 text-right">Sell (ex VAT)</th>
                      <th className="px-3 py-2 text-right">Fuel + extras</th>
                      <th className="px-3 py-2 text-right">Customer net (ex VAT)</th>
                      <th className="px-3 py-2 text-right">GP (ex VAT)</th>
                      <th className="px-3 py-2 text-right">Margin %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedJobs.map((p) => {
                      const buy = effectiveSupplierCostExVat(p);
                      const sellLine = Number(p.sellPrice) || 0;
                      const fuel = Number(p.fuelSurcharge) || 0;
                      const extra = Number(p.extraCharges) || 0;
                      const fuelExtra = fuel + extra;
                      const net = resolveInvoiceValueExVat(p);
                      const gpRow = computeJobGpExVat(p);
                      const lossRow = buy > net + 0.005;
                      const gpCls =
                        gpRow.profit < 0 ? "text-red-600" : gpRow.profit < 50 ? "text-orange-600" : "text-green-700";
                      return (
                        <tr
                          key={p.id}
                          className={`border-b border-ht-border/60 hover:bg-ht-canvas/50 ${lossRow ? "bg-red-50/70" : ""}`}
                        >
                          <td className="px-3 py-2.5 font-medium">
                            <Link to={platformPath(`/jobs/${p.id}`)} className="text-ht-slate hover:underline">
                              {p.jobNumber}
                            </Link>
                          </td>
                          <td className="max-w-[140px] truncate px-3 py-2.5 text-gray-700" title={p.customerName}>
                            {p.customerName}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-gray-600">
                            {p.status === "completed" ? "Completed" : p.status === "in-progress" ? "In progress" : "Scheduled"}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono">£{buy.toFixed(2)}</td>
                          <td className="px-3 py-2.5 text-right font-mono">£{sellLine.toFixed(2)}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-slate-700">£{fuelExtra.toFixed(2)}</td>
                          <td className="px-3 py-2.5 text-right font-mono font-medium text-emerald-900">£{net.toFixed(2)}</td>
                          <td className={`px-3 py-2.5 text-right font-mono font-semibold ${gpCls}`}>£{gpRow.profit.toFixed(2)}</td>
                          <td className={`px-3 py-2.5 text-right font-mono font-medium ${gpCls}`}>{gpRow.margin.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <Card className="py-10 text-center">
              <ClipboardList size={44} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-gray-600">No jobs yet — create a job to compare buy and sell here.</p>
              <Link to={platformPath("/jobs/create")} className="mt-4 inline-block">
                <Btn className="gap-2">
                  <Plus size={16} aria-hidden /> Create job
                </Btn>
              </Link>
            </Card>
          )}
        </>
      )}

      {!empty && mainTab === "operations" && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-6">
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
                <h2 className="text-sm font-medium text-slate-600">Customer net (ex VAT)</h2>
                <span className="text-[#10B981]" aria-hidden>
                  £
                </span>
              </div>
              <div className="px-6 pb-6 pt-2">
                <div className="mb-4 text-3xl font-semibold text-gray-900">£{revenueToday.toFixed(2)}</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Today (jobs today)</span>
                    <span className="text-sm font-medium">£{revenueToday.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">All jobs total</span>
                    <span className="text-sm font-medium">£{revenueTotal.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-ht-border/80 pt-2">
                    <p className="mb-1 text-xs font-medium text-gray-500">Sell (ex VAT)</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Today</span>
                      <span className="font-mono font-medium">£{sellExToday.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">All jobs</span>
                      <span className="font-mono font-medium">£{sellExTotal.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="border-t border-ht-border/80 pt-2">
                    <p className="mb-1 text-xs font-medium text-gray-500">Buy (ex VAT)</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Today</span>
                      <span className="font-mono font-medium">£{buyExToday.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">All jobs</span>
                      <span className="font-mono font-medium">£{buyExTotal.toFixed(2)}</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Buy = supplier invoice lines total or job buy price.</p>
                  </div>
                  <p className="text-xs text-gray-500">Net = sell + fuel + extras, or invoiced-value override per job.</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex flex-row items-center justify-between border-b border-ht-border px-6 pb-2 pt-6">
                <h2 className="text-sm font-medium text-slate-600">Gross profit (ex VAT)</h2>
                <TrendingUp className="text-ht-slate" size={20} aria-hidden />
              </div>
              <div className="px-6 pb-6 pt-2">
                <div
                  className={`mb-4 text-3xl font-semibold ${gpTotal < 0 ? "text-red-600" : "text-gray-900"}`}
                >
                  £{gpTotal.toFixed(2)}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">All jobs</span>
                    <span className="text-sm font-medium">£{gpTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Completed only</span>
                    <span className="text-sm font-medium">£{gpCompleted.toFixed(2)}</span>
                  </div>
                  <Link
                    to={platformPath("/supplier-invoicing")}
                    className="inline-block text-xs font-medium text-ht-slate underline"
                  >
                    Supplier invoicing
                  </Link>
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

          <Card>
            <div className="flex flex-col gap-1 border-b border-ht-border px-6 pb-3 pt-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 shrink-0 text-ht-slate" size={22} aria-hidden />
                <div>
                  <h2 className="text-lg font-semibold text-ht-navy">Jobs by collection date</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Counts use each job&apos;s <strong>collection date</strong> in your local calendar. Week runs{" "}
                    <strong>Monday–Sunday</strong>. Quarter is calendar Jan–Mar, Apr–Jun, Jul–Sep, Oct–Dec.
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    This week: {jobPeriodCounts.weekLabel} · This month: {jobPeriodCounts.monthLabel} ·{" "}
                    {jobPeriodCounts.quarterLabel}
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 px-6 py-5 sm:grid-cols-3 lg:grid-cols-5">
              <div className="rounded-lg border border-ht-border bg-ht-canvas/40 p-4 text-center">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Today</div>
                <div className="mt-1 text-3xl font-semibold text-gray-900">{jobPeriodCounts.today}</div>
              </div>
              <div className="rounded-lg border border-ht-border bg-ht-canvas/40 p-4 text-center">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">This week</div>
                <div className="mt-1 text-3xl font-semibold text-gray-900">{jobPeriodCounts.week}</div>
              </div>
              <div className="rounded-lg border border-ht-border bg-ht-canvas/40 p-4 text-center">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">This month</div>
                <div className="mt-1 text-3xl font-semibold text-gray-900">{jobPeriodCounts.month}</div>
              </div>
              <div className="rounded-lg border border-ht-border bg-ht-canvas/40 p-4 text-center">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">This quarter</div>
                <div className="mt-1 text-3xl font-semibold text-gray-900">{jobPeriodCounts.quarter}</div>
              </div>
              <div className="rounded-lg border border-ht-border bg-ht-canvas/40 p-4 text-center">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">This year</div>
                <div className="mt-1 text-3xl font-semibold text-gray-900">{jobPeriodCounts.year}</div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex flex-col gap-3 border-b border-ht-border px-6 pb-2 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-medium text-slate-600">Quotations</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Website and office quotes — values below are approved net (ex VAT) only.
                </p>
              </div>
              <Link to={platformPath("/quotations")} className="shrink-0">
                <Btn variant="outline" className="gap-2 text-sm">
                  <FileText size={16} aria-hidden />
                  Open quotations
                </Btn>
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 px-6 pb-6 pt-4 sm:grid-cols-3">
              <div>
                <div className="text-2xl font-semibold text-gray-900">{quotations.length}</div>
                <div className="text-sm text-gray-600">Logged</div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-gray-900">{quotationsApproved.length}</div>
                <div className="text-sm text-gray-600">Approved (priced)</div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-gray-900">£{quotationsValueExVat.toFixed(2)}</div>
                <div className="text-sm text-gray-600">Approved total ex VAT</div>
              </div>
            </div>
          </Card>

          {jobs.length > 0 && <DashboardSupplierInvoiceMatch jobs={jobs} />}

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
                      Active jobs use job board colours on the map; amber shows collection→delivery on roads (or a dashed
                      straight line while routing loads); blue shows a matched driver’s route to delivery with ETA when
                      available. Green dots are drivers sharing location. Positions refresh automatically.
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
                  <FleetMap jobs={jobs} driverPins={driverPins} fleetRoutes={fleetRoutes} fleetVehicles={vehicles} />
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
                  <table className="w-full min-w-[1320px]">
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
                        <th className="px-3 py-3 text-right text-sm font-medium text-gray-600">Sell ex VAT</th>
                        <th className="px-3 py-3 text-right text-sm font-medium text-gray-600">Buy ex VAT</th>
                        <th className="px-3 py-3 text-right text-sm font-medium text-gray-600">Net ex VAT</th>
                        <th className="px-3 py-3 text-right text-sm font-medium text-gray-600">GP</th>
                        <th className="px-3 py-3 text-right text-sm font-medium text-gray-600">Margin %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedJobs.map((p) => {
                        const sellEx = Number(p.sellPrice) || 0;
                        const net = resolveInvoiceValueExVat(p);
                        const sc = effectiveSupplierCostExVat(p);
                        const gpInfo = computeJobGpExVat(p);
                        const gpv = gpInfo.profit;
                        const gpCls =
                          gpv < 0 ? "text-red-600" : gpv < 50 ? "text-orange-600" : "text-green-700";
                        return (
                        <tr key={p.id} className="border-b border-ht-border/60 hover:bg-ht-canvas">
                          <td className="px-3 py-3 text-sm font-medium">
                            <div className="flex items-center gap-1.5">
                              <Link
                                to={platformPath(`/jobs/${p.id}`)}
                                className="text-ht-slate hover:underline"
                              >
                                {p.jobNumber}
                              </Link>
                              {jobHasDriverReportedIssue(p) ? (
                                <span title="Driver reported an issue" className="text-red-600">
                                  <AlertTriangle className="h-4 w-4" aria-hidden />
                                </span>
                              ) : null}
                            </div>
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
                          <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-sm text-gray-800">
                            £{sellEx.toFixed(2)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-sm text-gray-800">
                            £{sc.toFixed(2)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-sm text-gray-800">
                            £{net.toFixed(2)}
                          </td>
                          <td className={`whitespace-nowrap px-3 py-3 text-right font-mono text-sm font-semibold ${gpCls}`}>
                            £{gpv.toFixed(2)}
                          </td>
                          <td className={`whitespace-nowrap px-3 py-3 text-right font-mono text-sm font-medium ${gpCls}`}>
                            {gpInfo.margin.toFixed(1)}%
                          </td>
                        </tr>
                        );
                      })}
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

import { Link } from "react-router-dom";
import { ClipboardList, Plus, Truck, Users } from "lucide-react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import type { Customer, Job } from "../types";
import { Btn, Card } from "../components/Layout";

export default function DashboardPage() {
  const [customers] = useLocalStorage<Customer[]>("customers", []);
  const [drivers] = useLocalStorage("drivers", [] as { id: number }[]);
  const [vehicles] = useLocalStorage("vehicles", [] as { id: number }[]);
  const [jobs] = useLocalStorage<Job[]>("jobs", []);

  const empty = customers.length === 0 && jobs.length === 0;
  const today = new Date();
  const jobsToday = jobs.filter((j) => new Date(j.collectionDate).toDateString() === today.toDateString());
  const completed = jobs.filter((j) => j.status === "completed");
  const scheduled = jobs.filter((j) => j.status === "scheduled");
  const inProgress = jobs.filter((j) => j.status === "in-progress");
  const revenueToday = jobsToday.reduce((s, j) => s + (Number(j.sellPrice) || 0), 0);
  const revenueTotal = jobs.reduce((s, j) => s + (Number(j.sellPrice) || 0), 0);
  const upcoming = jobs
    .filter((j) => j.status === "scheduled")
    .sort((a, b) => new Date(a.collectionDate).getTime() - new Date(b.collectionDate).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 lg:text-3xl">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500 lg:text-base">Welcome back, here&apos;s what&apos;s happening today</p>
      </div>

      {empty && (
        <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#2563EB]">
              <Truck size={24} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="mb-2 text-xl font-semibold text-gray-900">🎉 Welcome! Let&apos;s Get You Started</h3>
              <p className="mb-4 text-gray-700">
                Your transport system is ready! Follow these 3 quick steps to start managing your business:
              </p>
              <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <Link to="/customers" className="block rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md">
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
                <Link to="/drivers-vehicles" className="block rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md">
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
                <Link to="/jobs/create" className="block rounded-lg border border-blue-200 bg-blue-50 p-4 transition-shadow hover:shadow-md">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                      3
                    </div>
                    <ClipboardList size={20} className="text-blue-600" />
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
              <div className="flex flex-row items-center justify-between border-b border-gray-100 px-6 pb-2 pt-6">
                <h2 className="text-sm font-medium text-gray-600">Jobs Today</h2>
                <ClipboardList className="text-[#2563EB]" size={20} />
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
                    <span className="text-sm font-medium text-blue-600">{scheduled.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">In Progress</span>
                    <span className="text-sm font-medium text-orange-600">{inProgress.length}</span>
                  </div>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex flex-row items-center justify-between border-b border-gray-100 px-6 pb-2 pt-6">
                <h2 className="text-sm font-medium text-gray-600">Revenue</h2>
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
              <div className="flex flex-row items-center justify-between border-b border-gray-100 px-6 pb-2 pt-6">
                <h2 className="text-sm font-medium text-gray-600">System Overview</h2>
                <Users className="text-[#2563EB]" size={20} />
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

          {upcoming.length > 0 && (
            <Card>
              <div className="flex flex-row items-center justify-between border-b border-gray-100 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">Upcoming Jobs</h2>
                <Link to="/jobs">
                  <Btn variant="outline" className="gap-2 py-1.5 text-sm">
                    <ClipboardList size={16} />
                    <span className="hidden sm:inline">View All Jobs</span>
                  </Btn>
                </Link>
              </div>
              <div className="overflow-x-auto p-6 pt-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Job Number</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Customer</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Collection</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Delivery</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcoming.map((p) => (
                      <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.jobNumber}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{p.customerName}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{p.collectionLocation}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{p.deliveryLocation}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {new Date(p.collectionDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                              p.status === "scheduled"
                                ? "bg-blue-100 text-blue-700"
                                : p.status === "in-progress"
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-green-100 text-green-700"
                            }`}
                          >
                            {p.status === "scheduled"
                              ? "Scheduled"
                              : p.status === "in-progress"
                                ? "In Progress"
                                : "Completed"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {upcoming.length === 0 && jobs.length > 0 && (
            <Card className="py-12 text-center">
              <ClipboardList size={48} className="mx-auto mb-4 text-gray-300" />
              <h3 className="mb-2 text-lg font-semibold text-gray-900">No Upcoming Jobs</h3>
              <p className="mb-4 text-gray-600">All your jobs are completed or in progress.</p>
              <Link to="/jobs/create">
                <Btn className="gap-2">
                  <Plus size={16} /> Create New Job
                </Btn>
              </Link>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

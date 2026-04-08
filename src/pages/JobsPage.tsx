import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Plus, Search } from "lucide-react";
import { useJobs } from "../context/JobsContext";
import type { Job } from "../types";
import { Btn, Card } from "../components/Layout";
import { prependBrandedCsvPreamble } from "../lib/companyBrand";
import { platformPath } from "../routes/paths";

function exportCsv(rows: Job[]) {
  const headers = [
    "Job Number",
    "Handler",
    "Collection",
    "Delivery",
    "Customer",
    "Status",
    "Buy (EX)",
    "Sell (EX)",
    "Fuel",
    "Profit",
    "Margin %",
    "Carrier",
    "Truck Plates",
    "Route",
    "POD",
    "Invoice Sent",
    "Supplier Due",
    "Invoice Received",
  ];
  const lines = rows.map((y) =>
    [
      y.jobNumber,
      y.handler,
      y.collectionDate,
      y.deliveryDate || "",
      y.customerName,
      y.status,
      y.buyPrice || 0,
      y.sellPrice || 0,
      y.fuelSurcharge || 0,
      y.profit || 0,
      y.margin || 0,
      y.carrier || "",
      y.truckPlates || "",
      y.routeType || "",
      y.podReceived === "yes" ? "Yes" : "No",
      y.invoiceSent === "yes" ? "Yes" : "No",
      y.supplierDueDate || "",
      y.supplierInvoiceReceived === "yes" ? "Yes" : "No",
    ].join(",")
  );
  const csv = [...prependBrandedCsvPreamble(headers), headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `transport-jobs-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function JobsPage() {
  const [jobs] = useJobs();
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q.trim()) return jobs;
    const s = q.toLowerCase();
    return jobs.filter((j) => Object.values(j).some((v) => String(v).toLowerCase().includes(s)));
  }, [jobs, q]);

  const profitClass = (d: number) =>
    d >= 200 ? "text-green-700 bg-green-50" : d >= 50 ? "text-amber-600 bg-amber-50" : "text-red-700 bg-red-50";
  const marginClass = (d: number) =>
    d >= 25 ? "text-green-700" : d >= 15 ? "text-amber-600" : "text-red-700";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search all columns..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-9 w-full rounded-lg border border-ht-border bg-white py-2 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ht-slate/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <Btn
            variant="outline"
            className="h-9 gap-2 py-1.5 text-sm"
            disabled={jobs.length === 0}
            onClick={() => exportCsv(filtered)}
          >
            <Download size={16} /> Export CSV
          </Btn>
          <Link to={platformPath("/jobs/create")}>
            <Btn className="h-9 gap-2 py-1.5 text-sm">
              <Plus size={16} /> New Job
            </Btn>
          </Link>
        </div>
      </div>

      {jobs.length === 0 && (
        <Card className="py-12 text-center">
          <p className="mb-4 text-gray-600">No jobs yet — create your first job.</p>
          <Link to={platformPath("/jobs/create")}>
            <Btn className="gap-2">
              <Plus size={16} /> Create Job
            </Btn>
          </Link>
        </Card>
      )}

      {jobs.length > 0 && (
        <>
          <div className="overflow-x-auto border border-gray-300 bg-white">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-300 bg-gray-100">
                  <th className="sticky left-0 z-20 min-w-[110px] border-r border-gray-300 bg-gray-100 px-3 py-2.5 text-left text-xs font-semibold text-gray-700">
                    Job Number
                  </th>
                  <th className="min-w-[80px] border-r border-gray-300 px-3 py-2.5 text-left text-xs font-semibold text-gray-700">
                    Handler
                  </th>
                  <th className="min-w-[90px] border-r border-gray-300 px-3 py-2.5 text-left text-xs font-semibold text-gray-700">
                    Collection
                  </th>
                  <th className="min-w-[90px] border-r border-gray-300 px-3 py-2.5 text-left text-xs font-semibold text-gray-700">
                    Delivery
                  </th>
                  <th className="min-w-[120px] border-r border-gray-300 px-3 py-2.5 text-left text-xs font-semibold text-gray-700">
                    Customer
                  </th>
                  <th className="min-w-[100px] border-r border-gray-300 px-3 py-2.5 text-left text-xs font-semibold text-gray-700">
                    Job Status
                  </th>
                  <th className="min-w-[85px] border-r border-gray-300 px-3 py-2.5 text-right text-xs font-semibold text-gray-700">
                    Buy (EX)
                  </th>
                  <th className="min-w-[85px] border-r border-gray-300 px-3 py-2.5 text-right text-xs font-semibold text-gray-700">
                    Sell (EX)
                  </th>
                  <th className="min-w-[80px] border-r border-gray-300 px-3 py-2.5 text-right text-xs font-semibold text-gray-700">
                    Profit
                  </th>
                  <th className="min-w-[75px] border-r border-gray-300 px-3 py-2.5 text-right text-xs font-semibold text-gray-700">
                    Margin %
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d, h) => (
                  <tr
                    key={d.id}
                    className={`border-b border-ht-border transition-colors hover:bg-ht-slate/[0.04] ${
                      h % 2 === 0 ? "bg-white" : "bg-gray-50"
                    }`}
                  >
                    <td className="sticky left-0 z-10 border-r border-gray-200 bg-inherit px-3 py-2 text-xs font-medium">
                      <Link to={platformPath(`/jobs/${d.id}`)} className="font-medium text-ht-slate hover:underline">
                        {d.jobNumber}
                      </Link>
                    </td>
                    <td className="border-r border-gray-200 px-3 py-2 text-xs text-gray-700">{d.handler}</td>
                    <td className="border-r border-gray-200 px-3 py-2 text-xs text-gray-700">
                      {new Date(d.collectionDate).toLocaleDateString()}
                    </td>
                    <td className="border-r border-gray-200 px-3 py-2 text-xs text-gray-700">
                      {d.deliveryDate ? new Date(d.deliveryDate).toLocaleDateString() : "-"}
                    </td>
                    <td className="border-r border-gray-200 px-3 py-2 text-xs text-gray-700">{d.customerName}</td>
                    <td className="border-r border-gray-200 px-3 py-2 text-xs">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                          d.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : d.status === "in-progress"
                              ? "bg-ht-slate/15 text-ht-slate-dark"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {d.status === "completed"
                          ? "Completed"
                          : d.status === "in-progress"
                            ? "In Progress"
                            : "Scheduled"}
                      </span>
                    </td>
                    <td className="border-r border-gray-200 px-3 py-2 text-right font-mono text-xs text-gray-700">
                      £{parseFloat(String(d.buyPrice || 0)).toFixed(2)}
                    </td>
                    <td className="border-r border-gray-200 px-3 py-2 text-right font-mono text-xs text-gray-700">
                      £{parseFloat(String(d.sellPrice || 0)).toFixed(2)}
                    </td>
                    <td
                      className={`border-r border-gray-200 px-3 py-2 text-right font-mono text-xs font-semibold ${profitClass(
                        parseFloat(String(d.profit || 0))
                      )}`}
                    >
                      £{parseFloat(String(d.profit || 0)).toFixed(2)}
                    </td>
                    <td
                      className={`border-r border-gray-200 px-3 py-2 text-right font-mono text-xs font-semibold ${marginClass(
                        parseFloat(String(d.margin || 0))
                      )}`}
                    >
                      {parseFloat(String(d.margin || 0)).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-400 bg-gray-100 font-semibold">
                  <td className="sticky left-0 z-10 border-r border-gray-300 bg-gray-100 px-3 py-2.5 text-xs text-gray-700">
                    TOTAL ({filtered.length} jobs)
                  </td>
                  <td colSpan={5} className="border-r border-gray-300" />
                  <td className="border-r border-gray-300 px-3 py-2.5 text-right font-mono text-xs">
                    £{filtered.reduce((s, j) => s + parseFloat(String(j.buyPrice || 0)), 0).toFixed(2)}
                  </td>
                  <td className="border-r border-gray-300 px-3 py-2.5 text-right font-mono text-xs">
                    £{filtered.reduce((s, j) => s + parseFloat(String(j.sellPrice || 0)), 0).toFixed(2)}
                  </td>
                  <td className="border-r border-gray-300 px-3 py-2.5 text-right font-mono text-xs">
                    £{filtered.reduce((s, j) => s + parseFloat(String(j.profit || 0)), 0).toFixed(2)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          {filtered.length === 0 && jobs.length > 0 && (
            <p className="py-8 text-center text-gray-500">No jobs found matching your search criteria</p>
          )}
          <div className="flex flex-wrap items-center gap-6 rounded border border-gray-300 bg-gray-50 px-4 py-3 text-xs text-gray-600">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">Profit Legend:</span>
              <span className="rounded bg-green-50 px-2 py-1 text-green-700">£200+ = Excellent</span>
              <span className="rounded bg-amber-50 px-2 py-1 text-amber-600">£50-199 = Good</span>
              <span className="rounded bg-red-50 px-2 py-1 text-red-700">&lt;£50 = Low</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-l border-gray-300 pl-6">
              <span className="font-semibold">Margin Legend:</span>
              <span className="text-green-700">25%+ Excellent</span>
              <span className="text-amber-600">15-24% Good</span>
              <span className="text-red-700">&lt;15% Low</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

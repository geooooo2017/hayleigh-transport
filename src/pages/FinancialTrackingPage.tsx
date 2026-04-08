import { Download } from "lucide-react";
import { toast } from "sonner";
import { financeLedgerSeed } from "../data/financeLedger";
import { Btn, Card } from "../components/Layout";
import { prependBrandedCsvPreamble } from "../lib/companyBrand";

export default function FinancialTrackingPage() {
  const rows = financeLedgerSeed;

  const exportCsv = () => {
    if (rows.length === 0) {
      toast.message("Nothing to export", { description: "Add ledger data first." });
      return;
    }
    const headers = ["Job", "Customer", "Quoted", "Actual", "Status", "Payment"];
    const lines = rows.map((r) =>
      [r.jobNumber, r.customer, r.quoted, r.actual, r.status, r.paymentStatus].join(",")
    );
    const csv = [...prependBrandedCsvPreamble(headers), headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `job-finance-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Job details exported");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 lg:text-3xl">Financial Tracking</h1>
          <p className="mt-1 text-gray-500">Quoted vs actual and billing status by job</p>
        </div>
        <Btn className="gap-2" onClick={exportCsv} disabled={rows.length === 0}>
          <Download size={16} /> Export CSV
        </Btn>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-700">
              <th className="px-4 py-3">Job</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Handler</th>
              <th className="px-4 py-3">Quoted</th>
              <th className="px-4 py-3">Actual</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Payment</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center text-gray-500">
                  No financial tracking rows yet. Data will appear here when connected to your jobs or accounting
                  feed.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.jobNumber} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-ht-slate">{r.jobNumber}</td>
                  <td className="px-4 py-3 text-gray-700">{r.customer}</td>
                  <td className="px-4 py-3 text-gray-600">{r.handler}</td>
                  <td className="px-4 py-3">{r.quoted}</td>
                  <td className="px-4 py-3">{r.actual}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        r.status === "billed" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.paymentStatus}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

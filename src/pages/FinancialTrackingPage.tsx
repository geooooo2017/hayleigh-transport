import { Download } from "lucide-react";
import { toast } from "sonner";
import { financeLedgerSeed } from "../data/financeLedger";
import { Btn, Card } from "../components/Layout";

export default function FinancialTrackingPage() {
  const exportCsv = () => {
    const headers = ["Job", "Customer", "Quoted", "Actual", "Status", "Payment"];
    const rows = financeLedgerSeed.map((r) =>
      [r.jobNumber, r.customer, r.quoted, r.actual, r.status, r.paymentStatus].join(",")
    );
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv" });
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
        <Btn className="gap-2" onClick={exportCsv}>
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
            {financeLedgerSeed.map((r) => (
              <tr key={r.jobNumber} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-[#2563EB]">{r.jobNumber}</td>
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
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

import { useMemo } from "react";
import { toast } from "sonner";
import { AlertTriangle, Mail, Printer, Send } from "lucide-react";
import { useJobs } from "../context/JobsContext";
import { Btn, Card } from "../components/Layout";
import { escapeHtml, printPaperwork } from "../lib/printPaperwork";

export default function CustomerInvoicingPage() {
  const [jobs] = useJobs();
  const pending = useMemo(
    () => jobs.filter((j) => j.invoiceSent !== "yes" && j.status === "completed"),
    [jobs]
  );
  const pendingValue = pending.reduce((s, j) => s + (Number(j.sellPrice) || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 lg:text-3xl">Customer Invoicing</h1>
        <p className="mt-1 text-gray-500">Draft and send invoices linked to completed jobs</p>
      </div>

      <Card className="border-2 border-amber-200 bg-amber-50 p-6">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 flex-shrink-0 text-amber-600" size={24} />
          <div className="flex-1">
            <h3 className="mb-1 font-semibold text-gray-900">
              {pending.length} Jobs Require Invoicing
            </h3>
            <p className="mb-4 text-sm text-gray-700">
              Total value: £{pendingValue.toLocaleString()} ex VAT (demo calculation)
            </p>
            <div className="flex flex-wrap gap-2">
              <Btn
                className="gap-2"
                onClick={() =>
                  toast.success("Invoices generated", { description: "Draft PDFs added to queue (demo)." })
                }
              >
                <Send size={14} /> Generate All Pending Invoices
              </Btn>
              <Btn
                variant="outline"
                className="gap-2"
                onClick={() => toast.success("Emails queued", { description: "Draft invoices emailed (demo)." })}
              >
                <Mail size={14} /> Send All Draft Invoices
              </Btn>
              <Btn
                variant="outline"
                className="gap-2"
                onClick={() => {
                  const rowHtml = jobs
                    .slice(0, 50)
                    .map(
                      (j) =>
                        `<tr><td>${escapeHtml(j.jobNumber)}</td><td>${escapeHtml(j.customerName)}</td><td>£${Number(j.sellPrice).toFixed(2)}</td><td>${j.invoiceSent === "yes" ? "Sent" : "Draft"}</td></tr>`
                    )
                    .join("");
                  const ok = printPaperwork({
                    title: "Customer invoicing — job listing",
                    contentHtml: `
                      <table style="width:100%;border-collapse:collapse;font-size:13px">
                        <thead><tr>
                          <th style="border:1px solid #e5e7eb;padding:8px;text-align:left;background:#f9fafb">Job</th>
                          <th style="border:1px solid #e5e7eb;padding:8px;text-align:left;background:#f9fafb">Customer</th>
                          <th style="border:1px solid #e5e7eb;padding:8px;text-align:left;background:#f9fafb">Amount (ex VAT)</th>
                          <th style="border:1px solid #e5e7eb;padding:8px;text-align:left;background:#f9fafb">Invoice</th>
                        </tr></thead>
                        <tbody>${rowHtml || `<tr><td colspan="4" style="border:1px solid #e5e7eb;padding:12px">No jobs</td></tr>`}</tbody>
                      </table>`,
                  });
                  if (ok) toast.success("Opening print preview", { description: "Use print to save as PDF." });
                  else toast.error("Pop-up blocked", { description: "Allow pop-ups for this site to print." });
                }}
              >
                <Printer size={14} /> Print listing
              </Btn>
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-700">
              <th className="px-4 py-3">Job</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Amount (ex VAT)</th>
              <th className="px-4 py-3">Invoice</th>
            </tr>
          </thead>
          <tbody>
            {jobs.slice(0, 20).map((j) => (
              <tr key={j.id} className="border-b border-gray-100">
                <td className="px-4 py-3 font-medium">{j.jobNumber}</td>
                <td className="px-4 py-3 text-gray-700">{j.customerName}</td>
                <td className="px-4 py-3">£{Number(j.sellPrice).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      j.invoiceSent === "yes" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {j.invoiceSent === "yes" ? "Sent" : "Draft"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {jobs.length === 0 && <p className="p-8 text-center text-gray-500">No jobs to invoice yet.</p>}
      </Card>
    </div>
  );
}

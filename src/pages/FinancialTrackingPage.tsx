import { Download } from "lucide-react";
import { Link } from "react-router-dom";
import { notifyMessage, notifySuccess } from "../lib/platformNotify";
import { platformPath } from "../routes/paths";
import { financeLedgerSeed } from "../data/financeLedger";
import { Btn, Card } from "../components/Layout";
import { WhyThisSection } from "../components/FormGuidance";
import { useAuth } from "../context/AuthContext";
import { prependBrandedCsvPreamble } from "../lib/companyBrand";
import { getUserCompanyDetails } from "../lib/userCompanyProfile";

export default function FinancialTrackingPage() {
  const { user } = useAuth();
  const rows = financeLedgerSeed;

  const exportCsv = () => {
    if (rows.length === 0) {
      notifyMessage("Nothing to export", {
        description: "There are no rows in the table yet.",
        href: platformPath("/financial-tracking"),
      });
      return;
    }
    const headers = ["Job", "Customer", "Handler", "Quoted", "Actual", "Status", "Payment"];
    const lines = rows.map((r) =>
      [r.jobNumber, r.customer, r.handler, r.quoted, r.actual, r.status, r.paymentStatus].join(",")
    );
    const csv = [
      ...prependBrandedCsvPreamble(headers, getUserCompanyDetails(user?.id), user?.name),
      headers.join(","),
      ...lines,
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `job-finance-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notifySuccess("Financial tracking exported", { href: platformPath("/financial-tracking") });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 lg:text-3xl">Financial Tracking</h1>
          <p className="mt-1 text-gray-500">
            Accounts-style overview: quoted vs actual money and billing / payment status, one row per job (when populated).
          </p>
        </div>
        <Btn className="gap-2" onClick={exportCsv} disabled={rows.length === 0}>
          <Download size={16} /> Export CSV
        </Btn>
      </div>

      <WhyThisSection>
        This screen is meant for finance and operations to scan jobs quickly—what was quoted, what happened in practice,
        whether the customer has been invoiced, and payment state—without opening every job. It is separate from live job
        operations (routes, POD, driver app). Optional invoice-financing costings (Bibby-style terms) stay on each job and
        in Settings; this table does not talk to Bibby or your bank—it is only a summary view once data is wired in.
      </WhyThisSection>

      <Card className="space-y-4 border border-gray-200 bg-gray-50/80 p-5 text-sm text-gray-700 shadow-sm">
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Column guide</h2>
          <ul className="list-inside list-disc space-y-1.5 text-gray-600">
            <li>
              <span className="font-medium text-gray-800">Job / Customer / Handler</span> — which job and who booked it.
            </li>
            <li>
              <span className="font-medium text-gray-800">Quoted</span> — agreed or quoted sell side (planned revenue).
            </li>
            <li>
              <span className="font-medium text-gray-800">Actual</span> — final or adjusted figures once known (e.g. after
              extras or corrections).
            </li>
            <li>
              <span className="font-medium text-gray-800">Status</span> — billing step (e.g. whether invoiced).
            </li>
            <li>
              <span className="font-medium text-gray-800">Payment</span> — customer payment state (e.g. paid / outstanding).
            </li>
          </ul>
        </div>
        <div className="border-t border-gray-200 pt-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Where to work today</h2>
          <p className="text-gray-600">
            Sell and buy prices, invoice sent, customer payment date, and supplier invoice flags are entered on each job
            under{" "}
            <Link className="font-medium text-ht-slate underline" to={platformPath("/jobs")}>
              Jobs
            </Link>
            . Use{" "}
            <Link className="font-medium text-ht-slate underline" to={platformPath("/supplier-invoicing")}>
              Supplier invoicing
            </Link>{" "}
            for supplier documents, linked customer refs, and GP. Use <strong>Export CSV</strong> here when this table has
            rows to share a simple sheet with accounts.
          </p>
        </div>
      </Card>

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
                <td colSpan={7} className="px-4 py-16 text-center text-gray-600">
                  <p className="mx-auto max-w-lg text-base font-medium text-gray-800">No rows to show yet</p>
                  <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed">
                    The table is not yet filled from your live jobs. When it is connected, each row will summarise one
                    job for finance (quoted vs actual and billing / payment). Until then, use{" "}
                    <Link className="font-medium text-ht-slate underline" to={platformPath("/jobs")}>
                      Jobs
                    </Link>{" "}
                    and open a job for prices and register fields.
                  </p>
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

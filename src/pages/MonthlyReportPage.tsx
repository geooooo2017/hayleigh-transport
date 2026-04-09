import { useState } from "react";
import { notifyError, notifySuccess } from "../lib/platformNotify";
import { platformPath } from "../routes/paths";
import { FileBarChart } from "lucide-react";
import { Btn, Card } from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { getUserCompanyDetails } from "../lib/userCompanyProfile";
import { escapeHtml, printPaperwork } from "../lib/printPaperwork";

export default function MonthlyReportPage() {
  const { user } = useAuth();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [notes, setNotes] = useState("");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900 lg:text-3xl">
          <FileBarChart className="text-ht-slate" />
          Monthly Report
        </h1>
        <p className="mt-1 text-gray-500">Compile a management summary for any month</p>
      </div>

      <Card className="space-y-4 p-6">
        <div>
          <label className="mb-1 block text-sm font-medium">Report month</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Notes / highlights</label>
          <textarea
            rows={5}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2"
            placeholder="Fuel trends, major customers, incidents…"
          />
        </div>
        <Btn
          onClick={() => {
            const ok = printPaperwork({
              title: `Monthly report — ${month}`,
              companyDetails: getUserCompanyDetails(user?.id),
              preparedBy: user?.name,
              contentHtml: `
                <p style="margin:0 0 12px;font-size:14px;color:#374151"><strong>Report month:</strong> ${escapeHtml(month)}</p>
                <p style="margin:0 0 8px;font-size:13px;font-weight:600">Notes / highlights</p>
                <div style="white-space:pre-wrap;font-size:13px;line-height:1.5;border:1px solid #e5e7eb;border-radius:8px;padding:12px">${notes.trim() ? escapeHtml(notes) : "—"}</div>
              `,
            });
            if (ok)
              notifySuccess("Opening print preview", {
                description: "Use your browser print dialog to save as PDF.",
                href: platformPath("/monthly-report"),
              });
            else notifyError("Pop-up blocked", { description: "Allow pop-ups for this site to print the report." });
          }}
        >
          Print / Save as PDF
        </Btn>
      </Card>
    </div>
  );
}

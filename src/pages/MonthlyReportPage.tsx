import { useState } from "react";
import { toast } from "sonner";
import { FileBarChart } from "lucide-react";
import { Btn, Card } from "../components/Layout";

export default function MonthlyReportPage() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [notes, setNotes] = useState("");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900 lg:text-3xl">
          <FileBarChart className="text-[#2563EB]" />
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
          onClick={() =>
            toast.success("Report generated", {
              description: `Monthly pack for ${month} saved to downloads (demo).`,
            })
          }
        >
          Generate PDF (demo)
        </Btn>
      </Card>
    </div>
  );
}

import { useMemo } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import type { Job } from "../types";
import { Card } from "../components/Layout";

export default function StatisticsPage() {
  const [jobs] = useLocalStorage<Job[]>("jobs", []);

  const byCustomer = useMemo(() => {
    const m = new Map<string, number>();
    for (const j of jobs) {
      m.set(j.customerName, (m.get(j.customerName) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [jobs]);

  const maxBar = Math.max(1, ...byCustomer.map(([, n]) => n));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 lg:text-3xl">Statistics Centre</h1>
        <p className="mt-1 text-gray-500">Operational KPIs from your stored jobs</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="text-sm text-gray-600">Total jobs</div>
          <div className="text-3xl font-bold text-gray-900">{jobs.length}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-gray-600">Completed</div>
          <div className="text-3xl font-bold text-green-700">{jobs.filter((j) => j.status === "completed").length}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-gray-600">Total sell (ex VAT)</div>
          <div className="text-3xl font-bold text-[#2563EB]">
            £{jobs.reduce((s, j) => s + (Number(j.sellPrice) || 0), 0).toFixed(0)}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">Jobs by Customer</h2>
        {byCustomer.length === 0 ? (
          <p className="text-gray-500">Create jobs to see distribution.</p>
        ) : (
          <div className="space-y-3">
            {byCustomer.map(([name, count]) => (
              <div key={name}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium text-gray-800">{name}</span>
                  <span className="text-gray-600">{count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-[#2563EB] transition-all"
                    style={{ width: `${(count / maxBar) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

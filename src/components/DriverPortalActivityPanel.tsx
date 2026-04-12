import { Activity } from "lucide-react";
import type { Job } from "../types";
import {
  driverPortalActivityKindLabel,
  formatDriverPortalActivityWhen,
  sortDriverPortalActivityNewestFirst,
} from "../lib/driverPortalActivityUi";
import { Card } from "./Layout";

export function DriverPortalActivityPanel({ job, className = "" }: { job: Job; className?: string }) {
  const entries = job.driverPortalActivity?.length
    ? sortDriverPortalActivityNewestFirst(job.driverPortalActivity)
    : [];

  return (
    <Card className={`p-5 ${className}`}>
      <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-gray-900">
        <Activity className="h-5 w-5 text-ht-slate" aria-hidden />
        Driver portal activity
      </h2>
      <p className="mb-4 text-sm text-gray-600">
        Timestamped actions from the driver app for this job (sign-in, location sharing, refresh, ETA, issue reports). Times
        are shown in this device’s local timezone.
      </p>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-500">No driver activity recorded on this job yet.</p>
      ) : (
        <ul className="max-h-[28rem] space-y-3 overflow-y-auto border-t border-ht-border/60 pt-3 text-sm">
          {entries.map((e, i) => (
            <li key={`${e.at}-${e.kind}-${i}`} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
              <div className="font-mono text-xs text-gray-500" title={e.at}>
                {formatDriverPortalActivityWhen(e.at)}
              </div>
              <div className="mt-1 font-medium text-gray-900">{driverPortalActivityKindLabel(e.kind)}</div>
              <div className="mt-0.5 text-xs text-gray-600">
                {e.vehicleReg}
                {e.driverName ? ` · ${e.driverName}` : ""}
              </div>
              {e.detail ? <div className="mt-1 whitespace-pre-wrap text-xs text-gray-700">{e.detail}</div> : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

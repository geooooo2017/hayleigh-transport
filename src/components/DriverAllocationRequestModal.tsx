import { useEffect, useState } from "react";
import { useJobs } from "../context/JobsContext";
import { applyAcceptPendingAllocation, applyDismissPendingAllocation } from "../lib/driverAllocationActions";
import { notifySuccess } from "../lib/platformNotify";
import { Btn } from "./Layout";

/** Queues one modal at a time for each job with `pendingDriverAllocationRequest`. */
export function DriverAllocationRequestModal() {
  const [jobs, setJobs] = useJobs();
  const [activeJobId, setActiveJobId] = useState<number | null>(null);

  useEffect(() => {
    const cur =
      activeJobId != null ? jobs.find((x) => x.id === activeJobId && x.pendingDriverAllocationRequest) : null;
    if (activeJobId != null && !cur) {
      setActiveJobId(null);
      return;
    }
    if (activeJobId == null) {
      const next = jobs.find((x) => x.pendingDriverAllocationRequest);
      if (next) setActiveJobId(next.id);
    }
  }, [jobs, activeJobId]);

  const job = activeJobId != null ? jobs.find((x) => x.id === activeJobId) : undefined;
  const p = job?.pendingDriverAllocationRequest;
  if (!job || !p) return null;

  const onYes = () => {
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id !== job.id) return j;
        return applyAcceptPendingAllocation(j) ?? j;
      })
    );
    notifySuccess("Vehicle assigned to job", {
      description: `${p.vehicleReg} is saved as truck plates. The driver can sign in with the same registration and job number.`,
    });
    setActiveJobId(null);
  };

  const onNo = () => {
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id !== job.id) return j;
        return applyDismissPendingAllocation(j) ?? j;
      })
    );
    setActiveJobId(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div
        className="max-w-md rounded-2xl border border-ht-border bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal
        aria-labelledby="driver-alloc-title"
      >
        <h2 id="driver-alloc-title" className="text-lg font-semibold text-gray-900">
          Assign driver for live tracking?
        </h2>
        <p className="mt-3 text-sm text-gray-700">
          Registration <strong className="font-mono tracking-wide">{p.vehicleReg}</strong> tried to sign in for live tracking on
          job <strong>{job.jobNumber}</strong>
          {p.driverName?.trim() ? (
            <>
              {" "}
              (name given: <strong>{p.driverName.trim()}</strong>)
            </>
          ) : null}
          . This job had no truck registration saved yet.
        </p>
        <p className="mt-2 text-sm text-gray-600">
          If you choose <strong>Yes</strong>, truck plates will be set to this registration
          {p.driverName?.trim() ? " and the assigned driver name will be set from what they entered." : "."}
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Btn type="button" variant="outline" onClick={onNo}>
            No thanks
          </Btn>
          <Btn type="button" onClick={onYes}>
            Yes, allocate
          </Btn>
        </div>
      </div>
    </div>
  );
}

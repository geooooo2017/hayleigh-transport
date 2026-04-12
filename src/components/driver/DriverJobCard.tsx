import { useEffect, useState } from "react";
import { AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";
import { Btn } from "../Layout";
import { formatDriverIssueKindLabel } from "../../lib/driverIssueCommon";
import { JOB_BOARD_MAP_COLORS } from "../../lib/jobBoardVisual";
import { appendDriverPortalActivity } from "../../lib/appendDriverPortalActivity";
import { formatDriverDeliveryEtaDisplay, isoToDatetimeLocalValue } from "../../lib/jobAddress";
import { getSupabase } from "../../lib/supabase";
import { patchJobDriverDeliveryEta } from "../../lib/patchDriverDeliveryEta";
import { patchJobDriverReportedIssue } from "../../lib/patchDriverReportedIssue";
import type { DriverReportedIssue, DriverReportedIssueKind, Job } from "../../types";

export type DriverJobCardActivityContext = {
  vehicleReg: string;
  driverName?: string;
  jobIds: number[];
};

const DRIVER_ISSUE_OPTIONS: { kind: DriverReportedIssueKind; label: string }[] = [
  { kind: "broken-down", label: "Broken down" },
  { kind: "stuck-traffic", label: "Stuck in traffic" },
  { kind: "other", label: "Other" },
];

/** Match fleet map / job-board legend: collection = booked (yellow), delivery = delivered (green). */
function driverSiteTint(side: "collection" | "delivery"): { accent: string; panelBg: string; divider: string } {
  if (side === "collection") {
    return {
      accent: JOB_BOARD_MAP_COLORS.booked,
      panelBg: "rgba(234, 179, 8, 0.14)",
      divider: "rgba(234, 179, 8, 0.35)",
    };
  }
  return {
    accent: JOB_BOARD_MAP_COLORS.delivered,
    panelBg: "rgba(34, 197, 94, 0.12)",
    divider: "rgba(34, 197, 94, 0.35)",
  };
}

export function DriverJobSitePanel({ job, side }: { job: Job; side: "collection" | "delivery" }) {
  const street = side === "collection" ? job.collectionAddressLines : job.deliveryAddressLines;
  const postcode = side === "collection" ? job.collectionPostcode : job.deliveryPostcode;
  const name = side === "collection" ? job.collectionContactName : job.deliveryContactName;
  const phone = side === "collection" ? job.collectionContactPhone : job.deliveryContactPhone;
  const email = side === "collection" ? job.collectionContactEmail : job.deliveryContactEmail;
  const title = side === "collection" ? "Collection" : "Delivery";
  const streetOk = Boolean(street?.trim());
  const pcOk = Boolean(postcode?.trim());
  const { accent, panelBg, divider } = driverSiteTint(side);

  return (
    <div
      className="rounded-xl border-2 p-4 shadow-sm"
      style={{ borderColor: accent, backgroundColor: panelBg }}
    >
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-white shadow-sm"
          style={{ backgroundColor: accent }}
          aria-hidden
        />
        <div className="text-[11px] font-bold uppercase tracking-wider text-ht-navy">{title}</div>
      </div>
      <div className="mt-2 whitespace-pre-wrap break-words text-base leading-snug text-gray-900 sm:text-sm">
        {streetOk ? street!.trim() : <span className="text-amber-900">No street address on job — ask the office.</span>}
      </div>
      {pcOk ? (
        <div className="mt-2 text-base font-semibold text-gray-900 sm:text-sm">Postcode: {postcode!.trim()}</div>
      ) : (
        <div className="mt-2 text-sm text-amber-900">No postcode on job — ask the office.</div>
      )}
      <div
        className="mt-3 space-y-1.5 border-t pt-3 text-sm text-gray-800 sm:text-xs"
        style={{ borderColor: divider }}
      >
        {name?.trim() ? (
          <div>
            <span className="font-semibold text-gray-900">Contact:</span> {name.trim()}
          </div>
        ) : null}
        {phone?.trim() ? (
          <div>
            <span className="font-semibold text-gray-900">Tel:</span>{" "}
            <a href={`tel:${phone.trim().replace(/\s/g, "")}`} className="font-medium text-ht-slate underline">
              {phone.trim()}
            </a>
          </div>
        ) : null}
        {email?.trim() ? (
          <div>
            <span className="font-semibold text-gray-900">Email:</span>{" "}
            <a href={`mailto:${email.trim()}`} className="break-all font-medium text-ht-slate underline">
              {email.trim()}
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DriverDeliveryEtaReadOnly({ job }: { job: Job }) {
  const { accent, panelBg, divider } = driverSiteTint("delivery");
  return (
    <div
      className="rounded-xl border-2 p-4 shadow-sm sm:col-span-2"
      style={{ borderColor: accent, backgroundColor: panelBg }}
    >
      <div className="flex items-start gap-2">
        <Clock className="mt-0.5 h-5 w-5 shrink-0 text-gray-700" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-ht-navy">Delivery ETA (driver)</div>
          <p className="mt-1 text-xs leading-snug text-gray-700">
            Value from the driver app. Edit the job in the office view if you need to clear it.
          </p>
        </div>
      </div>
      <div className="mt-3 border-t pt-3 text-sm" style={{ borderColor: divider }}>
        {job.driverDeliveryEtaAt ? (
          <p className="font-medium text-gray-900">{formatDriverDeliveryEtaDisplay(job.driverDeliveryEtaAt)}</p>
        ) : (
          <p className="text-gray-600">The driver has not set a delivery ETA yet.</p>
        )}
      </div>
    </div>
  );
}

function DriverReportedIssueReadOnly({ job }: { job: Job }) {
  const active = job.driverReportedIssue;
  if (active) {
    return (
      <div
        className="rounded-xl border-2 p-4 shadow-sm sm:col-span-2"
        style={{
          borderColor: JOB_BOARD_MAP_COLORS.issue,
          backgroundColor: "rgba(239, 68, 68, 0.1)",
        }}
      >
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-red-900">Driver-reported issue</div>
            <p className="mt-1 text-base font-semibold text-red-950">{formatDriverIssueKindLabel(active.kind)}</p>
            {active.notes?.trim() ? (
              <p className="mt-2 whitespace-pre-wrap text-sm text-red-900/90">{active.notes.trim()}</p>
            ) : null}
            <p className="mt-2 text-xs text-red-800">Reported {formatDriverDeliveryEtaDisplay(active.reportedAt)}</p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border-2 border-dashed border-gray-200 bg-slate-50/80 p-4 shadow-sm sm:col-span-2">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-gray-500" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-700">Driver issue report</div>
          <p className="mt-1 text-sm text-gray-600">No active report from the driver for this job.</p>
        </div>
      </div>
    </div>
  );
}

function DriverDeliveryEtaEditor({
  job,
  jobIds,
  onSaved,
  activity,
}: {
  job: Job;
  jobIds: number[];
  onSaved: () => void | Promise<void>;
  activity?: DriverJobCardActivityContext;
}) {
  const [value, setValue] = useState(() => isoToDatetimeLocalValue(job.driverDeliveryEtaAt));
  const [busy, setBusy] = useState(false);
  const cloud = Boolean(getSupabase());

  useEffect(() => {
    setValue(isoToDatetimeLocalValue(job.driverDeliveryEtaAt));
  }, [job.id, job.driverDeliveryEtaAt]);

  const persist = async (etaIso: string | null) => {
    setBusy(true);
    try {
      const r = await patchJobDriverDeliveryEta({
        jobId: job.id,
        allowedJobIds: jobIds,
        etaIso,
      });
      if (!r.ok) {
        toast.error(r.error ?? "Could not save ETA");
        return;
      }
      if (activity) {
        void appendDriverPortalActivity({
          targetJobIds: [job.id],
          allowedJobIds: activity.jobIds,
          vehicleReg: activity.vehicleReg,
          ...(activity.driverName?.trim() ? { driverName: activity.driverName.trim() } : {}),
          kind: etaIso == null ? "delivery_eta_cleared" : "delivery_eta_set",
          ...(etaIso ? { detail: formatDriverDeliveryEtaDisplay(etaIso) } : {}),
        });
      }
      if (etaIso == null) {
        toast.message("Delivery ETA cleared");
      } else {
        toast.success("Delivery ETA saved", {
          description: cloud
            ? "The office can see this on the job."
            : "Cloud sync is off — only this device was updated.",
        });
      }
      await onSaved();
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    const trimmed = value.trim();
    if (trimmed === "") {
      void persist(null);
      return;
    }
    const d = new Date(trimmed);
    if (Number.isNaN(d.getTime())) {
      toast.error("Choose a valid date and time");
      return;
    }
    void persist(d.toISOString());
  };

  const { accent, panelBg, divider } = driverSiteTint("delivery");

  return (
    <div
      className="rounded-xl border-2 p-4 shadow-sm sm:col-span-2"
      style={{ borderColor: accent, backgroundColor: panelBg }}
    >
      <div className="flex items-start gap-2">
        <Clock className="mt-0.5 h-5 w-5 shrink-0 text-gray-700" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-ht-navy">Delivery ETA</div>
          <p className="mt-1 text-xs leading-snug text-gray-700">
            When you expect to arrive at the <strong>delivery</strong> address. Shown to the office on this job.
          </p>
        </div>
      </div>
      {job.driverDeliveryEtaAt ? (
        <p className="mt-2 text-sm font-medium text-gray-900">
          Current: {formatDriverDeliveryEtaDisplay(job.driverDeliveryEtaAt)}
        </p>
      ) : null}
      <div
        className="mt-3 flex flex-col gap-3 border-t pt-3 sm:flex-row sm:flex-wrap sm:items-end"
        style={{ borderColor: divider }}
      >
        <div className="min-w-0 flex-1">
          <label htmlFor={`eta-${job.id}`} className="mb-1 block text-xs font-medium text-gray-800">
            Date &amp; time
          </label>
          <input
            id={`eta-${job.id}`}
            type="datetime-local"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="min-h-12 w-full max-w-md rounded-xl border-2 border-gray-200 bg-white px-3 py-2 text-base text-gray-900 shadow-sm outline-none focus:border-ht-slate sm:text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn type="button" className="min-h-12 touch-manipulation px-5 sm:min-h-10" disabled={busy} onClick={save}>
            {busy ? "Saving…" : "Save ETA"}
          </Btn>
          {job.driverDeliveryEtaAt ? (
            <Btn
              type="button"
              variant="outline"
              className="min-h-12 touch-manipulation sm:min-h-10"
              disabled={busy}
              onClick={() => {
                setValue("");
                void persist(null);
              }}
            >
              Clear
            </Btn>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DriverIssueReporter({
  job,
  jobIds,
  onSaved,
  activity,
}: {
  job: Job;
  jobIds: number[];
  onSaved: () => void | Promise<void>;
  activity?: DriverJobCardActivityContext;
}) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const cloud = Boolean(getSupabase());
  const active = job.driverReportedIssue;

  const clearIssue = async () => {
    setBusy(true);
    try {
      const r = await patchJobDriverReportedIssue({ jobId: job.id, allowedJobIds: jobIds, issue: null });
      if (!r.ok) {
        toast.error(r.error ?? "Could not update");
        return;
      }
      if (activity) {
        void appendDriverPortalActivity({
          targetJobIds: [job.id],
          allowedJobIds: activity.jobIds,
          vehicleReg: activity.vehicleReg,
          ...(activity.driverName?.trim() ? { driverName: activity.driverName.trim() } : {}),
          kind: "issue_withdrawn",
        });
      }
      toast.message("Report withdrawn");
      setNotes("");
      await onSaved();
    } finally {
      setBusy(false);
    }
  };

  const submit = async (kind: DriverReportedIssueKind) => {
    const n = notes.trim();
    if (kind === "other" && n.length < 3) {
      toast.error("Add a note (at least 3 characters) for “Other”.");
      return;
    }
    setBusy(true);
    try {
      const issue: DriverReportedIssue = {
        kind,
        notes: n.slice(0, 4000),
        reportedAt: new Date().toISOString(),
      };
      const r = await patchJobDriverReportedIssue({ jobId: job.id, allowedJobIds: jobIds, issue });
      if (!r.ok) {
        toast.error(r.error ?? "Could not send report");
        return;
      }
      if (activity) {
        const label = formatDriverIssueKindLabel(kind);
        const detail = n ? `${label} — ${n.slice(0, 220)}` : label;
        void appendDriverPortalActivity({
          targetJobIds: [job.id],
          allowedJobIds: activity.jobIds,
          vehicleReg: activity.vehicleReg,
          ...(activity.driverName?.trim() ? { driverName: activity.driverName.trim() } : {}),
          kind: "issue_reported",
          detail,
        });
      }
      toast.warning("Report sent to the office", {
        description: cloud
          ? "Shown on this job, the map, and staff notifications bell."
          : "Cloud sync is off — only this device was updated.",
      });
      setNotes("");
      await onSaved();
    } finally {
      setBusy(false);
    }
  };

  if (active) {
    return (
      <div
        className="rounded-xl border-2 p-4 shadow-sm sm:col-span-2"
        style={{
          borderColor: JOB_BOARD_MAP_COLORS.issue,
          backgroundColor: "rgba(239, 68, 68, 0.1)",
        }}
      >
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-red-900">Your active report</div>
            <p className="mt-1 text-base font-semibold text-red-950">{formatDriverIssueKindLabel(active.kind)}</p>
            {active.notes?.trim() ? (
              <p className="mt-2 whitespace-pre-wrap text-sm text-red-900/90">{active.notes.trim()}</p>
            ) : null}
            <p className="mt-2 text-xs text-red-800">Sent {formatDriverDeliveryEtaDisplay(active.reportedAt)}</p>
          </div>
        </div>
        <Btn
          type="button"
          variant="outline"
          className="mt-3 w-full border-red-300 text-red-900 hover:bg-red-100 sm:w-auto"
          disabled={busy}
          onClick={() => void clearIssue()}
        >
          {busy ? "Updating…" : "Withdraw report"}
        </Btn>
      </div>
    );
  }

  const { accent } = driverSiteTint("delivery");

  return (
    <div
      className="rounded-xl border-2 border-dashed p-4 sm:col-span-2"
      style={{ borderColor: accent, backgroundColor: "rgba(34, 197, 94, 0.06)" }}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-gray-700" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-ht-navy">Report an issue</div>
          <p className="mt-1 text-xs leading-snug text-gray-700">
            Choose a reason — the office sees it on this job, the fleet map, and the notifications bell. Add notes anytime;
            notes are <strong>required</strong> for “Other”.
          </p>
        </div>
      </div>
      <label htmlFor={`issue-notes-${job.id}`} className="mt-3 block text-xs font-medium text-gray-800">
        Notes <span className="font-normal text-gray-500">(optional, required for Other)</span>
      </label>
      <textarea
        id={`issue-notes-${job.id}`}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        className="mt-1 min-h-[5rem] w-full rounded-xl border-2 border-gray-200 bg-white px-3 py-2 text-base text-gray-900 shadow-sm outline-none focus:border-ht-slate sm:text-sm"
        placeholder="e.g. location, delay, who you spoke to…"
      />
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {DRIVER_ISSUE_OPTIONS.map((opt) => (
          <Btn
            key={opt.kind}
            type="button"
            variant="outline"
            className="min-h-12 touch-manipulation border-red-200 bg-white text-red-900 hover:bg-red-50"
            disabled={busy}
            onClick={() => void submit(opt.kind)}
          >
            {busy ? "Sending…" : opt.label}
          </Btn>
        ))}
      </div>
    </div>
  );
}

/** Same panels as the driver app: collection & delivery sites, delivery ETA, issue reporting. */
export function DriverJobCardContent({
  job,
  interactive,
  jobIds,
  onSaved,
  driverActivity,
}: {
  job: Job;
  /** When false, staff read-only preview (matches what drivers see, without editing). */
  interactive: boolean;
  jobIds: number[];
  onSaved?: () => void | Promise<void>;
  driverActivity?: DriverJobCardActivityContext;
}) {
  const saved = onSaved ?? (() => {});
  return (
    <>
      <DriverJobSitePanel job={job} side="collection" />
      <DriverJobSitePanel job={job} side="delivery" />
      {interactive ? (
        <>
          <DriverDeliveryEtaEditor job={job} jobIds={jobIds} onSaved={saved} activity={driverActivity} />
          <DriverIssueReporter job={job} jobIds={jobIds} onSaved={saved} activity={driverActivity} />
        </>
      ) : (
        <>
          <DriverDeliveryEtaReadOnly job={job} />
          <DriverReportedIssueReadOnly job={job} />
        </>
      )}
    </>
  );
}

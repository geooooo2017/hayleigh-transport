import { Link } from "react-router-dom";
import { ArrowRight, ClipboardCheck } from "lucide-react";
import type { Job } from "../types";
import { getNextManualProgressStep, isFullyProgressed } from "../lib/jobManualProgress";
import { notifySuccess } from "../lib/platformNotify";
import { platformPath } from "../routes/paths";
import { Btn, Card } from "./Layout";

const STATUS_OPTIONS: { value: Job["status"]; label: string }[] = [
  { value: "scheduled", label: "Scheduled" },
  { value: "in-progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

type Props = {
  job: Job;
  jobDetailPath: string;
  onPatch: (updates: Partial<Job>) => void;
};

export function JobManualProgressCard({ job, jobDetailPath, onPatch }: Props) {
  const next = getNextManualProgressStep(job);
  const done = isFullyProgressed(job);

  const apply = (updates: Partial<Job>, message: string) => {
    onPatch(updates);
    notifySuccess(message, { href: jobDetailPath });
  };

  return (
    <Card className="border-2 border-ht-slate/15 p-5 shadow-sm">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <ClipboardCheck className="h-5 w-5 text-ht-slate" aria-hidden />
        <h2 className="text-lg font-semibold text-gray-900">Manual progression (staff)</h2>
      </div>
      <p className="mb-4 text-sm text-gray-600">
        Move the job through each stage when you need to override normal flow. Changes save immediately and bump the version
        drivers see. Use <strong>Next step</strong> for the usual order, or pick any action below.
      </p>

      {next ? (
        <div className="mb-5">
          <Btn
            type="button"
            className="w-full gap-2 sm:w-auto"
            onClick={() => apply(next.updates, next.label)}
          >
            <ArrowRight className="h-4 w-4" aria-hidden />
            Next step: {next.label}
          </Btn>
        </div>
      ) : done ? (
        <p className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          All typical stages are marked complete. You can still adjust individual flags below if something needs correcting.
        </p>
      ) : null}

      <div className="space-y-4">
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Operational status</h3>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((o) => (
              <Btn
                key={o.value}
                type="button"
                variant={job.status === o.value ? "primary" : "outline"}
                className="min-w-[7.5rem]"
                onClick={() => {
                  if (job.status === o.value) return;
                  apply({ status: o.value }, `Job status set to ${o.label}`);
                }}
              >
                {o.label}
              </Btn>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Paperwork &amp; billing flags</h3>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2">
              <span className="text-sm font-medium text-gray-800">POD received</span>
              <Btn
                type="button"
                variant={job.podReceived === "yes" ? "primary" : "outline"}
                className="text-xs"
                onClick={() => apply({ podReceived: "yes" }, "POD marked received")}
              >
                Yes
              </Btn>
              <Btn
                type="button"
                variant={job.podReceived !== "yes" ? "outline" : "primary"}
                className="text-xs"
                onClick={() => apply({ podReceived: "no" }, "POD marked not received")}
              >
                No
              </Btn>
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2">
              <span className="text-sm font-medium text-gray-800">Supplier invoice</span>
              <Btn
                type="button"
                variant={job.supplierInvoiceReceived === "yes" ? "primary" : "outline"}
                className="text-xs"
                onClick={() => apply({ supplierInvoiceReceived: "yes" }, "Supplier invoice marked received")}
              >
                Received
              </Btn>
              <Btn
                type="button"
                variant={job.supplierInvoiceReceived !== "yes" ? "outline" : "primary"}
                className="text-xs"
                onClick={() => apply({ supplierInvoiceReceived: "no" }, "Supplier invoice marked not received")}
              >
                Not yet
              </Btn>
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2">
              <span className="text-sm font-medium text-gray-800">Customer invoice</span>
              <span className="text-xs text-gray-500">
                {job.status !== "completed" ? "(complete job first)" : null}
              </span>
              <Btn
                type="button"
                variant={job.invoiceSent === "yes" ? "primary" : "outline"}
                className="text-xs"
                disabled={job.status !== "completed"}
                onClick={() => apply({ invoiceSent: "yes" }, "Customer invoice marked sent")}
              >
                Sent
              </Btn>
              <Btn
                type="button"
                variant={job.invoiceSent !== "yes" ? "outline" : "primary"}
                className="text-xs"
                disabled={job.status !== "completed"}
                onClick={() => apply({ invoiceSent: "no" }, "Customer invoice marked not sent")}
              >
                Not sent
              </Btn>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            These mirror the register fields and{" "}
            <Link to={platformPath("/customer-invoicing")} className="text-ht-slate underline">
              Customer Invoicing
            </Link>
            . Uploading a POD file on this job still sets POD separately if you use that flow.
          </p>
        </div>
      </div>
    </Card>
  );
}

import { Check, Circle } from "lucide-react";
import type { Job } from "../types";

type Step = { key: string; label: string; detail: string; done: boolean };

export function JobLifecycleTimeline({ job }: { job: Job }) {
  const podOk = job.podReceived === "yes";
  const invOk = job.invoiceSent === "yes";
  const supOk = job.supplierInvoiceReceived === "yes";

  const steps: Step[] = [
    {
      key: "created",
      label: "Job created",
      detail: new Date(job.createdAt).toLocaleString(),
      done: true,
    },
    {
      key: "planned",
      label: "Planned / scheduled",
      detail: job.scheduledDay
        ? `Board: ${job.scheduledDay} · Collection ${new Date(job.collectionDate).toLocaleDateString()}`
        : `Collection ${new Date(job.collectionDate).toLocaleDateString()}`,
      done: true,
    },
    {
      key: "progress",
      label: "In progress",
      detail: job.status === "in-progress" ? "On the road / being executed" : "Awaiting or not started",
      done: job.status === "in-progress" || job.status === "completed",
    },
    {
      key: "completed",
      label: "Job completed",
      detail: job.status === "completed" ? "Marked complete in the system" : "Not completed yet",
      done: job.status === "completed",
    },
    {
      key: "pod",
      label: "POD received",
      detail: podOk ? "Proof of delivery recorded" : "POD not recorded yet",
      done: podOk,
    },
    {
      key: "supplier",
      label: "Supplier invoice",
      detail: supOk ? "Supplier invoice received" : "Awaiting supplier invoice (if applicable)",
      done: supOk,
    },
    {
      key: "invoiced",
      label: "Customer invoiced",
      detail:
        job.status !== "completed"
          ? "Complete the job first, then mark the invoice sent here or on Customer Invoicing."
          : invOk
            ? "Invoice sent to customer — matches Customer Invoicing"
            : "Not marked sent yet — bill the customer and mark invoiced to close the loop",
      done: invOk,
    },
  ];

  return (
    <div className="rounded-xl border border-ht-border bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Job tracking</h2>
      <p className="mb-4 text-sm text-gray-600">
        Progress from creation through completion and invoicing. Update statuses and paperwork on this job as things
        happen.
      </p>
      <ol className="space-y-0">
        {steps.map((s, i) => (
          <li key={s.key} className="relative flex gap-4 pb-6 last:pb-0">
            {i < steps.length - 1 && (
              <div
                className={`absolute left-[15px] top-8 h-[calc(100%-0.5rem)] w-0.5 ${
                  s.done ? "bg-emerald-200" : "bg-gray-200"
                }`}
                aria-hidden
              />
            )}
            <div className="relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-white">
              {s.done ? (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white">
                  <Check className="h-4 w-4" aria-hidden />
                </span>
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 text-gray-400">
                  <Circle className="h-3 w-3 fill-current" aria-hidden />
                </span>
              )}
            </div>
            <div className="min-w-0 pt-0.5">
              <div className={`font-medium ${s.done ? "text-gray-900" : "text-gray-500"}`}>{s.label}</div>
              <div className="mt-0.5 text-sm text-gray-600">{s.detail}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

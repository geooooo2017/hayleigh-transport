import type { Job } from "../types";

export type ProgressStepKey =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "pod"
  | "supplier_invoice"
  | "customer_invoice";

/** Next recommended step in typical order (staff can still use individual actions). */
export function getNextManualProgressStep(job: Job): { key: ProgressStepKey; label: string; updates: Partial<Job> } | null {
  if (job.status === "scheduled") {
    return { key: "in_progress", label: "Move to in progress", updates: { status: "in-progress" } };
  }
  if (job.status === "in-progress") {
    return { key: "completed", label: "Mark job complete", updates: { status: "completed" } };
  }
  if (job.status === "completed" && job.podReceived !== "yes") {
    return { key: "pod", label: "Mark POD received", updates: { podReceived: "yes" } };
  }
  if (job.supplierInvoiceReceived !== "yes") {
    return {
      key: "supplier_invoice",
      label: "Mark supplier invoice received",
      updates: { supplierInvoiceReceived: "yes" },
    };
  }
  if (job.invoiceSent !== "yes") {
    return { key: "customer_invoice", label: "Mark customer invoice sent", updates: { invoiceSent: "yes" } };
  }
  return null;
}

export function isFullyProgressed(job: Job): boolean {
  return (
    job.status === "completed" &&
    job.podReceived === "yes" &&
    job.supplierInvoiceReceived === "yes" &&
    job.invoiceSent === "yes"
  );
}

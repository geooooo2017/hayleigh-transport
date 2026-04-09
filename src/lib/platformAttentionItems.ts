import type { Job } from "../types";
import { isJobAddressComplete, summarizeAddressIssues } from "./jobAddressValidation";
import { platformPath } from "../routes/paths";

export type AttentionNotice = {
  id: string;
  title: string;
  detail: string;
  href: string;
  tone: "warning" | "info" | "danger";
};

function coreJobIncomplete(j: Job): boolean {
  return (
    !j.customerName?.trim() ||
    !j.collectionDate?.trim() ||
    !j.deliveryDate?.trim() ||
    !j.carrier?.trim() ||
    !j.truckPlates?.trim()
  );
}

function sellInvalid(j: Job): boolean {
  return !(Number(j.sellPrice) > 0);
}

export function buildPlatformAttentionItems(
  jobs: Job[],
  opts: {
    syncMode: "local" | "cloud";
    cloudError: string | null;
    customersCount: number;
    driversCount: number;
  }
): AttentionNotice[] {
  const list: AttentionNotice[] = [];

  if (opts.syncMode === "cloud" && opts.cloudError) {
    list.push({
      id: "sync",
      title: "Job sync issue",
      detail: opts.cloudError,
      href: platformPath("/jobs"),
      tone: "danger",
    });
  }

  if (jobs.length > 0 && opts.customersCount === 0) {
    list.push({
      id: "no-customers",
      title: "Customers list is empty",
      detail: "You have jobs but no CRM customers — add them for cleaner reporting and search.",
      href: platformPath("/customers"),
      tone: "info",
    });
  }

  if (jobs.length > 3 && opts.driversCount === 0) {
    list.push({
      id: "no-drivers",
      title: "No drivers on file",
      detail: "Add drivers under Drivers & Vehicles so assignments and search stay accurate.",
      href: platformPath("/drivers-vehicles"),
      tone: "info",
    });
  }

  const addressIncomplete = jobs.filter((j) => !isJobAddressComplete(j)).slice(0, 8);
  for (const j of addressIncomplete) {
    const detail = summarizeAddressIssues(j) || "Add full collection and delivery details";
    list.push({
      id: `addr-${j.id}`,
      title: `Address incomplete: ${j.jobNumber}`,
      detail: `${j.customerName} — ${detail}`,
      href: platformPath(`/jobs/${j.id}`),
      tone: "warning",
    });
  }

  const coreOnly = jobs
    .filter((j) => isJobAddressComplete(j) && coreJobIncomplete(j))
    .slice(0, 6);
  for (const j of coreOnly) {
    const gaps: string[] = [];
    if (!j.customerName?.trim()) gaps.push("customer");
    if (!j.collectionDate?.trim()) gaps.push("collection date");
    if (!j.deliveryDate?.trim()) gaps.push("delivery date");
    if (!j.carrier?.trim()) gaps.push("carrier");
    if (!j.truckPlates?.trim()) gaps.push("truck registration");
    list.push({
      id: `core-${j.id}`,
      title: `Job details incomplete: ${j.jobNumber}`,
      detail: `${j.customerName} — missing ${gaps.join(", ")}`,
      href: platformPath(`/jobs/${j.id}`),
      tone: "warning",
    });
  }

  const badSell = jobs
    .filter((j) => isJobAddressComplete(j) && !coreJobIncomplete(j) && sellInvalid(j))
    .slice(0, 5);
  for (const j of badSell) {
    list.push({
      id: `sell-${j.id}`,
      title: `Pricing: ${j.jobNumber}`,
      detail: `${j.customerName} — set sell price (ex VAT) greater than zero`,
      href: platformPath(`/jobs/${j.id}`),
      tone: "warning",
    });
  }

  const completedUninvoiced = jobs.filter((j) => j.status === "completed" && j.invoiceSent !== "yes").slice(0, 6);
  for (const j of completedUninvoiced) {
    list.push({
      id: `inv-${j.id}`,
      title: `Invoice: ${j.jobNumber}`,
      detail: `${j.customerName} — completed, not invoiced`,
      href: platformPath("/customer-invoicing"),
      tone: "warning",
    });
  }

  const supplierPending = jobs
    .filter(
      (j) =>
        j.status === "completed" &&
        j.billable === "yes" &&
        j.supplierInvoiceReceived !== "yes"
    )
    .slice(0, 5);
  for (const j of supplierPending) {
    list.push({
      id: `sup-${j.id}`,
      title: `Supplier invoice: ${j.jobNumber}`,
      detail: `${j.customerName} — billable job, supplier invoice not marked received`,
      href: platformPath(`/jobs/${j.id}`),
      tone: "info",
    });
  }

  const podDue = jobs
    .filter((j) => j.status === "completed" && j.podReceived !== "yes")
    .slice(0, 5);
  for (const j of podDue) {
    list.push({
      id: `podc-${j.id}`,
      title: `POD missing (completed): ${j.jobNumber}`,
      detail: j.customerName,
      href: platformPath(`/jobs/${j.id}`),
      tone: "warning",
    });
  }

  const noPod = jobs
    .filter((j) => j.status !== "completed" && j.podReceived !== "yes")
    .slice(0, 5);
  for (const j of noPod) {
    list.push({
      id: `pod-${j.id}`,
      title: `POD pending: ${j.jobNumber}`,
      detail: j.customerName,
      href: platformPath(`/jobs/${j.id}`),
      tone: "info",
    });
  }

  return list;
}

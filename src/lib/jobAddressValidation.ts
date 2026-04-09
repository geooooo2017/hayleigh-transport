import type { Job } from "../types";
import { isValidUkPostcodeFormat } from "./ukPostcode";

/** Fields required to check collection + delivery address completeness. */
export type JobAddressFields = Pick<
  Job,
  | "routeType"
  | "collectionAddressLines"
  | "collectionContactName"
  | "collectionContactPhone"
  | "collectionContactEmail"
  | "collectionPostcode"
  | "deliveryAddressLines"
  | "deliveryContactName"
  | "deliveryContactPhone"
  | "deliveryContactEmail"
  | "deliveryPostcode"
>;

function nonEmpty(s: string | undefined): boolean {
  return Boolean(s && String(s).trim());
}

function looseEmailOk(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

/** Required contact email: non-empty and plausible format. */
export function isRequiredEmailOk(s: string): boolean {
  return nonEmpty(s) && looseEmailOk(s);
}

function postcodeIssues(pc: string | undefined, routeType: Job["routeType"], side: "Collection" | "Delivery"): string[] {
  const t = (pc ?? "").trim();
  if (!t) return [`${side} postcode`];
  if (routeType === "domestic" && !isValidUkPostcodeFormat(t)) {
    return [`${side} postcode (use a full valid UK postcode)`];
  }
  if (routeType === "international" && t.length < 2) {
    return [`${side} postcode`];
  }
  return [];
}

/** Human-readable gaps (empty array = all mandatory address fields present and valid). */
export function getJobAddressIssues(j: JobAddressFields): string[] {
  const issues: string[] = [];
  if (!nonEmpty(j.collectionAddressLines)) issues.push("Collection address");
  if (!nonEmpty(j.collectionContactName)) issues.push("Collection contact name");
  if (!nonEmpty(j.collectionContactPhone)) issues.push("Collection contact phone");
  if (!nonEmpty(j.collectionContactEmail)) issues.push("Collection contact email");
  else if (!looseEmailOk(j.collectionContactEmail)) issues.push("Collection contact email (invalid format)");
  issues.push(...postcodeIssues(j.collectionPostcode, j.routeType, "Collection"));

  if (!nonEmpty(j.deliveryAddressLines)) issues.push("Delivery address");
  if (!nonEmpty(j.deliveryContactName)) issues.push("Delivery contact name");
  if (!nonEmpty(j.deliveryContactPhone)) issues.push("Delivery contact phone");
  if (!nonEmpty(j.deliveryContactEmail)) issues.push("Delivery contact email");
  else if (!looseEmailOk(j.deliveryContactEmail)) issues.push("Delivery contact email (invalid format)");
  issues.push(...postcodeIssues(j.deliveryPostcode, j.routeType, "Delivery"));

  return issues;
}

export function isJobAddressComplete(j: JobAddressFields): boolean {
  return getJobAddressIssues(j).length === 0;
}

export function getCollectionAddressIssues(j: JobAddressFields): string[] {
  const issues: string[] = [];
  if (!nonEmpty(j.collectionAddressLines)) issues.push("Collection address");
  if (!nonEmpty(j.collectionContactName)) issues.push("Collection contact name");
  if (!nonEmpty(j.collectionContactPhone)) issues.push("Collection contact phone");
  if (!nonEmpty(j.collectionContactEmail)) issues.push("Collection contact email");
  else if (!looseEmailOk(j.collectionContactEmail)) issues.push("Collection contact email (invalid format)");
  issues.push(...postcodeIssues(j.collectionPostcode, j.routeType, "Collection"));
  return issues;
}

export function getDeliveryAddressIssues(j: JobAddressFields): string[] {
  const issues: string[] = [];
  if (!nonEmpty(j.deliveryAddressLines)) issues.push("Delivery address");
  if (!nonEmpty(j.deliveryContactName)) issues.push("Delivery contact name");
  if (!nonEmpty(j.deliveryContactPhone)) issues.push("Delivery contact phone");
  if (!nonEmpty(j.deliveryContactEmail)) issues.push("Delivery contact email");
  else if (!looseEmailOk(j.deliveryContactEmail)) issues.push("Delivery contact email (invalid format)");
  issues.push(...postcodeIssues(j.deliveryPostcode, j.routeType, "Delivery"));
  return issues;
}

/** Short summary for notifications (max `max` items). */
export function summarizeAddressIssues(j: JobAddressFields, max = 3): string {
  const g = getJobAddressIssues(j);
  if (g.length === 0) return "";
  const head = g.slice(0, max).join(" · ");
  return g.length > max ? `${head}…` : head;
}

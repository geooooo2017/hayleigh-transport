import type { Job } from "../types";

export type AddressSide = "collection" | "delivery";

/** Map legacy `collectionLocation` / `deliveryLocation` into structured fields. */
export function migrateJob(job: Job): Job {
  const leg = job as Job & { collectionLocation?: string; deliveryLocation?: string };
  const { collectionLocation: _c, deliveryLocation: _d, ...rest } = leg;
  return {
    ...rest,
    collectionAddressLines:
      (rest.collectionAddressLines && String(rest.collectionAddressLines).trim()) ||
      (leg.collectionLocation && leg.collectionLocation.trim()) ||
      "",
    collectionContactName: rest.collectionContactName ?? "",
    collectionContactPhone: rest.collectionContactPhone ?? "",
    collectionContactEmail: rest.collectionContactEmail ?? "",
    deliveryAddressLines:
      (rest.deliveryAddressLines && String(rest.deliveryAddressLines).trim()) ||
      (leg.deliveryLocation && leg.deliveryLocation.trim()) ||
      "",
    deliveryContactName: rest.deliveryContactName ?? "",
    deliveryContactPhone: rest.deliveryContactPhone ?? "",
    deliveryContactEmail: rest.deliveryContactEmail ?? "",
    podSent: rest.podSent ?? "no",
    billable: rest.billable ?? "no",
    hayleighPo: rest.hayleighPo ?? "",
    collectionRef: rest.collectionRef ?? "",
    customerInvoiceRef: rest.customerInvoiceRef ?? "",
    customerPaymentDate: rest.customerPaymentDate ?? "",
  };
}

export function migrateJobs(jobs: Job[]): Job[] {
  if (!Array.isArray(jobs)) return [];
  const out: Job[] = [];
  for (const j of jobs) {
    if (!j || typeof j !== "object") continue;
    try {
      out.push(migrateJob(j as Job));
    } catch {
      /* skip corrupt Supabase/local rows */
    }
  }
  return out;
}

function street(job: Job, side: AddressSide): string {
  return side === "collection" ? job.collectionAddressLines : job.deliveryAddressLines;
}

function pc(job: Job, side: AddressSide): string {
  return side === "collection" ? (job.collectionPostcode ?? "") : (job.deliveryPostcode ?? "");
}

/** UK-style short date for job board / list cards (from YYYY-MM-DD or ISO). */
export function formatJobCardDate(iso: string | undefined): string {
  if (!iso?.trim()) return "—";
  const head = iso.trim().slice(0, 10);
  const parsed = new Date(`${head}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? iso.trim() : parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Short line for lists (map strip, job board). */
export function formatAddressSummary(job: Job, side: AddressSide, maxLen = 72): string {
  const parts = [street(job, side).trim(), pc(job, side).trim()].filter(Boolean);
  const s = parts.join(" · ");
  if (!s) return "";
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen - 1)}…`;
}

/** Full block for PDFs and driver cards. */
export function formatAddressBlock(job: Job, side: AddressSide): string {
  const block =
    side === "collection"
      ? {
          street: job.collectionAddressLines,
          postcode: job.collectionPostcode ?? "",
          name: job.collectionContactName,
          phone: job.collectionContactPhone,
          email: job.collectionContactEmail,
        }
      : {
          street: job.deliveryAddressLines,
          postcode: job.deliveryPostcode ?? "",
          name: job.deliveryContactName,
          phone: job.deliveryContactPhone,
          email: job.deliveryContactEmail,
        };
  const lines: string[] = [];
  if (block.name.trim()) lines.push(`Contact: ${block.name.trim()}`);
  if (block.phone.trim()) lines.push(`Tel: ${block.phone.trim()}`);
  if (block.email.trim()) lines.push(`Email: ${block.email.trim()}`);
  if (block.street.trim()) lines.push(block.street.trim());
  if (block.postcode.trim()) lines.push(`Postcode: ${block.postcode.trim()}`);
  return lines.join("\n\n") || "—";
}

/** Query string for OpenStreetMap geocoding from the job. */
export function geocodeNominatimQuery(job: Job, side: AddressSide): string {
  const s = street(job, side).trim();
  const p = pc(job, side).trim();
  const tail = [s, p, "United Kingdom"].filter(Boolean).join(", ");
  return tail || s || p;
}

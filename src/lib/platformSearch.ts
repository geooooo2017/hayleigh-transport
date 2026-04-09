import type { Customer, Driver, Job, Vehicle } from "../types";

export type SearchHit =
  | { kind: "job"; id: number; title: string; subtitle: string }
  | { kind: "customer"; id: number; title: string; subtitle: string }
  | { kind: "driver"; id: number; title: string; subtitle: string }
  | { kind: "vehicle"; id: number; title: string; subtitle: string };

function includes(hay: string, needle: string) {
  return hay.toLowerCase().includes(needle);
}

/** Global search across jobs, customers, drivers, vehicles (min 2 chars). */
export function buildSearchHits(
  raw: string,
  jobs: Job[],
  customers: Customer[],
  drivers: Driver[],
  vehicles: Vehicle[]
): SearchHit[] {
  const q = raw.trim().toLowerCase();
  if (q.length < 2) return [];

  const hits: SearchHit[] = [];

  for (const j of jobs) {
    if (hits.filter((h) => h.kind === "job").length >= 8) break;
    const blob = [
      j.jobNumber,
      j.customerName,
      j.handler,
      j.carrier,
      j.truckPlates,
      j.collectionAddressLines,
      j.collectionContactName,
      j.collectionContactPhone,
      j.collectionContactEmail,
      j.deliveryAddressLines,
      j.deliveryContactName,
      j.deliveryContactPhone,
      j.deliveryContactEmail,
      j.collectionPostcode,
      j.deliveryPostcode,
      j.notes,
    ]
      .filter(Boolean)
      .join(" ");
    if (includes(blob, q)) {
      hits.push({ kind: "job", id: j.id, title: j.jobNumber, subtitle: j.customerName });
    }
  }

  for (const c of customers) {
    if (hits.filter((h) => h.kind === "customer").length >= 5) break;
    const blob = [c.name, c.contactPerson, c.email, c.phone, c.address].filter(Boolean).join(" ");
    if (includes(blob, q)) {
      hits.push({ kind: "customer", id: c.id, title: c.name, subtitle: c.contactPerson || c.email || "Customer" });
    }
  }

  for (const d of drivers) {
    if (hits.filter((h) => h.kind === "driver").length >= 5) break;
    const blob = [d.name, d.phone, d.licenseNumber].filter(Boolean).join(" ");
    if (includes(blob, q)) {
      hits.push({ kind: "driver", id: d.id, title: d.name, subtitle: d.phone || "Driver" });
    }
  }

  for (const v of vehicles) {
    if (hits.filter((h) => h.kind === "vehicle").length >= 4) break;
    const blob = [v.name, v.registration, v.type].filter(Boolean).join(" ");
    if (includes(blob, q)) {
      hits.push({ kind: "vehicle", id: v.id, title: v.registration || v.name, subtitle: v.name || "Vehicle" });
    }
  }

  return hits;
}

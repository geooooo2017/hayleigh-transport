import { geocodeUkPostcode } from "./geocode";
import { allocateJobNumber } from "./jobNumbers";
import type { Job, User } from "../types";

const COLLECTION_POSTCODE = "M1 1AE";
const DELIVERY_POSTCODE = "LS1 4DY";

/** Use on /driver together with the test job’s job number (toast / Jobs list). Must match `truckPlates` on the seeded job. */
export const TEST_JOB_DRIVER_PORTAL_REGISTRATION = "TE57 JOB";

/**
 * One-click realistic job for QA: domestic leg, map coords, finance, in-progress for driver portal + Live Tracking.
 * Uses real UK postcodes (postcodes.io) so map pins work.
 */
export async function createSeededTestJob(user: User): Promise<Job> {
  const routeType = "domestic";
  const [collGeo, delGeo] = await Promise.all([
    geocodeUkPostcode(COLLECTION_POSTCODE),
    geocodeUkPostcode(DELIVERY_POSTCODE),
  ]);
  if (!collGeo || !delGeo) {
    throw new Error("Could not geocode test postcodes — check your network.");
  }

  const jobNumber = allocateJobNumber(user, routeType);
  const buy = 320;
  const sell = 450;
  const fuel = 25;
  const extra = 15;
  const profit = sell - buy - fuel - extra;
  const margin = sell > 0 ? (profit / sell) * 100 : 0;

  const today = new Date();
  const isoDate = (d: Date) => d.toISOString().slice(0, 10);
  const collectionDate = isoDate(today);
  const deliveryDate = isoDate(new Date(today.getTime() + 86400000));

  return {
    id: Date.now(),
    jobNumber,
    handler: user.name,
    routeType,
    collectionDate,
    deliveryDate,
    customerName: "Test Customer Ltd",
    customerEmail: "accounts+test@example.com",
    carrier: "Hayleigh Transport (test leg)",
    truckPlates: TEST_JOB_DRIVER_PORTAL_REGISTRATION,
    assignedDriverName: "Test Driver",
    assignedDriverPhone: "07700900000",
    buyPrice: buy,
    sellPrice: sell,
    fuelSurcharge: fuel,
    extraCharges: extra,
    collectionAddressLines: "Test Collection Depot\n1 Piccadilly Approach\nManchester",
    collectionContactName: "Alex Collection",
    collectionContactPhone: "+44 161 111 2222",
    collectionContactEmail: "collection.test@example.com",
    deliveryAddressLines: "Test Delivery Site\nLeeds City Centre Receiving",
    deliveryContactName: "Jordan Delivery",
    deliveryContactPhone: "+44 113 333 4444",
    deliveryContactEmail: "delivery.test@example.com",
    collectionPostcode: COLLECTION_POSTCODE,
    deliveryPostcode: DELIVERY_POSTCODE,
    collectionLat: collGeo.lat,
    collectionLng: collGeo.lng,
    deliveryLat: delGeo.lat,
    deliveryLng: delGeo.lng,
    podReceived: "no",
    podSent: "no",
    invoiceSent: "no",
    supplierInvoiceReceived: "no",
    supplierDueDate: isoDate(new Date(today.getTime() - 7 * 86400000)),
    billable: "yes",
    hayleighPo: "HT-TEST-PO-001",
    collectionRef: "COLL-REF-TEST-99",
    customerInvoiceRef: "CINV-TEST-1001",
    customerPaymentDate: "",
    profit,
    margin,
    notes: `Seeded test job — safe to delete. Driver portal: registration "${TEST_JOB_DRIVER_PORTAL_REGISTRATION}" + this job number (Jobs → Test job).`,
    createdAt: new Date().toISOString(),
    status: "in-progress",
    vehicleType: "Rigid truck",
    liveMapVehicleIcon: "rigid",
    officeRevision: 1,
    officeUpdatedAt: new Date().toISOString(),
  };
}

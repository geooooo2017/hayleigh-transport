import type { Customer, Driver, Job, Vehicle } from "../types";
import type { Dispatch, SetStateAction } from "react";

/** Stable id so “Load test” replaces the same job. */
export const MOBILE_TEST_JOB_ID = 91000001;

/** Enter this job number on /driver after signing in as George Sweeney / SG65 KDK */
export const MOBILE_TEST_JOB_NUMBER = "MOBILE-TEST";

/** CRM row under Customers — not a login; the app has staff + driver sign-in only. */
export const MOBILE_TEST_CUSTOMER_ID = 91000002;

/**
 * Full domestic test job: Bellshill → Mauchline, George Sweeney + SG65 KDK.
 * Seeded as **completed** with POD, supplier invoice, customer invoice and payment so it flows through
 * Job tracking, Customer Invoicing, Financial Tracking, etc. Dates are relative to “today”.
 * For live-map / driver GPS demos, set status back to **in progress** on the job detail page.
 */
export function createMobileTrackingTestJob(handlerName: string): Job {
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const daysAgo = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d;
  };

  const created = daysAgo(10);
  const collectionD = daysAgo(6);
  const deliveryD = daysAgo(4);
  const notify24h = daysAgo(5);
  const notify1h = daysAgo(4);
  const supplierDue = daysAgo(2);
  const paid = daysAgo(1);

  const sellPrice = 165;
  const fuelSurcharge = 12;
  const extraCharges = 0;
  const buyPrice = 85;
  const bibbyInvoiceValueExVat = sellPrice + fuelSurcharge + extraCharges;

  return {
    id: MOBILE_TEST_JOB_ID,
    jobNumber: MOBILE_TEST_JOB_NUMBER,
    handler: handlerName,
    routeType: "domestic",
    collectionDate: iso(collectionD),
    deliveryDate: iso(deliveryD),
    customerName: "George Sweeney (test delivery)",
    customerEmail: "george.sweeney.test@example.com",
    carrier: "Hayleigh Transport",
    truckPlates: "SG65 KDK",
    assignedDriverName: "George Sweeney",
    assignedDriverPhone: "07700900123",
    buyPrice,
    sellPrice,
    fuelSurcharge,
    extraCharges,
    profit: 68,
    margin: 41.21,
    collectionAddressLines: "Hayleigh Transport\n4 Bairdsland View\nBellshill",
    collectionContactName: "Nik Brocardo",
    collectionContactPhone: "01698 480314",
    collectionContactEmail: "Nik@hayleigh.uk",
    deliveryAddressLines: "69 Hillhead Crescent\nMauchline",
    deliveryContactName: "George Sweeney",
    deliveryContactPhone: "07700900123",
    deliveryContactEmail: "george.sweeney.test@example.com",
    collectionPostcode: "ML4 1RZ",
    deliveryPostcode: "KA5 5DW",
    collectionLat: 55.8172,
    collectionLng: -4.0264,
    deliveryLat: 55.5159,
    deliveryLng: -4.3792,
    podReceived: "yes",
    podSent: "yes",
    podFileName: "POD-MOBILE-TEST.pdf",
    invoiceSent: "yes",
    supplierInvoiceReceived: "yes",
    supplierDueDate: iso(supplierDue),
    billable: "yes",
    hayleighPo: "PO-MOBILE-TEST",
    collectionRef: "COLL-MOBILE-TEST",
    customerInvoiceRef: "INV-MOBILE-TEST-001",
    customerPaymentDate: iso(paid),
    notes:
      "MOBILE TRACKING TEST — Full demo lifecycle (completed, POD, supplier + customer invoice, paid). Driver: George Sweeney, Reg SG65 KDK, job MOBILE-TEST. For live GPS on the office map, set status to In progress on job detail (Supabase + HTTPS on phone).",
    createdAt: created.toISOString(),
    status: "completed",
    scheduledDay: "Monday",
    vehicleType: "van",
    officeRevision: 5,
    officeUpdatedAt: new Date().toISOString(),
    bibbyInvoiceValueExVat,
    bibbyDaysOutstanding: 0,
    customerNotified24hAt: notify24h.toISOString(),
    customerNotified1hEtaAt: notify1h.toISOString(),
  };
}

/** Merge test job into jobs list and seed driver “George Sweeney” for the Drivers list UI. */
export function applyMobileTrackingTestProject(
  setJobs: Dispatch<SetStateAction<Job[]>>,
  handlerName: string
): void {
  const job = createMobileTrackingTestJob(handlerName);
  setJobs((prev) => {
    const without = prev.filter((j) => j.id !== MOBILE_TEST_JOB_ID);
    return [job, ...without];
  });

  try {
    const raw = localStorage.getItem("drivers");
    const list: Driver[] = raw ? (JSON.parse(raw) as Driver[]) : [];
    if (!list.some((d) => d.name.toLowerCase() === "george sweeney")) {
      const nextId = list.length ? Math.max(...list.map((d) => d.id)) + 1 : 99001;
      list.push({
        id: nextId,
        name: "George Sweeney",
        phone: "07700900123",
        licenseNumber: "TEST",
        licenseExpiry: "2030-12-31",
        status: "active",
      });
      localStorage.setItem("drivers", JSON.stringify(list));
    }
    const vRaw = localStorage.getItem("vehicles");
    const vlist: Vehicle[] = vRaw ? (JSON.parse(vRaw) as Vehicle[]) : [];
    if (!vlist.some((v) => v.registration.replace(/\s+/g, "").toLowerCase() === "sg65kdk")) {
      const vid = vlist.length ? Math.max(...vlist.map((v) => v.id)) + 1 : 99001;
      vlist.push({
        id: vid,
        name: "Transit Connect (test)",
        registration: "SG65 KDK",
        type: "Van",
        motExpiry: "2026-12-31",
        status: "active",
      });
      localStorage.setItem("vehicles", JSON.stringify(vlist));
    }

    const cRaw = localStorage.getItem("customers");
    const clist: Customer[] = cRaw ? (JSON.parse(cRaw) as Customer[]) : [];
    const net = job.sellPrice + job.fuelSurcharge + job.extraCharges;
    const testCustomer: Customer = {
      id: MOBILE_TEST_CUSTOMER_ID,
      name: job.customerName,
      contactPerson: job.deliveryContactName,
      phone: job.deliveryContactPhone,
      email: job.deliveryContactEmail,
      address: `${job.deliveryAddressLines.replace(/\n/g, ", ")}, ${job.deliveryPostcode ?? ""}`.trim(),
      companyNumber: "",
      vatNumber: "",
      totalJobs: 1,
      totalRevenue: net,
      status: "active",
      paymentTerms: "30 days",
      creditLimit: 5000,
      notes: "Demo CRM record for MOBILE-TEST. There is no customer portal login — only office staff and drivers sign in.",
    };
    const withoutC = clist.filter((c) => c.id !== MOBILE_TEST_CUSTOMER_ID);
    localStorage.setItem("customers", JSON.stringify([testCustomer, ...withoutC]));
  } catch {
    /* ignore quota */
  }
}

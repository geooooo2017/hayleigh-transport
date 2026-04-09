export type User = {
  id: string;
  name: string;
  email: string;
  domesticRef: string;
  internationalRef: string;
};

export type JobStatus = "scheduled" | "in-progress" | "completed";

export type Job = {
  id: number;
  jobNumber: string;
  handler: string;
  routeType: "domestic" | "international";
  collectionDate: string;
  deliveryDate: string;
  customerName: string;
  /** For POD email drafts (mailto). */
  customerEmail?: string;
  carrier: string;
  truckPlates: string;
  buyPrice: number;
  sellPrice: number;
  fuelSurcharge: number;
  extraCharges: number;
  /** Street, building, premises (multiline). */
  collectionAddressLines: string;
  collectionContactName: string;
  collectionContactPhone: string;
  collectionContactEmail: string;
  /** Street, building, premises (multiline). */
  deliveryAddressLines: string;
  deliveryContactName: string;
  deliveryContactPhone: string;
  deliveryContactEmail: string;
  /** Postcode / postal code (validated in UI: mandatory; domestic = full UK format). */
  collectionPostcode?: string;
  deliveryPostcode?: string;
  /** From postcode or address geocoding for Live Tracking map. */
  collectionLat?: number;
  collectionLng?: number;
  deliveryLat?: number;
  deliveryLng?: number;
  podReceived: string;
  /** POD / paperwork sent on (customer / accounts), mirrors Hayleigh sheet “POD sent”. */
  podSent: string;
  invoiceSent: string;
  supplierInvoiceReceived: string;
  supplierDueDate: string;
  /** Ready to bill customer (yes/no), like spreadsheet “Billable”. */
  billable: string;
  /** Internal Hayleigh purchase order / reference. */
  hayleighPo: string;
  /** Collection / haulier reference. */
  collectionRef: string;
  /** Customer invoice reference (if not only job number). */
  customerInvoiceRef: string;
  /** Date customer paid (YYYY-MM-DD or free text in UI). */
  customerPaymentDate: string;
  profit: number;
  margin: number;
  /**
   * Customer invoice value (ex VAT) for invoice-financing costings.
   * If omitted, sell + fuel surcharge + extra charges are used.
   */
  bibbyInvoiceValueExVat?: number;
  /** Days the prepayment is outstanding — drives discount (interest) for the period. */
  bibbyDaysOutstanding?: number;
  notes: string;
  createdAt: string;
  status: JobStatus;
  /** Mon–Fri bucket for job board */
  scheduledDay?: string;
  vehicleType?: string;
  /** Shown to driver app; must match name they enter (e.g. Nik, Keir, Scott). */
  assignedDriverName?: string;
  /** Driver mobile for SMS links when the office updates a job (no automatic SMS without a provider API). */
  assignedDriverPhone?: string;
  /** Incremented when staff change job data — driver app shows an update alert. */
  officeRevision?: number;
  officeUpdatedAt?: string;
  /** When staff sent the ~24h customer reminder (mailto). */
  customerNotified24hAt?: string;
  /** When the ~1h ETA customer draft was triggered from live tracking. */
  customerNotified1hEtaAt?: string;
  /** Last POD file name attached in this browser (see podFileDataUrl). */
  podFileName?: string;
  /** Base64 data URL for small POD files only; large files stay session-only. */
  podFileDataUrl?: string;
};

export type Customer = {
  id: number;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  companyNumber: string;
  vatNumber: string;
  totalJobs: number;
  totalRevenue: number;
  status: string;
  paymentTerms: string;
  creditLimit: number;
  notes: string;
};

export type Driver = {
  id: number;
  name: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry: string;
  status: string;
};

export type Vehicle = {
  id: number;
  name: string;
  registration: string;
  type: string;
  motExpiry: string;
  status: string;
};

export type OnboardingState = {
  companyName: string;
  completed: boolean;
};

export type FinanceLedgerRow = {
  jobNumber: string;
  type: string;
  ref: string;
  date: string;
  customer: string;
  handler: string;
  collection: string;
  delivery: string;
  quoted: string;
  actual: string;
  invoiceNumber: string;
  status: string;
  paymentStatus: string;
  variance?: number;
  daysUnbilled?: number;
};

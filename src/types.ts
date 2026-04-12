export type User = {
  id: string;
  name: string;
  email: string;
  domesticRef: string;
  internationalRef: string;
};

export type JobStatus = "scheduled" | "in-progress" | "completed";

export type DriverReportedIssueKind = "broken-down" | "stuck-traffic" | "other";

export type DriverReportedIssue = {
  kind: DriverReportedIssueKind;
  notes: string;
  /** ISO 8601 when the driver submitted this report. */
  reportedAt: string;
};

/** Driver tried to sign in with a job number but the job had no truck plates yet — staff can approve to set plates + driver. */
export type PendingDriverAllocationRequest = {
  /** Normalised display registration (uppercase). */
  vehicleReg: string;
  driverName?: string;
  requestedAt: string;
};

/** Live Tracking map glyph. `auto` = derive from job vehicle type / defaults. */
export type LiveMapVehicleIconPreference = "auto" | "van" | "rigid" | "artic";

export type DriverPortalActivityKind =
  | "signed_in"
  | "signed_out"
  | "location_share_started"
  | "location_share_stopped"
  | "location_first_gps_sent"
  | "location_share_error"
  | "location_share_blocked_no_cloud"
  | "location_share_blocked_not_https"
  | "refresh_jobs_manual"
  | "delivery_eta_set"
  | "delivery_eta_cleared"
  | "issue_reported"
  | "issue_withdrawn"
  | "office_update_notice_shown";

export type DriverPortalActivityEntry = {
  at: string;
  kind: DriverPortalActivityKind;
  vehicleReg: string;
  driverName?: string;
  detail?: string;
};

/** One uploaded supplier invoice / cost line linked to a job (ex VAT). */
export type SupplierInvoiceLine = {
  id: string;
  /** Supplier’s invoice number or reference. */
  supplierInvoiceRef?: string;
  /** Net amount on the supplier document (ex VAT), £. */
  amountExVat: number;
  fileName?: string;
  fileDataUrl?: string;
  /** Your customer / sales invoice reference this cost ties to (defaults to job’s customer invoice ref or job number). */
  linkedCustomerInvoiceRef?: string;
  /** ISO 8601 when the line was added. */
  uploadedAt?: string;
};

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
  /**
   * Multiline address for sales invoices / accounts (may differ from collection and delivery sites).
   * If empty, the invoice PDF uses the delivery site as the billing address block.
   */
  invoiceBillingAddressLines?: string;
  invoiceBillingPostcode?: string;
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
  /** Overrides map icon for this job when not Auto (fleet vehicle reg match still wins if set). */
  liveMapVehicleIcon?: LiveMapVehicleIconPreference;
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
  /** Driver app: expected arrival at delivery (ISO 8601). */
  driverDeliveryEtaAt?: string;
  /** When the driver last set or cleared `driverDeliveryEtaAt`. */
  driverDeliveryEtaUpdatedAt?: string;
  /** Driver app: incident / delay report (shown on job board, map, notifications). */
  driverReportedIssue?: DriverReportedIssue;
  /** Driver sign-in requested vehicle assignment (job had no truck plates). */
  pendingDriverAllocationRequest?: PendingDriverAllocationRequest;
  /** Timestamped driver-app actions (sign-in, location, ETA, issues, etc.) for staff. */
  driverPortalActivity?: DriverPortalActivityEntry[];
  /** Last POD file name attached in this browser (see podFileDataUrl). */
  podFileName?: string;
  /** Base64 data URL for small POD files only; large files stay session-only. */
  podFileDataUrl?: string;
  /** Supplier invoice documents and costs; when present, their amounts sum replaces buy price for GP. */
  supplierInvoiceLines?: SupplierInvoiceLine[];
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
  /** Live map icon when this registration matches a driver pin; Auto = use job rules. */
  liveMapVehicleIcon?: LiveMapVehicleIconPreference;
};

export type OnboardingState = {
  companyName: string;
  completed: boolean;
};

/** How public /quote behaves and whether indicative costs are auto-suggested for staff. */
export type QuotationEngineMode = "automatic" | "manual" | "disabled";

/** Editable rate assumptions — staff tune these; explained on the Quotations screen. */
export type QuotationRateCard = {
  /** Indicative £ per mile for domestic estimate (before vehicle multiplier). */
  domesticPerMile: number;
  /** Multiplier on top of domestic base for international requests. */
  internationalMult: number;
  articMult: number;
  rigidMult: number;
  vanMult: number;
  /** Percentage of base transport line added as fuel surcharge line. */
  fuelPct: number;
  /** Shown to staff and can appear on internal PDF footers. */
  explanation: string;
};

export type QuotationSettings = {
  mode: QuotationEngineMode;
  rateCard: QuotationRateCard;
};

export type QuotationCostLine = {
  id: string;
  label: string;
  amountExVat: number;
  approved: boolean;
  approvedByUserId?: string;
  approvedByName?: string;
  approvedAt?: string;
};

export type QuotationStatus = "submitted" | "in_review" | "approved" | "rejected";

export type Quotation = {
  id: string;
  /** Unique permanent reference, e.g. HT-Q-00042 */
  quotationNumber: string;
  createdAt: string;
  updatedAt: string;
  source: "public_request" | "manual";
  status: QuotationStatus;
  /** Master flag: customer-facing prices may only be issued when true (logged-in approver). */
  pricesApproved: boolean;
  pricesApprovedByUserId?: string;
  pricesApprovedByName?: string;
  pricesApprovedAt?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  companyName: string;
  serviceType: string;
  collectionPostcode: string;
  deliveryPostcode: string;
  collectionDate: string;
  deliveryDate: string;
  vehicleType: string;
  goodsType: string;
  weight: string;
  length: string;
  width: string;
  height: string;
  specialRequirements: string;
  costLines: QuotationCostLine[];
  notesInternal: string;
  /** Filled when automatic engine ran (staff-only context). */
  estimatedDistanceMiles?: number;
  estimatedDurationText?: string;
};

export type PublicQuoteFormShape = {
  serviceType: string;
  collectionPostcode: string;
  deliveryPostcode: string;
  collectionDate: string;
  deliveryDate: string;
  vehicleType: string;
  goodsType: string;
  weight: string;
  length: string;
  width: string;
  height: string;
  specialRequirements: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  companyName: string;
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

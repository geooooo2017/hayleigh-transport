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
  carrier: string;
  truckPlates: string;
  buyPrice: number;
  sellPrice: number;
  fuelSurcharge: number;
  extraCharges: number;
  collectionLocation: string;
  deliveryLocation: string;
  podReceived: string;
  invoiceSent: string;
  supplierInvoiceReceived: string;
  supplierDueDate: string;
  profit: number;
  margin: number;
  notes: string;
  createdAt: string;
  status: JobStatus;
  /** Mon–Fri bucket for job board */
  scheduledDay?: string;
  vehicleType?: string;
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

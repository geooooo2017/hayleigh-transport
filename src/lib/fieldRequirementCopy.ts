/** Short explanations for staff — used in tooltips and “why this section” copy. */

export const JOB_GENERAL_WHY =
  "Correct customer, dates, and route type drive job numbers, booking PDFs, and how the job appears on the board and live map. Missing data causes wrong billing references and confused drivers.";

export const JOB_CARRIER_WHY =
  "Carrier and vehicle registration tie the job to who is actually hauling the load, match the driver app login, and appear on compliance paperwork and your jobs spreadsheet.";

export const JOB_ADDRESS_WHY =
  "Full addresses, contacts, and postcodes are mandatory so POD emails reach the right person, the map and ETA alerts work, and HMRC / customer queries can be answered from one record.";

export const JOB_MAP_WHY =
  "Postcodes anchor map pins, distance checks, and UK geocoding. Domestic jobs need full valid UK codes; international legs still need a code (any format, min. 2 characters) so coordinates can be stored consistently.";

export const JOB_FINANCE_WHY =
  "Buy, sell, fuel, and extras (all ex VAT) calculate GP and margin for every job. Without accurate figures, invoices, supplier payments, and management reports will be wrong.";

export const BIBBY_FINANCE_WHY =
  "Invoice financing fees (prepayment, service fee, optional bad debt cover, and discount/interest on the advanced amount) reduce true net profit. Rates match your Bibby agreement — edit them under Settings. Service fee covers credit control; discount fee varies with how much you draw and how long invoices stay outstanding.";

export const BIBBY_SETTINGS_WHY =
  "Prepayment %, service fee, bad debt protection, discount margin, and Bank of England base rate define how much Bibby-style finance costs per job. Change these when your facility agreement changes — job screens recalculate from the latest saved terms.";

export const JOB_REGISTER_WHY =
  "POD, invoice, and supplier flags mirror your spreadsheet so the office can see what is still owed or unpaid without opening each job folder.";

export const JOB_NOTES_WHY =
  "Optional context (access issues, special instructions) helps anyone covering the job later; nothing here blocks saving.";

export const STAFF_LOGIN_WHY =
  "Email and password identify you in the operations platform so job edits, PDFs, and settings are attributed to the right person.";

export const STAFF_REQ = {
  email: "Your account email is checked against stored credentials for this browser.",
  password: "Password confirms it is you before accessing commercial job and customer data.",
} as const;

export const DRIVER_LOGIN_WHY =
  "Name and registration must match the job in the office so only assigned drivers see their work and appear on live tracking.";

export const DRIVER_REQ = {
  name: "Must match the spelling on your assigned job so the gate shows only your work.",
  vehicle: "Must match truck plates saved on the job for verification and live map labels.",
  jobNumbers: "Office job numbers prove which runs you are on — required unless using demo live map.",
} as const;

export const SETTINGS_COMPANY_WHY =
  "Legal name, VAT number, and contact details print on customer PDFs and exports. Incomplete letterhead looks unprofessional and can delay payments if customers reject invoices.";

export const SETTINGS_PASSWORD_WHY =
  "A strong password protects commercial data (rates, customers, routes) stored in this browser session.";

export const QUOTE_WHY =
  "Accurate postcodes and dates let the office price the lane and respond with a reference customers can quote — vague enquiries cannot be priced reliably.";

export const QUOTE_REQ = {
  serviceType: "Domestic vs international changes how we price the lane.",
  collectionPostcode: "Collection postcode anchors distance and fuel estimates.",
  deliveryPostcode: "Delivery postcode completes the lane for pricing.",
  collectionDate: "Collection timing affects availability and rate windows.",
  deliveryDate: "Delivery expectation sets whether the lane is feasible.",
  vehicleType: "Vehicle class affects capacity and rate multipliers.",
  companyName: "We need a billing entity to put on the formal quote.",
  contactName: "Named contact for follow-up and booking confirmation.",
  contactEmail: "Email address to send the quote and booking details.",
  contactPhone: "Phone number if we need to clarify access or timing.",
} as const;

export const CUSTOMER_INVOICING_WHY =
  "Completed jobs must be invoiced and flagged so revenue is not forgotten and accounts can match payments to the right customer.";

export const POD_ATTACHMENT_WHY =
  "A POD file supports payment and dispute resolution. The customer email here is used for mailto drafts — add it when you plan to send POD or invoices from this screen.";

export const JOB_NOTIFICATIONS_WHY =
  "Reminder drafts need a delivery or customer contact email so the right person gets timing and unload instructions; the site does not send mail without your mail app.";

export const REQ = {
  customerName: "Customer name appears on every PDF, the job board, and invoices.",
  collectionDate: "Collection date schedules resources and customer comms.",
  deliveryDate: "Delivery date sets expectations and invoicing timing.",
  carrier: "Carrier identifies who is paid and who holds the goods in transit.",
  truckPlates: "Vehicle registration must match the driver app and your job sheet.",
  sellPrice: "Sell (ex VAT) is the amount you charge the customer — required for margin and invoices.",
  buyPrice: "Buy (ex VAT) records supplier cost for GP; enter 0 only if not yet agreed.",
  routeType: "Domestic vs international affects VAT treatment and job numbering.",
  collectionAddress: "Collection site where goods are loaded — required for drivers and POD.",
  collectionContact: "Site contact for collection — needed if the driver or office must call ahead.",
  collectionPostcode: "Postcode pins the map and validates UK legs for live tracking.",
  deliveryAddress: "Delivery site — required so the customer receives goods at the right place.",
  deliveryContact: "Delivery site contact for unload and POD.",
  deliveryPostcode: "Postcode for map, ETAs, and address verification.",
  customerEmail: "Optional for POD mailto; add when you email POD or invoices from the job.",
  assignedDriver: "Optional until you know who is driving; must match /driver sign-in when set.",
  legalName: "Registered name must match what you put on invoices to customers.",
  vatNumber: "VAT number is legally required on UK VAT invoices and many customer portals.",
  bibbyInvoiceValue:
    "Funded invoice value (ex VAT) drives prepayment, service fee, and BDP. Defaults to sell + fuel + extras if left blank.",
  bibbyDaysOutstanding:
    "Days the advance is outstanding sets the discount (interest) charge for that period — required for a full profit figure after finance.",
} as const;

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { notifyError, notifyMessage, notifySuccess } from "../lib/platformNotify";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useJobs } from "../context/JobsContext";
import { downloadBothBookingPdfs } from "../lib/jobBookingPdf";
import { getUserCompanyDetails } from "../lib/userCompanyProfile";
import { geocodeUkPostcode } from "../lib/geocode";
import { getJobAddressIssues, isRequiredEmailOk } from "../lib/jobAddressValidation";
import { computeBibbyBreakdown, resolveBibbyInvoiceValue } from "../lib/bibbyFinancing";
import {
  REQ,
  JOB_GENERAL_WHY,
  JOB_CARRIER_WHY,
  JOB_ADDRESS_WHY,
  JOB_FINANCE_WHY,
  JOB_REGISTER_WHY,
  JOB_NOTES_WHY,
} from "../lib/fieldRequirementCopy";
import { getUserBibbyTerms } from "../lib/userBibbySettings";
import { isValidUkPostcodeFormat } from "../lib/ukPostcode";
import { allocateJobNumber, previewJobNumber } from "../lib/jobNumbers";
import type { Job } from "../types";
import { BibbyJobCosting } from "../components/BibbyJobCosting";
import { MissingFieldLegend, ReqStar, WhyThisSection } from "../components/FormGuidance";
import { Btn, Card } from "../components/Layout";
import { platformPath } from "../routes/paths";

export default function JobCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [, setJobs] = useJobs();

  const [routeType, setRouteType] = useState<"domestic" | "international">("domestic");
  const [collectionDate, setCollectionDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [carrier, setCarrier] = useState("");
  const [truckPlates, setTruckPlates] = useState("");
  const [assignedDriverName, setAssignedDriverName] = useState("");
  const [collectionAddressLines, setCollectionAddressLines] = useState("");
  const [collectionContactName, setCollectionContactName] = useState("");
  const [collectionContactPhone, setCollectionContactPhone] = useState("");
  const [collectionContactEmail, setCollectionContactEmail] = useState("");
  const [collectionPostcode, setCollectionPostcode] = useState("");
  const [deliveryAddressLines, setDeliveryAddressLines] = useState("");
  const [deliveryContactName, setDeliveryContactName] = useState("");
  const [deliveryContactPhone, setDeliveryContactPhone] = useState("");
  const [deliveryContactEmail, setDeliveryContactEmail] = useState("");
  const [deliveryPostcode, setDeliveryPostcode] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [fuelSurcharge, setFuelSurcharge] = useState("0");
  const [extraCharges, setExtraCharges] = useState("0");
  const [podReceived, setPodReceived] = useState("no");
  const [podSent, setPodSent] = useState("no");
  const [invoiceSent, setInvoiceSent] = useState("no");
  const [supplierInvoiceReceived, setSupplierInvoiceReceived] = useState("no");
  const [supplierDueDate, setSupplierDueDate] = useState("");
  const [billable, setBillable] = useState("no");
  const [hayleighPo, setHayleighPo] = useState("");
  const [collectionRef, setCollectionRef] = useState("");
  const [customerInvoiceRef, setCustomerInvoiceRef] = useState("");
  const [customerPaymentDate, setCustomerPaymentDate] = useState("");
  const [notes, setNotes] = useState("");
  const [bibbyInvoiceStr, setBibbyInvoiceStr] = useState("");
  const [bibbyDaysStr, setBibbyDaysStr] = useState("");
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (user) setPreview(previewJobNumber(user, routeType));
  }, [user, routeType]);

  const buy = parseFloat(buyPrice) || 0;
  const sell = parseFloat(sellPrice) || 0;
  const fuel = parseFloat(fuelSurcharge) || 0;
  const extra = parseFloat(extraCharges) || 0;
  const profit = sell - buy - fuel - extra;
  const margin = sell > 0 ? (profit / sell) * 100 : 0;

  const marginClass =
    margin < 0 ? "text-red-600" : margin < 15 ? "text-orange-600" : margin < 25 ? "text-yellow-600" : "text-green-600";

  const bibbyTerms = useMemo(() => getUserBibbyTerms(user?.id), [user?.id]);

  const createBibbyDraft = useMemo((): Pick<
    Job,
    "sellPrice" | "buyPrice" | "fuelSurcharge" | "extraCharges" | "bibbyInvoiceValueExVat" | "bibbyDaysOutstanding"
  > => {
    const invParsed = bibbyInvoiceStr.trim() === "" ? NaN : parseFloat(bibbyInvoiceStr);
    const invOverride = Number.isFinite(invParsed) && invParsed > 0 ? invParsed : undefined;
    const daysParsed = bibbyDaysStr.trim() === "" ? undefined : Math.max(0, Math.floor(Number(bibbyDaysStr) || 0));
    return {
      sellPrice: sell,
      buyPrice: buy,
      fuelSurcharge: fuel,
      extraCharges: extra,
      bibbyInvoiceValueExVat: invOverride,
      bibbyDaysOutstanding: daysParsed,
    };
  }, [sell, buy, fuel, extra, bibbyInvoiceStr, bibbyDaysStr]);

  const bibbyBreakdown = useMemo(
    () => computeBibbyBreakdown(createBibbyDraft, bibbyTerms),
    [createBibbyDraft, bibbyTerms]
  );

  const bibbyNetTurnover = sell + fuel + extra;
  const bibbyInvoiceMiss = resolveBibbyInvoiceValue(createBibbyDraft) <= 0;
  const bibbyDaysMiss = bibbyDaysStr.trim() === "";

  const miss = useMemo(() => {
    const cPc = collectionPostcode.trim();
    const dPc = deliveryPostcode.trim();
    const pcBad = (pc: string) => {
      if (!pc) return true;
      if (routeType === "domestic") return !isValidUkPostcodeFormat(pc);
      return pc.length < 2;
    };
    return {
      customer: !customerName.trim(),
      collectionDate: !collectionDate,
      deliveryDate: !deliveryDate.trim(),
      carrier: !carrier.trim(),
      truck: !truckPlates.trim(),
      sell: !(parseFloat(sellPrice) > 0),
      buy: buyPrice.trim() === "",
      cAddr: !collectionAddressLines.trim(),
      cName: !collectionContactName.trim(),
      cPhone: !collectionContactPhone.trim(),
      cEmail: !isRequiredEmailOk(collectionContactEmail),
      cPc: pcBad(cPc),
      dAddr: !deliveryAddressLines.trim(),
      dName: !deliveryContactName.trim(),
      dPhone: !deliveryContactPhone.trim(),
      dEmail: !isRequiredEmailOk(deliveryContactEmail),
      dPc: pcBad(dPc),
    };
  }, [
    customerName,
    collectionDate,
    deliveryDate,
    carrier,
    truckPlates,
    sellPrice,
    buyPrice,
    collectionAddressLines,
    collectionContactName,
    collectionContactPhone,
    collectionContactEmail,
    collectionPostcode,
    deliveryAddressLines,
    deliveryContactName,
    deliveryContactPhone,
    deliveryContactEmail,
    deliveryPostcode,
    routeType,
  ]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const cPc = collectionPostcode.trim();
    const dPc = deliveryPostcode.trim();

    const critical: string[] = [];
    if (!customerName.trim()) critical.push("Customer name");
    if (!collectionDate) critical.push("Collection date");
    if (!deliveryDate.trim()) critical.push("Delivery date");
    if (!carrier.trim()) critical.push("Carrier");
    if (!truckPlates.trim()) critical.push("Truck registration");
    if (buyPrice.trim() === "") critical.push("Buy price (ex VAT) — enter 0 if unknown");
    if (!(parseFloat(sellPrice) > 0)) critical.push("Sell price (ex VAT) must be greater than zero");
    if (critical.length > 0) {
      notifyError("Complete critical job details", { description: critical.join(" · ") });
      return;
    }

    const addressCheck = getJobAddressIssues({
      routeType,
      collectionAddressLines: collectionAddressLines.trim(),
      collectionContactName: collectionContactName.trim(),
      collectionContactPhone: collectionContactPhone.trim(),
      collectionContactEmail: collectionContactEmail.trim(),
      collectionPostcode: cPc || undefined,
      deliveryAddressLines: deliveryAddressLines.trim(),
      deliveryContactName: deliveryContactName.trim(),
      deliveryContactPhone: deliveryContactPhone.trim(),
      deliveryContactEmail: deliveryContactEmail.trim(),
      deliveryPostcode: dPc || undefined,
    });
    if (addressCheck.length > 0) {
      notifyError("Complete collection & delivery details", { description: addressCheck.slice(0, 5).join(" · ") });
      return;
    }

    const jobNumber = allocateJobNumber(user, routeType);

    let collectionLat: number | undefined;
    let collectionLng: number | undefined;
    let deliveryLat: number | undefined;
    let deliveryLng: number | undefined;

    if (routeType === "domestic") {
      const c = await geocodeUkPostcode(cPc);
      if (!c) {
        notifyError("Collection postcode not recognised", { description: "Check the UK postcode." });
        return;
      }
      collectionLat = c.lat;
      collectionLng = c.lng;
      const d = await geocodeUkPostcode(dPc);
      if (!d) {
        notifyError("Delivery postcode not recognised", { description: "Check the UK postcode." });
        return;
      }
      deliveryLat = d.lat;
      deliveryLng = d.lng;
    } else {
      if (isValidUkPostcodeFormat(cPc)) {
        const c = await geocodeUkPostcode(cPc);
        if (c) {
          collectionLat = c.lat;
          collectionLng = c.lng;
        }
      }
      if (isValidUkPostcodeFormat(dPc)) {
        const d = await geocodeUkPostcode(dPc);
        if (d) {
          deliveryLat = d.lat;
          deliveryLng = d.lng;
        }
      }
    }

    const invParsed = bibbyInvoiceStr.trim() === "" ? NaN : parseFloat(bibbyInvoiceStr);
    const bibbyInvoiceValueExVat =
      Number.isFinite(invParsed) && invParsed > 0 ? invParsed : undefined;
    const bibbyDaysOutstanding =
      bibbyDaysStr.trim() === "" ? undefined : Math.max(0, Math.floor(Number(bibbyDaysStr) || 0));

    const job: Job = {
      id: Date.now(),
      jobNumber,
      handler: user.name,
      routeType,
      collectionDate,
      deliveryDate,
      customerName,
      customerEmail: customerEmail.trim() || undefined,
      carrier,
      truckPlates,
      assignedDriverName: assignedDriverName.trim() || undefined,
      buyPrice: buy,
      sellPrice: sell,
      fuelSurcharge: fuel,
      extraCharges: extra,
      bibbyInvoiceValueExVat,
      bibbyDaysOutstanding,
      collectionAddressLines: collectionAddressLines.trim(),
      collectionContactName: collectionContactName.trim(),
      collectionContactPhone: collectionContactPhone.trim(),
      collectionContactEmail: collectionContactEmail.trim(),
      deliveryAddressLines: deliveryAddressLines.trim(),
      deliveryContactName: deliveryContactName.trim(),
      deliveryContactPhone: deliveryContactPhone.trim(),
      deliveryContactEmail: deliveryContactEmail.trim(),
      collectionPostcode: cPc || undefined,
      deliveryPostcode: dPc || undefined,
      collectionLat,
      collectionLng,
      deliveryLat,
      deliveryLng,
      podReceived,
      podSent,
      invoiceSent,
      supplierInvoiceReceived,
      supplierDueDate,
      billable,
      hayleighPo: hayleighPo.trim(),
      collectionRef: collectionRef.trim(),
      customerInvoiceRef: customerInvoiceRef.trim(),
      customerPaymentDate: customerPaymentDate.trim(),
      profit,
      margin,
      notes,
      createdAt: new Date().toISOString(),
      status: "scheduled",
      officeRevision: 0,
      officeUpdatedAt: new Date().toISOString(),
    };
    setJobs((prev) => [...prev, job]);
    notifySuccess(`Job ${jobNumber} created successfully!`, { href: platformPath(`/jobs/${job.id}`) });
    try {
      await downloadBothBookingPdfs(job, {
        details: getUserCompanyDetails(user?.id),
        preparedBy: user.name,
      });
      notifySuccess("Booking PDFs saved", {
        description: "Customer confirmation and supplier instruction.",
        href: platformPath(`/jobs/${job.id}`),
      });
    } catch {
      notifyMessage("PDF download skipped", {
        description: "Open the job to generate booking PDFs.",
        href: platformPath(`/jobs/${job.id}`),
      });
    }
    navigate(platformPath("/jobs"));
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 lg:space-y-6">
      <div className="flex items-center gap-4">
        <Link to={platformPath("/jobs")}>
          <Btn variant="outline" className="gap-2 py-1.5 text-sm">
            <ArrowLeft size={16} /> Back
          </Btn>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 lg:text-3xl">Create New Job</h1>
          <p className="mt-1 text-sm text-gray-500 lg:text-base">Fill in the details below to create a new transport job</p>
        </div>
      </div>

      <MissingFieldLegend />

      <form onSubmit={onSubmit} className="space-y-6">
        <Card className="border-ht-border bg-ht-canvas p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="mb-1 text-sm text-gray-600">Job Number (Auto-generated)</div>
              <div className="text-3xl font-semibold text-ht-slate">{preview || "—"}</div>
            </div>
            <div className="text-right">
              <div className="mb-1 text-sm text-gray-600">Handler</div>
              <div className="text-lg font-semibold text-gray-900">{user?.name}</div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-2 text-lg font-semibold">General Information</h2>
          <WhyThisSection>
            <span className="block">{JOB_GENERAL_WHY}</span>
            <span className="mt-2 block">{JOB_CARRIER_WHY}</span>
          </WhyThisSection>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Route Type</label>
              <select
                value={routeType}
                onChange={(e) => setRouteType(e.target.value as "domestic" | "international")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
                required
              >
                <option value="domestic">Domestic (GB → GB)</option>
                <option value="international">International (GB → EU/World)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Customer
                <ReqStar show={miss.customer} why={REQ.customerName} />
              </label>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g., Amazon, DHL, Tesco"
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Customer email
                <span className="ml-1 text-xs font-normal text-gray-500">(optional)</span>
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="For POD / invoice emails"
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Collection date
                <ReqStar show={miss.collectionDate} why={REQ.collectionDate} />
              </label>
              <input
                type="date"
                value={collectionDate}
                onChange={(e) => setCollectionDate(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Delivery date
                <ReqStar show={miss.deliveryDate} why={REQ.deliveryDate} />
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Carrier
                <ReqStar show={miss.carrier} why={REQ.carrier} />
              </label>
              <input
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                placeholder="e.g., DSV, Wincanton"
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Truck registration
                <ReqStar show={miss.truck} why={REQ.truckPlates} />
              </label>
              <input
                value={truckPlates}
                onChange={(e) => setTruckPlates(e.target.value)}
                placeholder="e.g., AB12 CDE"
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">
                Assigned driver (driver app)
                <span className="ml-1 text-xs font-normal text-gray-500">(optional until known)</span>
              </label>
              <input
                value={assignedDriverName}
                onChange={(e) => setAssignedDriverName(e.target.value)}
                placeholder="e.g. Nik, Keir, Scott — must match what the driver enters"
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
              />
              <p className="mt-1 text-xs text-gray-500">
                {REQ.assignedDriver} Drivers sign in at /driver with this name, the truck reg above, and the job number.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-2 text-lg font-semibold">Collection &amp; delivery (full details)</h2>
          <WhyThisSection>{JOB_ADDRESS_WHY}</WhyThisSection>
          <p className="mb-4 text-sm text-gray-600">
            All fields below are <strong>required</strong>. Domestic jobs use full UK postcodes (geocoded for Live Tracking).
            International jobs need postcodes or postal codes for both ends (EU codes are saved; UK-format codes are geocoded
            when possible).
          </p>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="space-y-3 rounded-lg border border-emerald-200/80 bg-emerald-50/30 p-4">
              <h3 className="text-sm font-semibold text-emerald-900">Collection</h3>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Address (street, building, company)
                  <ReqStar show={miss.cAddr} why={REQ.collectionAddress} />
                </label>
                <textarea
                  value={collectionAddressLines}
                  onChange={(e) => setCollectionAddressLines(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                  placeholder="Line 1, line 2, town…"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Contact name
                  <ReqStar show={miss.cName} why={REQ.collectionContact} />
                </label>
                <input
                  value={collectionContactName}
                  onChange={(e) => setCollectionContactName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Contact phone
                  <ReqStar show={miss.cPhone} why={REQ.collectionContact} />
                </label>
                <input
                  type="tel"
                  value={collectionContactPhone}
                  onChange={(e) => setCollectionContactPhone(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Contact email
                  <ReqStar show={miss.cEmail} why={REQ.collectionContact} />
                </label>
                <input
                  type="email"
                  value={collectionContactEmail}
                  onChange={(e) => setCollectionContactEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Postcode
                  <ReqStar show={miss.cPc} why={REQ.collectionPostcode} />
                </label>
                <input
                  value={collectionPostcode}
                  onChange={(e) => setCollectionPostcode(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 uppercase"
                  placeholder={routeType === "domestic" ? "Full UK e.g. M1 1AA" : "e.g. UK or EU postal code"}
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  {routeType === "domestic" ? "Full valid UK postcode (no partials)." : "Required — use the best postcode or postal code available."}
                </p>
              </div>
            </div>
            <div className="space-y-3 rounded-lg border border-red-200/80 bg-red-50/20 p-4">
              <h3 className="text-sm font-semibold text-red-900">Delivery</h3>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Address (street, building, company)
                  <ReqStar show={miss.dAddr} why={REQ.deliveryAddress} />
                </label>
                <textarea
                  value={deliveryAddressLines}
                  onChange={(e) => setDeliveryAddressLines(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                  placeholder="Line 1, line 2, town…"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Contact name
                  <ReqStar show={miss.dName} why={REQ.deliveryContact} />
                </label>
                <input
                  value={deliveryContactName}
                  onChange={(e) => setDeliveryContactName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Contact phone
                  <ReqStar show={miss.dPhone} why={REQ.deliveryContact} />
                </label>
                <input
                  type="tel"
                  value={deliveryContactPhone}
                  onChange={(e) => setDeliveryContactPhone(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Contact email
                  <ReqStar show={miss.dEmail} why={REQ.deliveryContact} />
                </label>
                <input
                  type="email"
                  value={deliveryContactEmail}
                  onChange={(e) => setDeliveryContactEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Postcode
                  <ReqStar show={miss.dPc} why={REQ.deliveryPostcode} />
                </label>
                <input
                  value={deliveryPostcode}
                  onChange={(e) => setDeliveryPostcode(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 uppercase"
                  placeholder={routeType === "domestic" ? "Full UK e.g. B1 1AA" : "e.g. UK or EU postal code"}
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  {routeType === "domestic" ? "Full valid UK postcode." : "Required — use the best postcode or postal code available."}
                </p>
              </div>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            Incomplete addresses show in the bell notifications until every field above is filled.
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="mb-2 text-lg font-semibold">Financial information (ex VAT)</h2>
          <WhyThisSection>{JOB_FINANCE_WHY}</WhyThisSection>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Buy price (ex VAT)
                <ReqStar show={miss.buy} why={REQ.buyPrice} />
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                <input
                  type="number"
                  step="0.01"
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-3"
                  required
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Sell price (ex VAT)
                <ReqStar show={miss.sell} why={REQ.sellPrice} />
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                <input
                  type="number"
                  step="0.01"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-3"
                  required
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Fuel Surcharge</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                <input
                  type="number"
                  step="0.01"
                  value={fuelSurcharge}
                  onChange={(e) => setFuelSurcharge(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-3"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Extra Charges</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                <input
                  type="number"
                  step="0.01"
                  value={extraCharges}
                  onChange={(e) => setExtraCharges(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-3"
                />
              </div>
            </div>
          </div>
          <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-wrap justify-between gap-4">
              <div>
                <div className="text-sm text-gray-600">Estimated Profit</div>
                <div className={`text-2xl font-semibold ${marginClass}`}>£{profit.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Margin</div>
                <div className={`text-2xl font-semibold ${marginClass}`}>{margin.toFixed(1)}%</div>
              </div>
            </div>
          </div>
          <BibbyJobCosting
            terms={bibbyTerms}
            breakdown={bibbyBreakdown}
            invoiceValueInput={bibbyInvoiceStr}
            daysOutstandingInput={bibbyDaysStr}
            onInvoiceChange={setBibbyInvoiceStr}
            onDaysChange={setBibbyDaysStr}
            invoiceMiss={bibbyInvoiceMiss}
            daysMiss={bibbyDaysMiss}
            netTurnoverHint={bibbyNetTurnover}
          />
        </Card>

        <Card className="p-6">
          <h2 className="mb-2 text-lg font-semibold">Job register &amp; paperwork</h2>
          <WhyThisSection>{JOB_REGISTER_WHY}</WhyThisSection>
          <p className="mb-4 text-sm text-gray-600">
            Same flow as the Hayleigh job spreadsheet: billing flags, POD, invoices, supplier payment, and references. Set
            accurate statuses as the job progresses so accounts and notifications stay reliable.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Billable</label>
              <select
                value={billable}
                onChange={(e) => setBillable(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">POD received</label>
              <select
                value={podReceived}
                onChange={(e) => setPodReceived(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">POD sent</label>
              <select
                value={podSent}
                onChange={(e) => setPodSent(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Customer invoice sent</label>
              <select
                value={invoiceSent}
                onChange={(e) => setInvoiceSent(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Supplier invoice received (Inv rec)</label>
              <select
                value={supplierInvoiceReceived}
                onChange={(e) => setSupplierInvoiceReceived(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Supplier due (payment)</label>
              <input
                type="date"
                value={supplierDueDate}
                onChange={(e) => setSupplierDueDate(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Customer payment date</label>
              <input
                type="date"
                value={customerPaymentDate}
                onChange={(e) => setCustomerPaymentDate(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Hayleigh PO</label>
              <input
                value={hayleighPo}
                onChange={(e) => setHayleighPo(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
                placeholder="Internal PO #"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Collection ref</label>
              <input
                value={collectionRef}
                onChange={(e) => setCollectionRef(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">Customer invoice ref</label>
              <input
                value={customerInvoiceRef}
                onChange={(e) => setCustomerInvoiceRef(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
                placeholder="If different from job number"
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-2 text-lg font-semibold">Notes</h2>
          <WhyThisSection>{JOB_NOTES_WHY}</WhyThisSection>
          <label className="mb-2 block text-sm font-medium">Internal notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-gray-200 px-3 py-2"
            placeholder="Internal notes…"
          />
        </Card>

        <div className="flex gap-3">
          <Btn type="submit">Create Job</Btn>
          <Link to={platformPath("/jobs")}>
            <Btn type="button" variant="outline">
              Cancel
            </Btn>
          </Link>
        </div>
      </form>
    </div>
  );
}

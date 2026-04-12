import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { notifyError, notifySuccess } from "../lib/platformNotify";
import { Check, ChevronRight, Truck } from "lucide-react";
import { CompanyLogo } from "../components/CompanyLogo";
import { MissingFieldLegend, ReqStar, WhyThisSection } from "../components/FormGuidance";
import { Btn, Card } from "../components/Layout";
import { mailtoOffice, OFFICE_ENQUIRIES_EMAIL } from "../lib/companyBrand";
import { QUOTE_REQ, QUOTE_WHY } from "../lib/fieldRequirementCopy";
import { looksLikeEmail } from "../lib/podMailto";
import { readQuotationSettings } from "../lib/quotationSettings";
import { appendQuotation, createQuotationFromPublicRequest } from "../lib/quotationStorage";

type QuoteForm = {
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

const empty: QuoteForm = {
  serviceType: "",
  collectionPostcode: "",
  deliveryPostcode: "",
  collectionDate: "",
  deliveryDate: "",
  vehicleType: "",
  goodsType: "",
  weight: "",
  length: "",
  width: "",
  height: "",
  specialRequirements: "",
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  companyName: "",
};

export default function QuotePage() {
  const [quoteSettings] = useState(() => readQuotationSettings());
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<QuoteForm>(empty);
  const [result, setResult] = useState<{ quotationNumber: string } | null>(null);

  const set = (k: keyof QuoteForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const quoteMiss1 = useMemo(
    () => ({
      service: !form.serviceType,
      cPc: !form.collectionPostcode.trim(),
      dPc: !form.deliveryPostcode.trim(),
      cDate: !form.collectionDate,
      dDate: !form.deliveryDate,
      vehicle: !form.vehicleType,
    }),
    [
      form.serviceType,
      form.collectionPostcode,
      form.deliveryPostcode,
      form.collectionDate,
      form.deliveryDate,
      form.vehicleType,
    ]
  );

  const quoteMiss2 = useMemo(
    () => ({
      company: !form.companyName.trim(),
      name: !form.customerName.trim(),
      email: !looksLikeEmail(form.customerEmail),
      phone: !form.customerPhone.trim(),
    }),
    [form.companyName, form.customerName, form.customerEmail, form.customerPhone]
  );

  const submitRequest = () => {
    if (!form.companyName.trim() || !form.customerName.trim() || !looksLikeEmail(form.customerEmail) || !form.customerPhone.trim()) {
      notifyError("Complete your contact details", {
        description: "Company, contact name, a valid email, and phone are required to log your request.",
      });
      return;
    }
    const settings = readQuotationSettings();
    const q = createQuotationFromPublicRequest(
      {
        serviceType: form.serviceType,
        collectionPostcode: form.collectionPostcode,
        deliveryPostcode: form.deliveryPostcode,
        collectionDate: form.collectionDate,
        deliveryDate: form.deliveryDate,
        vehicleType: form.vehicleType,
        goodsType: form.goodsType,
        weight: form.weight,
        length: form.length,
        width: form.width,
        height: form.height,
        specialRequirements: form.specialRequirements,
        customerName: form.customerName,
        customerEmail: form.customerEmail,
        customerPhone: form.customerPhone,
        companyName: form.companyName,
      },
      settings
    );
    appendQuotation(q);
    setResult({ quotationNumber: q.quotationNumber });
    setStep(3);
    notifySuccess(`Request logged — ${q.quotationNumber}`, {
      description:
        settings.mode === "automatic"
          ? "Indicative costs may be pre-filled for the office; you will not see prices until someone approves them."
          : "Our office will build costs manually. You will not see prices until someone approves them.",
      href: "/quote",
    });
  };

  const next1 = () => {
    if (!form.serviceType) {
      notifyError("Select a service type");
      return;
    }
    if (!form.collectionPostcode.trim() || !form.deliveryPostcode.trim()) {
      notifyError("Enter collection and delivery postcodes");
      return;
    }
    if (!form.collectionDate || !form.deliveryDate) {
      notifyError("Enter collection and delivery dates");
      return;
    }
    if (!form.vehicleType) {
      notifyError("Select a vehicle type");
      return;
    }
    setStep(2);
  };

  if (quoteSettings.mode === "disabled") {
    return (
      <div className="min-h-screen bg-ht-canvas">
        <div className="relative overflow-hidden bg-gradient-to-br from-ht-navy via-ht-navy-mid to-ht-slate py-16 text-white">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_40%,rgba(217,119,6,0.08)_100%)]" />
          <div className="relative mx-auto max-w-3xl px-6 text-center">
            <div className="mb-6 flex justify-center">
              <div className="rounded-lg border border-white/30 bg-white p-2 shadow-lg">
                <CompanyLogo className="h-10 w-auto max-w-[200px] object-contain md:h-12" />
              </div>
            </div>
            <h1 className="mb-4 text-3xl font-bold md:text-4xl">Request a quote</h1>
            <p className="text-lg text-slate-300">
              Online quoting is turned off. Please contact the transport office directly — we will still handle your enquiry in the usual way.
            </p>
            <p className="mt-6 text-sm text-slate-400">
              <Link to="/login" className="font-medium text-white underline decoration-ht-amber/60 hover:decoration-white">
                Staff — operations login
              </Link>
            </p>
          </div>
        </div>
        <div className="mx-auto max-w-xl px-6 py-12">
          <Card className="rounded-2xl p-8 text-center shadow-lg">
            <p className="text-slate-700">
              For haulage quotes and bookings, email{" "}
              <a className="font-medium text-ht-slate underline" href={`mailto:${OFFICE_ENQUIRIES_EMAIL}`}>
                {OFFICE_ENQUIRIES_EMAIL}
              </a>{" "}
              or call the number on our website. Firm prices are only issued after the office has reviewed your lane.
            </p>
            <Btn className="mt-6" onClick={() => window.location.assign(mailtoOffice("Transport quote enquiry", ""))}>
              Email the office
            </Btn>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ht-canvas">
      <div className="relative overflow-hidden bg-gradient-to-br from-ht-navy via-ht-navy-mid to-ht-slate py-16 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_40%,rgba(217,119,6,0.08)_100%)]" />
        <div className="relative mx-auto max-w-6xl px-6 text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-lg border border-white/30 bg-white p-2 shadow-lg">
              <CompanyLogo className="h-10 w-auto max-w-[200px] object-contain md:h-12" />
            </div>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400/90">Haulage quote</p>
          <h1 className="mb-4 mt-3 text-4xl font-bold md:text-5xl">Request a transport quote</h1>
          <p className="mb-8 text-lg text-slate-300 md:text-xl">
            UK and international road freight — your request is logged with a reference. Firm prices are only shared after our
            office has reviewed and approved costs.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-200 md:gap-10">
            {["Structured enquiry form", "Suitable vehicle classes", "Email the office in one tap", "Professional haulier"].map((t) => (
              <div key={t} className="flex items-center gap-2">
                <Check className="h-5 w-5 shrink-0 text-amber-400" />
                <span>{t}</span>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm text-slate-400">
            <Link to="/login" className="font-medium text-white underline decoration-ht-amber/60 hover:decoration-white">
              Staff — operations login
            </Link>
          </p>
          <p className="mt-3 text-sm text-slate-400">
            <Link
              to="/report-issue"
              className="font-medium text-white/90 underline decoration-white/40 hover:decoration-white"
            >
              Problem with this page? Report a technical issue
            </Link>
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-12">
        <WhyThisSection>{QUOTE_WHY}</WhyThisSection>
        <MissingFieldLegend />

        <div className="mb-12 flex items-center justify-center gap-4">
          {[
            { n: 1, l: "Journey Details" },
            { n: 2, l: "Your Details" },
            { n: 3, l: "Confirmation" },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center gap-4">
              {i > 0 && <ChevronRight size={20} className="text-gray-400" />}
              <div className={`flex items-center gap-2 ${step >= s.n ? "text-ht-slate" : "text-gray-400"}`}>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold ${
                    step >= s.n ? "bg-ht-slate text-white" : "bg-gray-200"
                  }`}
                >
                  {s.n}
                </div>
                <span className="hidden font-medium md:block">{s.l}</span>
              </div>
            </div>
          ))}
        </div>

        {step === 1 && (
          <Card className="rounded-2xl shadow-lg">
            <div className="border-b border-ht-border bg-ht-canvas/40 px-6 py-4">
              <h2 className="text-2xl font-semibold text-ht-navy">Journey details</h2>
            </div>
            <div className="space-y-6 p-6">
              <div>
                <p className="mb-3 block text-base font-semibold">
                  Service Type
                  <ReqStar show={quoteMiss1.service} why={QUOTE_REQ.serviceType} />
                </p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => set("serviceType", "domestic")}
                    className={`rounded-xl border-2 p-6 text-left transition-all ${
                      form.serviceType === "domestic"
                        ? "border-ht-slate bg-ht-slate/5"
                        : "border-ht-border hover:border-slate-300"
                    }`}
                  >
                    <Truck size={32} className={form.serviceType === "domestic" ? "text-ht-slate" : "text-gray-400"} />
                    <h3 className="mt-3 text-lg font-semibold">UK Domestic</h3>
                    <p className="mt-1 text-sm text-gray-600">Nationwide delivery across the UK</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => set("serviceType", "international")}
                    className={`rounded-xl border-2 p-6 text-left transition-all ${
                      form.serviceType === "international"
                        ? "border-ht-slate bg-ht-slate/5"
                        : "border-ht-border hover:border-slate-300"
                    }`}
                  >
                    <Truck size={32} className={form.serviceType === "international" ? "text-ht-slate" : "text-gray-400"} />
                    <h3 className="mt-3 text-lg font-semibold">International</h3>
                    <p className="mt-1 text-sm text-gray-600">UK to EU and worldwide</p>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Collection postcode
                    <ReqStar show={quoteMiss1.cPc} why={QUOTE_REQ.collectionPostcode} />
                  </label>
                  <input
                    className="w-full rounded-lg border border-ht-border px-3 py-2 outline-none focus:ring-2 focus:ring-ht-slate/20"
                    value={form.collectionPostcode}
                    onChange={(e) => set("collectionPostcode", e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Delivery postcode
                    <ReqStar show={quoteMiss1.dPc} why={QUOTE_REQ.deliveryPostcode} />
                  </label>
                  <input
                    className="w-full rounded-lg border border-ht-border px-3 py-2 outline-none focus:ring-2 focus:ring-ht-slate/20"
                    value={form.deliveryPostcode}
                    onChange={(e) => set("deliveryPostcode", e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Collection date
                    <ReqStar show={quoteMiss1.cDate} why={QUOTE_REQ.collectionDate} />
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-ht-border px-3 py-2 outline-none focus:ring-2 focus:ring-ht-slate/20"
                    value={form.collectionDate}
                    onChange={(e) => set("collectionDate", e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Delivery date
                    <ReqStar show={quoteMiss1.dDate} why={QUOTE_REQ.deliveryDate} />
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-ht-border px-3 py-2 outline-none focus:ring-2 focus:ring-ht-slate/20"
                    value={form.deliveryDate}
                    onChange={(e) => set("deliveryDate", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Vehicle type
                  <ReqStar show={quoteMiss1.vehicle} why={QUOTE_REQ.vehicleType} />
                </label>
                <select
                  className="w-full rounded-lg border border-ht-border px-3 py-2 outline-none focus:ring-2 focus:ring-ht-slate/20"
                  value={form.vehicleType}
                  onChange={(e) => set("vehicleType", e.target.value)}
                >
                  <option value="">Select…</option>
                  <option value="van">Van</option>
                  <option value="rigid">Rigid</option>
                  <option value="artic">Artic</option>
                </select>
              </div>
              <Btn className="w-full" onClick={next1}>
                Continue
              </Btn>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card className="rounded-2xl shadow-lg">
            <div className="border-b border-ht-border bg-ht-canvas/40 px-6 py-4">
              <h2 className="text-2xl font-semibold text-ht-navy">Your details</h2>
            </div>
            <div className="space-y-4 p-6">
              {(
                [
                  ["companyName", "Company name", quoteMiss2.company, QUOTE_REQ.companyName],
                  ["customerName", "Contact name", quoteMiss2.name, QUOTE_REQ.contactName],
                  ["customerEmail", "Email", quoteMiss2.email, QUOTE_REQ.contactEmail],
                  ["customerPhone", "Phone", quoteMiss2.phone, QUOTE_REQ.contactPhone],
                ] as const
              ).map(([k, label, miss, why]) => (
                <div key={k}>
                  <label className="mb-1 block text-sm font-medium">
                    {label}
                    <ReqStar show={miss} why={why} />
                  </label>
                  <input
                    className="w-full rounded-lg border border-ht-border px-3 py-2 outline-none focus:ring-2 focus:ring-ht-slate/20"
                    value={form[k]}
                    onChange={(e) => set(k, e.target.value)}
                  />
                </div>
              ))}
              <div className="flex gap-3">
                <Btn variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  Back
                </Btn>
                <Btn className="flex-1" onClick={() => submitRequest()}>
                  Submit request
                </Btn>
              </div>
            </div>
          </Card>
        )}

        {step === 3 && result && (
          <Card className="rounded-2xl shadow-lg">
            <div className="border-b border-ht-border bg-ht-canvas/40 px-6 py-4">
              <div className="mb-4 flex justify-center border-b border-ht-border pb-4">
                <CompanyLogo className="h-12 w-auto max-w-[220px] object-contain" />
              </div>
              <h2 className="text-2xl font-semibold text-ht-navy">Request received</h2>
              <p className="text-sm text-gray-500">Quotation reference: {result.quotationNumber}</p>
            </div>
            <div className="space-y-4 p-6">
              <p className="text-sm leading-relaxed text-gray-700">
                Thank you — your enquiry is saved on our system.{" "}
                <strong>We do not show prices on this page.</strong> A member of the team will build or review costs; you will
                only receive figures once a logged-in user has approved them. You may use the reference above in any follow-up.
              </p>
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                Tip: operations staff can open <strong>Quotations</strong> after signing in to edit lines, approve prices, and
                export a customer PDF.
              </div>
              <div className="flex flex-wrap gap-2">
                <Btn
                  onClick={() => {
                    const body = [
                      "Please follow up on this online quote request.",
                      "",
                      `Quotation reference: ${result.quotationNumber}`,
                      "(No pricing on this email — awaiting office review and approval.)",
                      "",
                      "Contact",
                      `Name: ${form.customerName}`,
                      `Company: ${form.companyName}`,
                      `Email: ${form.customerEmail}`,
                      `Phone: ${form.customerPhone}`,
                      "",
                      "Journey",
                      `Service: ${form.serviceType}`,
                      `Collection: ${form.collectionPostcode} — ${form.collectionDate}`,
                      `Delivery: ${form.deliveryPostcode} — ${form.deliveryDate}`,
                      `Vehicle type: ${form.vehicleType}`,
                      form.specialRequirements ? `\nNotes:\n${form.specialRequirements}` : "",
                    ]
                      .filter(Boolean)
                      .join("\n");
                    window.location.assign(mailtoOffice(`Quote enquiry ${result.quotationNumber}`, body));
                    notifySuccess("Opening your email app", {
                      description: `Send the message to ${OFFICE_ENQUIRIES_EMAIL} to reach the office.`,
                      href: "/quote",
                    });
                  }}
                >
                  Email the office
                </Btn>
                <Btn
                  variant="outline"
                  onClick={() => {
                    const body = [
                      "I would like to discuss or confirm a booking following my online enquiry.",
                      "",
                      `Quotation reference: ${result.quotationNumber}`,
                      "",
                      "Contact",
                      `Name: ${form.customerName}`,
                      `Company: ${form.companyName}`,
                      `Email: ${form.customerEmail}`,
                      `Phone: ${form.customerPhone}`,
                    ].join("\n");
                    window.location.assign(mailtoOffice(`Booking enquiry ${result.quotationNumber}`, body));
                    notifySuccess("Opening your email app", {
                      description: `Send the message to ${OFFICE_ENQUIRIES_EMAIL}.`,
                      href: "/quote",
                    });
                  }}
                >
                  Booking follow-up
                </Btn>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

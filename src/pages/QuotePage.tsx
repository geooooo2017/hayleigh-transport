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
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<QuoteForm>(empty);
  const [result, setResult] = useState<{
    basePrice: number;
    distance: number;
    duration: string;
    fuelSurcharge: number;
    total: number;
    quoteRef: string;
  } | null>(null);

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

  const calc = () => {
    if (!form.companyName.trim() || !form.customerName.trim() || !looksLikeEmail(form.customerEmail) || !form.customerPhone.trim()) {
      notifyError("Complete your contact details", {
        description: "Company, contact name, a valid email, and phone are required to generate a quote reference.",
      });
      return;
    }
    const dist = Math.floor(Math.random() * 300) + 50;
    const m = form.serviceType === "international" ? 1.5 : 0.85;
    const v =
      form.vehicleType === "artic" ? 1.5 : form.vehicleType === "rigid" ? 1.2 : 1;
    const base = Math.round(dist * m * v * 100) / 100;
    const fuel = Math.round(base * 0.12 * 100) / 100;
    const total = Math.round((base + fuel) * 100) / 100;
    const ref = `QT${Date.now().toString().slice(-6)}`;
    setResult({
      basePrice: base,
      distance: dist,
      duration: `${Math.floor(dist / 50)} - ${Math.ceil(dist / 40)} hours`,
      fuelSurcharge: fuel,
      total,
      quoteRef: ref,
    });
    setStep(3);
    notifySuccess(`Quote ${ref} generated`, {
      description: `Indicative total £${total.toFixed(2)} (incl. fuel surcharge)`,
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
            UK and international road freight — indicative pricing in minutes. Final rates confirmed by our transport
            office.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-200 md:gap-10">
            {["Clear pricing breakdown", "Suitable vehicle classes", "Email quote to our team", "Professional haulier"].map((t) => (
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
            { n: 3, l: "Your Quote" },
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
                <Btn className="flex-1" onClick={() => calc()}>
                  Get quote
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
              <h2 className="text-2xl font-semibold text-ht-navy">Your quote</h2>
              <p className="text-sm text-gray-500">Reference: {result.quoteRef}</p>
            </div>
            <div className="space-y-4 p-6">
              <div className="flex justify-between text-gray-600">
                <span>Distance (est.)</span>
                <span className="font-medium text-gray-900">{result.distance} mi</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Duration (est.)</span>
                <span className="font-medium text-gray-900">{result.duration}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Base transport fee</span>
                <span className="font-medium text-gray-900">£{result.basePrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Fuel surcharge</span>
                <span className="font-medium text-gray-900">£{result.fuelSurcharge.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-4 text-lg font-semibold">
                <span>Total (incl. surcharge)</span>
                <span>£{result.total.toFixed(2)}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Btn
                  onClick={() => {
                    const body = [
                      "Please follow up on this online quote request.",
                      "",
                      `Quote reference: ${result.quoteRef}`,
                      `Estimated total: £${result.total.toFixed(2)} (incl. fuel surcharge)`,
                      `Distance (est.): ${result.distance} mi`,
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
                    window.location.assign(mailtoOffice(`Quote enquiry ${result.quoteRef}`, body));
                    notifySuccess("Opening your email app", {
                      description: `Send the message to ${OFFICE_ENQUIRIES_EMAIL} to submit your request.`,
                      href: "/quote",
                    });
                  }}
                >
                  Submit request
                </Btn>
                <Btn
                  variant="outline"
                  onClick={() => {
                    const body = [
                      "I would like to confirm a booking for the following estimate.",
                      "",
                      `Quote reference: ${result.quoteRef}`,
                      `Estimated total: £${result.total.toFixed(2)} (incl. fuel surcharge)`,
                      "",
                      "Contact",
                      `Name: ${form.customerName}`,
                      `Company: ${form.companyName}`,
                      `Email: ${form.customerEmail}`,
                      `Phone: ${form.customerPhone}`,
                    ].join("\n");
                    window.location.assign(mailtoOffice(`Booking enquiry ${result.quoteRef}`, body));
                    notifySuccess("Opening your email app", {
                      description: `Send the message to ${OFFICE_ENQUIRIES_EMAIL} to confirm your booking.`,
                      href: "/quote",
                    });
                  }}
                >
                  Confirm booking
                </Btn>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

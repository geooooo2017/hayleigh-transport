import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Check, ChevronRight, Truck } from "lucide-react";
import { Btn, Card } from "../components/Layout";

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

  const calc = () => {
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
  };

  const next1 = () => {
    if (!form.serviceType) {
      toast.error("Select a service type");
      return;
    }
    setStep(2);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="bg-gradient-to-r from-[#2563EB] to-[#1e40af] py-16 text-white">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h1 className="mb-4 text-4xl font-bold md:text-5xl">Get an Instant Transport Quote</h1>
          <p className="mb-8 text-xl text-blue-100">
            Fast, reliable transport across the UK and Europe • Get your quote in 30 seconds
          </p>
          <div className="flex flex-wrap justify-center gap-8 text-sm">
            {["Instant Online Quotes", "24/7 Tracking", "Competitive Pricing", "Reliable Service"].map((t) => (
              <div key={t} className="flex items-center gap-2">
                <Check size={20} />
                <span>{t}</span>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm text-blue-200">
            <Link to="/welcome" className="underline">
              Staff login / onboarding
            </Link>
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-12 flex items-center justify-center gap-4">
          {[
            { n: 1, l: "Journey Details" },
            { n: 2, l: "Your Details" },
            { n: 3, l: "Your Quote" },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center gap-4">
              {i > 0 && <ChevronRight size={20} className="text-gray-400" />}
              <div className={`flex items-center gap-2 ${step >= s.n ? "text-[#2563EB]" : "text-gray-400"}`}>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold ${
                    step >= s.n ? "bg-[#2563EB] text-white" : "bg-gray-200"
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
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-2xl font-semibold">Journey Details</h2>
            </div>
            <div className="space-y-6 p-6">
              <div>
                <p className="mb-3 block text-base font-semibold">Service Type</p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => set("serviceType", "domestic")}
                    className={`rounded-xl border-2 p-6 text-left transition-all ${
                      form.serviceType === "domestic"
                        ? "border-[#2563EB] bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Truck size={32} className={form.serviceType === "domestic" ? "text-[#2563EB]" : "text-gray-400"} />
                    <h3 className="mt-3 text-lg font-semibold">UK Domestic</h3>
                    <p className="mt-1 text-sm text-gray-600">Nationwide delivery across the UK</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => set("serviceType", "international")}
                    className={`rounded-xl border-2 p-6 text-left transition-all ${
                      form.serviceType === "international"
                        ? "border-[#2563EB] bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Truck size={32} className={form.serviceType === "international" ? "text-[#2563EB]" : "text-gray-400"} />
                    <h3 className="mt-3 text-lg font-semibold">International</h3>
                    <p className="mt-1 text-sm text-gray-600">UK to EU and worldwide</p>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Collection postcode</label>
                  <input
                    className="w-full rounded-lg border border-gray-200 px-3 py-2"
                    value={form.collectionPostcode}
                    onChange={(e) => set("collectionPostcode", e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Delivery postcode</label>
                  <input
                    className="w-full rounded-lg border border-gray-200 px-3 py-2"
                    value={form.deliveryPostcode}
                    onChange={(e) => set("deliveryPostcode", e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Collection date</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2"
                    value={form.collectionDate}
                    onChange={(e) => set("collectionDate", e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Delivery date</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2"
                    value={form.deliveryDate}
                    onChange={(e) => set("deliveryDate", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Vehicle type</label>
                <select
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
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
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-2xl font-semibold">Your details</h2>
            </div>
            <div className="space-y-4 p-6">
              {(
                [
                  ["companyName", "Company name"],
                  ["customerName", "Contact name"],
                  ["customerEmail", "Email"],
                  ["customerPhone", "Phone"],
                ] as const
              ).map(([k, label]) => (
                <div key={k}>
                  <label className="mb-1 block text-sm font-medium">{label}</label>
                  <input
                    className="w-full rounded-lg border border-gray-200 px-3 py-2"
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
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-2xl font-semibold">Your quote</h2>
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
                  onClick={() =>
                    toast.success("Quote request submitted!", {
                      description: `Reference: ${result.quoteRef}. We'll contact you shortly.`,
                    })
                  }
                >
                  Submit request
                </Btn>
                <Btn
                  variant="outline"
                  onClick={() =>
                    toast.success("Booking confirmed!", {
                      description: "You'll receive confirmation via email shortly.",
                    })
                  }
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

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Building2, Check, ClipboardList, MapPin, Truck, Users } from "lucide-react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import type { OnboardingState } from "../types";
import { Btn, Card } from "../components/Layout";

const features = [
  {
    icon: Users,
    title: "Customer Database",
    description: "Track customers, credit limits, and payment terms",
  },
  {
    icon: Truck,
    title: "Fleet & Drivers",
    description: "Manage vehicles, drivers, licenses, and maintenance schedules",
  },
  {
    icon: ClipboardList,
    title: "Job Management",
    description: "Create jobs with auto-calculated profit margins and tracking",
  },
  {
    icon: MapPin,
    title: "Live Tracking",
    description: "Real-time tracking and monitoring of all jobs",
  },
];

export default function WelcomePage() {
  const navigate = useNavigate();
  const [onboarding, setOnboarding] = useLocalStorage<OnboardingState>("onboarding", {
    companyName: "",
    completed: false,
  });
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState(onboarding.companyName || "");

  if (onboarding.completed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <Card className="max-w-4xl p-12 text-center shadow-2xl">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <Check size={48} className="text-green-600" />
          </div>
          <h1 className="mb-4 text-4xl font-bold text-gray-900">Welcome Back!</h1>
          <p className="mb-8 text-xl text-gray-600">
            Your Transport Management System is ready to use.
          </p>
          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            {features.map((f, i) => (
              <div key={i} className="flex gap-4 rounded-lg bg-gray-50 p-4 text-left">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100">
                  <f.icon size={24} className="text-[#2563EB]" />
                </div>
                <div>
                  <h3 className="mb-1 font-semibold text-gray-900">{f.title}</h3>
                  <p className="text-sm text-gray-600">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
          <Btn className="px-8 py-6 text-lg" onClick={() => navigate("/login")}>
            Go to Login
          </Btn>
        </Card>
      </div>
    );
  }

  const finish = () => {
    if (!companyName.trim()) {
      toast.error("Please fill in your company name");
      return;
    }
    setOnboarding({ companyName: companyName.trim(), completed: true });
    toast.success("Setup complete! Let's get started.");
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <Card className="w-full max-w-2xl overflow-hidden shadow-2xl">
        <div className="px-12 pb-6 pt-12 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#2563EB]">
            <Truck size={48} className="text-white" />
          </div>
          <h1 className="mb-3 text-4xl font-bold text-gray-900">
            {step === 1 && "Welcome to Your Transport System"}
            {step === 2 && "Company Information"}
            {step === 3 && "Ready to Start!"}
          </h1>
          <p className="text-lg text-gray-600">
            {step === 1 && "Let's set up your account in just a few steps"}
            {step === 2 && "Tell us about your company"}
            {step === 3 && "Your system is configured and ready"}
          </p>
        </div>
        <div className="px-12 pb-12">
          <div className="mb-8">
            <div className="mb-2 flex justify-between text-sm font-medium text-gray-600">
              <span>
                Step {step} of 3
              </span>
              <span>{Math.round((step / 3) * 100)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-[#2563EB] transition-all duration-300"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>

          {step === 1 && (
            <div className="space-y-6">
              <h3 className="mb-4 text-center text-2xl font-semibold">What You&apos;ll Get:</h3>
              <div className="grid gap-4">
                {features.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-4 rounded-lg bg-gray-50 p-4 transition-colors hover:bg-gray-100"
                  >
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100">
                      <f.icon size={24} className="text-[#2563EB]" />
                    </div>
                    <div className="flex-1">
                      <h4 className="mb-1 font-semibold text-gray-900">{f.title}</h4>
                      <p className="text-sm text-gray-600">{f.description}</p>
                    </div>
                    <Check size={20} className="mt-1 flex-shrink-0 text-green-600" />
                  </div>
                ))}
              </div>
              <Btn className="mt-6 w-full py-3" onClick={() => setStep(2)}>
                Get Started
              </Btn>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="mb-6 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                  <Building2 size={32} className="text-[#2563EB]" />
                </div>
              </div>
              <div>
                <label htmlFor="companyName" className="mb-2 block text-base font-medium">
                  Company Name *
                </label>
                <input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g., ABC Transport Ltd"
                  className="mt-2 h-12 w-full rounded-lg border border-gray-200 px-4 text-lg outline-none focus:ring-2 focus:ring-blue-500/30"
                />
                <p className="mt-2 text-sm text-gray-500">This will appear on reports and invoices</p>
              </div>
              <div className="mt-8 flex gap-3">
                <Btn variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  Back
                </Btn>
                <Btn
                  className="flex-1"
                  onClick={() => {
                    if (!companyName.trim()) {
                      toast.error("Please enter your company name");
                      return;
                    }
                    setStep(3);
                  }}
                >
                  Next
                </Btn>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <Check size={48} className="text-green-600" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900">You&apos;re All Set!</h3>
              <p className="text-gray-600">
                <strong>{companyName}</strong> is ready to use Hayleigh Transport.
              </p>
              <p className="text-sm text-gray-600">
                You&apos;ll be taken to the login page to sign in as Keir, Scott, or Nik. Each user has their own job
                reference format.
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm">
                <span className="rounded-lg bg-gray-100 px-3 py-2">
                  <span className="font-medium">Keir</span> — DT/TT
                </span>
                <span className="rounded-lg bg-gray-100 px-3 py-2">
                  <span className="font-medium">Scott</span> — DSO/TSO
                </span>
                <span className="rounded-lg bg-gray-100 px-3 py-2">
                  <span className="font-medium">Nik</span> — DO/TO
                </span>
              </div>
              <Btn className="mt-4 w-full py-3" onClick={finish}>
                Complete Setup
              </Btn>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

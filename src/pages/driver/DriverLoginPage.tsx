import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, Truck } from "lucide-react";
import { MissingFieldLegend, ReqStar, WhyThisSection } from "../../components/FormGuidance";
import { Btn, Card } from "../../components/Layout";
import { DRIVER_LOGIN_WHY, DRIVER_REQ } from "../../lib/fieldRequirementCopy";
import { verifyDriverJobs } from "../../lib/driverJobGate";
import { fetchJobsSnapshot } from "../../lib/jobsSnapshot";
import { writeDriverSession } from "../../lib/driverSession";

const fieldClass =
  "min-h-12 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-base text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-ht-slate focus:ring-2 focus:ring-ht-slate/20";

export default function DriverLoginPage() {
  const navigate = useNavigate();
  const [driverName, setDriverName] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [jobNumbers, setJobNumbers] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const driverMiss = useMemo(
    () => ({
      name: !driverName.trim(),
      vehicle: !vehicle.trim(),
      jobs: !jobNumbers.trim(),
    }),
    [driverName, vehicle, jobNumbers]
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const name = driverName.trim();
      const reg = vehicle.trim();
      if (!name || !reg) {
        setError("Enter your name and vehicle registration.");
        return;
      }

      const jobs = await fetchJobsSnapshot();
      const result = verifyDriverJobs(jobs, name, reg, jobNumbers);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      writeDriverSession({
        driverName: name,
        vehicleReg: reg,
        jobIds: result.jobs.map((j) => j.id),
      });
      navigate("/driver/app", { replace: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="min-h-[calc(100dvh-5rem)] min-h-[calc(100vh-5rem)] bg-gradient-to-b from-slate-100 to-slate-200 px-4 pt-3 sm:px-5 sm:pt-6"
      style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="mx-auto w-full max-w-md">
        <div className="mb-5 text-center sm:mb-6">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-ht-slate text-white shadow-md sm:h-14 sm:w-14">
            <Truck className="h-8 w-8 sm:h-7 sm:w-7" aria-hidden />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-xl">Driver sign-in</h1>
          <p className="mt-3 text-base leading-relaxed text-gray-600 sm:mt-2 sm:text-sm">
            Use the name, registration and job number from the office. You only see your jobs. You can turn on location
            after sign-in if asked.
          </p>
        </div>

        <MissingFieldLegend />

        <WhyThisSection>{DRIVER_LOGIN_WHY}</WhyThisSection>

        <Card className="rounded-2xl p-5 shadow-md sm:p-6">
          <form onSubmit={onSubmit} className="space-y-5 sm:space-y-4">
            {error && (
              <div
                role="alert"
                className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-base text-red-900 sm:text-sm"
              >
                {error}
              </div>
            )}
            <div>
              <label htmlFor="driver-name" className="mb-2 block text-base font-medium text-gray-800 sm:mb-1 sm:text-sm">
                Your name
                <ReqStar show={driverMiss.name} why={DRIVER_REQ.name} />
              </label>
              <input
                id="driver-name"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className={fieldClass}
                placeholder="e.g. Nik, Keir, Scott"
                autoComplete="name"
                enterKeyHint="next"
                inputMode="text"
                required
              />
              <p className="mt-2 text-sm text-gray-500 sm:text-xs">Same spelling as on your job in the office system.</p>
            </div>
            <div>
              <label htmlFor="driver-vrm" className="mb-2 block text-base font-medium text-gray-800 sm:mb-1 sm:text-sm">
                Vehicle registration
                <ReqStar show={driverMiss.vehicle} why={DRIVER_REQ.vehicle} />
              </label>
              <input
                id="driver-vrm"
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
                className={`${fieldClass} uppercase`}
                placeholder="e.g. AB12 CDE"
                autoComplete="off"
                autoCapitalize="characters"
                enterKeyHint="next"
                inputMode="text"
                required
              />
              <p className="mt-2 text-sm text-gray-500 sm:text-xs">Must match the truck plates saved on the job.</p>
            </div>

            <div>
              <label htmlFor="driver-jobs" className="mb-2 block text-base font-medium text-gray-800 sm:mb-1 sm:text-sm">
                Job number(s)
                <ReqStar show={driverMiss.jobs} why={DRIVER_REQ.jobNumbers} />
              </label>
              <textarea
                id="driver-jobs"
                value={jobNumbers}
                onChange={(e) => setJobNumbers(e.target.value)}
                rows={4}
                className={`${fieldClass} min-h-[7.5rem] resize-y sm:min-h-0`}
                placeholder="One per line, or separated by commas"
                enterKeyHint="done"
                inputMode="text"
                required
              />
            </div>
            <Btn
              type="submit"
              className="min-h-14 w-full touch-manipulation text-base font-semibold sm:min-h-12"
              disabled={busy}
            >
              {busy ? "Checking…" : "Continue"}
            </Btn>
          </form>
        </Card>

        <p className="mx-auto mt-6 max-w-sm text-center text-sm leading-snug text-gray-600 sm:text-xs">
          <span className="inline-flex items-start justify-center gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
            <span>Optional: after sign-in you can share your location for the control room map.</span>
          </span>
        </p>
        <nav
          className="mt-6 flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-4 sm:gap-y-2"
          aria-label="Other sign-in options"
        >
          <Link
            to="/login"
            className="touch-manipulation rounded-lg py-3 text-center text-base font-medium text-ht-slate underline decoration-ht-slate/40 underline-offset-2 sm:py-2 sm:text-sm"
          >
            Staff / operations login
          </Link>
          <Link
            to="/"
            className="touch-manipulation rounded-lg py-3 text-center text-base font-medium text-gray-700 underline decoration-gray-400 underline-offset-2 sm:py-2 sm:text-sm"
          >
            Company home
          </Link>
        </nav>
      </div>
    </div>
  );
}

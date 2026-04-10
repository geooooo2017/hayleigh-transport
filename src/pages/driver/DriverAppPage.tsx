import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, MapPin, Navigation, RefreshCw, Truck } from "lucide-react";
import { toast } from "sonner";
import { Btn, Card } from "../../components/Layout";
import { useDriverLocationSharing } from "../../hooks/useDriverLocationSharing";
import { getSupabase } from "../../lib/supabase";
import { detectOfficeJobUpdates, primeDriverSeenRevisions } from "../../lib/driverRevisionStorage";
import { formatAddressBlock } from "../../lib/jobAddress";
import { fetchJobsSnapshot } from "../../lib/jobsSnapshot";
import { clearDriverSession, readDriverSession } from "../../lib/driverSession";
import type { Job } from "../../types";

export default function DriverAppPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readDriverSession(), []);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const driverName = session?.driverName ?? "";
  const vehicleReg = session?.vehicleReg ?? "";
  const jobIds = session?.jobIds ?? [];

  const { status, lastError, lastUpdated, start, stop } = useDriverLocationSharing(driverName, vehicleReg);

  const loadJobs = useCallback(async () => {
    const all = await fetchJobsSnapshot();
    const filtered = all.filter((j) => jobIds.includes(j.id));
    primeDriverSeenRevisions(filtered);
    const updated = detectOfficeJobUpdates(filtered);
    if (updated.length > 0) {
      toast.warning(updated.length === 1 ? `Job ${updated[0]} updated by office` : `${updated.length} jobs updated by office`, {
        description: "Pull to refresh or wait — check collection & delivery details.",
        duration: 14_000,
      });
    }
    setJobs(filtered);
    setLoading(false);
  }, [jobIds]);

  useEffect(() => {
    if (!session) {
      navigate("/driver", { replace: true });
      return;
    }
    void loadJobs();
    const t = setInterval(() => void loadJobs(), 15000);
    return () => clearInterval(t);
  }, [session, navigate, loadJobs]);

  const logout = () => {
    void stop();
    clearDriverSession();
    navigate("/driver", { replace: true });
  };

  const onStartLocation = async () => {
    if (!getSupabase()) {
      toast.error("Live map needs cloud sync", {
        description: "The office must use Supabase for positions to appear on Live Tracking.",
      });
      return;
    }
    if (!window.isSecureContext) {
      toast.error("Use HTTPS", { description: "Location works on the secure site (e.g. Vercel), not plain HTTP." });
      return;
    }
    start();
  };

  const onStopLocation = () => {
    void stop();
    toast.message("Location sharing stopped");
  };

  if (!session) return null;

  const locLabel =
    status === "idle"
      ? "Not sharing"
      : status === "requesting"
        ? "Waiting for GPS…"
        : status === "active"
          ? "Sharing live location"
          : "Error";

  return (
    <div
      className="min-h-[calc(100dvh-5rem)] min-h-[calc(100vh-5rem)] bg-ht-canvas"
      style={{ paddingBottom: "max(2.5rem, env(safe-area-inset-bottom, 0px))" }}
    >
      <header className="sticky top-0 z-10 border-b border-ht-border bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ht-slate text-white sm:h-10 sm:w-10">
              <Truck className="h-6 w-6 sm:h-5 sm:w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold text-gray-900 sm:text-base">{driverName}</div>
              <div className="truncate text-sm text-gray-500 sm:text-xs">{vehicleReg}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="touch-manipulation flex shrink-0 items-center gap-2 rounded-xl border-2 border-ht-border px-4 py-3 text-base font-medium text-gray-800 hover:bg-gray-50 sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm"
          >
            <LogOut className="h-5 w-5 sm:h-4 sm:w-4" aria-hidden />
            <span className="hidden sm:inline">Sign out</span>
            <span className="sm:hidden">Out</span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-4 px-4 pt-4 sm:px-5">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-ht-border bg-slate-50 px-4 py-4 sm:py-3">
            <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 sm:text-sm">
              <Navigation className="h-5 w-5 shrink-0 text-emerald-600 sm:h-[18px] sm:w-[18px]" aria-hidden />
              Live location (optional)
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600 sm:mt-1 sm:text-xs">
              Tap the button and allow location when your phone asks. Your name shows on the office map. Use the live site
              (HTTPS).
            </p>
          </div>
          <div className="space-y-4 p-4 sm:space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-base sm:text-sm">
              <span className="font-medium text-gray-700">Status:</span>
              <span
                className={
                  status === "active"
                    ? "text-emerald-700"
                    : status === "error"
                      ? "text-red-700"
                      : "text-gray-600"
                }
              >
                {locLabel}
              </span>
            </div>
            {lastError && <p className="text-sm text-red-700 sm:text-xs">{lastError}</p>}
            {lastUpdated && status === "active" && (
              <p className="text-sm text-gray-500 sm:text-xs">Last sent: {new Date(lastUpdated).toLocaleTimeString()}</p>
            )}
            <div className="flex flex-col gap-3">
              {status === "idle" || status === "error" ? (
                <Btn
                  type="button"
                  className="min-h-14 w-full touch-manipulation text-base font-semibold sm:min-h-12"
                  onClick={() => void onStartLocation()}
                >
                  <MapPin className="h-5 w-5 sm:h-[18px] sm:w-[18px]" aria-hidden />
                  Share my location
                </Btn>
              ) : (
                <Btn
                  type="button"
                  variant="outline"
                  className="min-h-14 w-full touch-manipulation text-base font-semibold sm:min-h-12"
                  onClick={() => void onStopLocation()}
                >
                  Stop sharing
                </Btn>
              )}
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-gray-900 sm:text-lg">Your jobs</h2>
          <button
            type="button"
            onClick={() => void loadJobs()}
            className="touch-manipulation flex min-h-11 items-center justify-center gap-2 rounded-xl border border-ht-border bg-white px-4 py-2.5 text-base font-medium text-ht-slate hover:bg-slate-50 disabled:opacity-50 sm:min-h-0 sm:border-0 sm:bg-transparent sm:px-2 sm:py-1 sm:text-sm sm:underline"
            disabled={loading}
          >
            <RefreshCw className={`h-5 w-5 shrink-0 sm:h-3.5 sm:w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden />
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-center text-sm text-gray-500">Loading…</p>
        ) : jobs.length === 0 ? (
          <Card className="rounded-2xl p-6 text-center text-base text-gray-600 sm:text-sm">
            No jobs found. Ask the office to check assignment.
          </Card>
        ) : (
          <ul className="space-y-3">
            {jobs.map((j) => (
              <Card key={j.id} className="rounded-2xl p-5 sm:p-4">
                <div className="text-lg font-semibold text-gray-900 sm:text-base">{j.jobNumber}</div>
                <div className="mt-1 text-base text-gray-700 sm:text-sm">{j.customerName}</div>
                <div className="mt-3 line-clamp-6 whitespace-pre-wrap text-sm leading-relaxed text-gray-600 sm:text-xs">
                  {formatAddressBlock(j, "collection")}
                </div>
                <div className="mt-2 line-clamp-6 whitespace-pre-wrap text-sm leading-relaxed text-gray-600 sm:text-xs">
                  → {formatAddressBlock(j, "delivery")}
                </div>
                <div className="mt-4 text-sm font-medium capitalize text-ht-slate sm:mt-3 sm:text-xs">
                  {j.status.replace("-", " ")}
                </div>
              </Card>
            ))}
          </ul>
        )}

        <p className="px-1 text-center text-sm text-gray-500 sm:text-xs">
          This page is for drivers only. For full operations, staff use the separate login.
        </p>
      </div>
    </div>
  );
}

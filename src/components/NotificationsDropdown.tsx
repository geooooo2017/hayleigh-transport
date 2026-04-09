import { useMemo, useRef, useState, useEffect, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { useJobs, useJobsSync } from "../context/JobsContext";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { readPlatformActivity, subscribeActivity, clearPlatformActivity } from "../lib/platformActivityLog";
import { buildPlatformAttentionItems } from "../lib/platformAttentionItems";
import type { Customer, Driver } from "../types";

function relTime(iso: string): string {
  const sec = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 45) return "Just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 172800) return "Yesterday";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function NotificationsDropdown() {
  const [jobs] = useJobs();
  const { cloudError, syncMode } = useJobsSync();
  const [customers] = useLocalStorage<Customer[]>("customers", []);
  const [drivers] = useLocalStorage<Driver[]>("drivers", []);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const activity = useSyncExternalStore(subscribeActivity, readPlatformActivity, readPlatformActivity);

  const attention = useMemo(
    () =>
      buildPlatformAttentionItems(jobs, {
        syncMode,
        cloudError,
        customersCount: customers.length,
        driversCount: drivers.length,
      }),
    [jobs, cloudError, syncMode, customers.length, drivers.length]
  );

  const recentActivity = useMemo(() => activity.slice(0, 14), [activity]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const urgent = attention.length;
  const hasActivity = recentActivity.length > 0;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        className="relative rounded-lg p-2 hover:bg-gray-100"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`Notifications${urgent ? `, ${urgent} need attention` : hasActivity ? ", recent activity" : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        <Bell size={20} className="text-gray-600" />
        {urgent > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-semibold text-white">
            {urgent > 9 ? "9+" : urgent}
          </span>
        ) : hasActivity ? (
          <span
            className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-ht-slate ring-2 ring-white"
            title="Recent activity"
            aria-hidden
          />
        ) : null}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-[22rem] max-w-[calc(100vw-2rem)] rounded-lg border border-ht-border bg-white py-2 shadow-lg">
          <div className="border-b border-ht-border px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Needs attention
          </div>
          {attention.length === 0 ? (
            <p className="px-3 py-3 text-sm text-gray-500">Nothing critical right now.</p>
          ) : (
            <ul className="max-h-52 overflow-y-auto border-b border-gray-100">
              {attention.map((n) => (
                <li key={n.id}>
                  <Link
                    to={n.href}
                    className="block border-b border-gray-50 px-3 py-2.5 last:border-0 hover:bg-ht-canvas"
                    onClick={() => setOpen(false)}
                  >
                    <div
                      className={
                        n.tone === "danger"
                          ? "text-sm font-medium text-red-800"
                          : n.tone === "warning"
                            ? "text-sm font-medium text-amber-900"
                            : "text-sm font-medium text-ht-slate"
                      }
                    >
                      {n.title}
                    </div>
                    <div className="mt-0.5 line-clamp-2 text-xs text-gray-600">{n.detail}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center justify-between px-3 pt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <span>Recent activity</span>
            {recentActivity.length > 0 && (
              <button
                type="button"
                className="normal-case font-medium text-ht-slate underline decoration-ht-slate/30 hover:decoration-ht-slate"
                onClick={() => clearPlatformActivity()}
              >
                Clear
              </button>
            )}
          </div>
          {recentActivity.length === 0 ? (
            <p className="px-3 py-3 text-sm text-gray-500">Successful saves and exports appear here.</p>
          ) : (
            <ul className="max-h-48 overflow-y-auto">
              {recentActivity.map((a) => (
                <li key={a.id} className="border-b border-gray-50 last:border-0">
                  {a.href ? (
                    <Link
                      to={a.href}
                      className="block px-3 py-2 hover:bg-ht-canvas"
                      onClick={() => setOpen(false)}
                    >
                      <ActivityRow a={a} />
                    </Link>
                  ) : (
                    <div className="px-3 py-2">
                      <ActivityRow a={a} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          <p className="mt-2 border-t border-ht-border px-3 pt-2 text-[10px] leading-snug text-gray-500">
            Toasts still fire for errors. Successful actions are logged here and in the list above when they need follow-up.
          </p>
        </div>
      )}
    </div>
  );
}

function ActivityRow({ a }: { a: { title: string; detail?: string; tone: string; at: string } }) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div
          className={
            a.tone === "warning"
              ? "text-sm font-medium text-amber-900"
              : a.tone === "success"
                ? "text-sm font-medium text-emerald-900"
                : "text-sm font-medium text-gray-900"
          }
        >
          {a.title}
        </div>
        <span className="shrink-0 text-[10px] text-gray-400">{relTime(a.at)}</span>
      </div>
      {a.detail && <div className="mt-0.5 line-clamp-2 text-xs text-gray-600">{a.detail}</div>}
    </>
  );
}

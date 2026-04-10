import { useCallback, useEffect, useState } from "react";
import { Headphones, RefreshCw } from "lucide-react";
import { Btn, Card } from "./Layout";
import { notifyError, notifySuccess } from "../lib/platformNotify";
import {
  SUPPORT_CATEGORY_LABELS,
  loadSupportTickets,
  setSupportTicketResolved,
  supportTicketsCloudConfigured,
  type SupportTicket,
} from "../lib/technicalSupport";

export function TechnicalSupportLogCard() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const cloud = supportTicketsCloudConfigured();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await loadSupportTickets();
      setTickets(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggleResolved = async (t: SupportTicket) => {
    const next = !t.resolved;
    const r = await setSupportTicketResolved(t.id, next);
    if (!r.ok) {
      notifyError("Could not update ticket", { description: r.error });
      return;
    }
    setTickets((prev) =>
      prev.map((x) =>
        x.id === t.id
          ? {
              ...x,
              resolved: next,
              resolvedAt: next ? new Date().toISOString() : null,
            }
          : x
      )
    );
    notifySuccess(next ? "Marked resolved" : "Reopened ticket", { description: t.ticketNumber });
  };

  return (
    <Card className="space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold text-gray-900">
          <Headphones className="h-5 w-5 shrink-0 text-ht-slate" aria-hidden />
          Technical support log
        </h2>
        <Btn type="button" variant="outline" className="gap-1.5 text-sm" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
          Refresh
        </Btn>
      </div>

      {!cloud && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <strong>Cloud log not configured.</strong> Add the <code className="rounded bg-white px-1">support_tickets</code>{" "}
          table in Supabase (see <code className="rounded bg-white px-1">supabase/support_tickets.sql</code>) so reports
          from the public form appear here for every device. Until then, only tickets stored in this browser are listed.
        </p>
      )}

      <p className="text-sm text-gray-600">
        Customer and partner reports from{" "}
        <a href="/report-issue" className="font-medium text-ht-slate underline">
          Report an issue
        </a>{" "}
        appear here when cloud sync is enabled. Tick the box when an item is done.
      </p>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : tickets.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
          No tickets yet.
        </p>
      ) : (
        <ul className="space-y-4">
          {tickets.map((t) => (
            <li
              key={t.id}
              className={`rounded-xl border p-4 shadow-sm ${
                t.resolved ? "border-green-200 bg-green-50/40" : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-ht-navy">{t.ticketNumber}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {SUPPORT_CATEGORY_LABELS[t.category]}
                    </span>
                    {t.resolved && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        Resolved
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(t.createdAt).toLocaleString("en-GB")}
                    {t.reporterName ? ` · ${t.reporterName}` : ""}
                    {t.reporterEmail ? ` · ${t.reporterEmail}` : ""}
                    {t.reporterCompany ? ` · ${t.reporterCompany}` : ""}
                  </p>
                  {t.pageUrl && (
                    <p className="truncate text-xs text-gray-500" title={t.pageUrl}>
                      Page: {t.pageUrl}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap text-sm text-gray-800">{t.description}</p>
                </div>
                <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={t.resolved}
                    onChange={() => void toggleResolved(t)}
                    className="h-4 w-4 rounded border-gray-300 text-ht-slate"
                  />
                  Resolved
                </label>
              </div>
              {t.screenshotDataUrl && (
                <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-2">
                  <p className="mb-2 text-xs font-medium text-gray-600">Screenshot</p>
                  <a href={t.screenshotDataUrl} target="_blank" rel="noreferrer" className="block max-h-64 overflow-auto">
                    <img
                      src={t.screenshotDataUrl}
                      alt={`Screenshot for ${t.ticketNumber}`}
                      className="max-h-60 w-auto max-w-full object-contain"
                    />
                  </a>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

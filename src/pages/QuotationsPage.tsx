import { useMemo } from "react";
import { Link } from "react-router-dom";
import { FileText, Plus, Settings2 } from "lucide-react";
import { Btn, Card } from "../components/Layout";
import { MissingFieldLegend, WhyThisSection } from "../components/FormGuidance";
import { useLocalStorage } from "../hooks/useLocalStorage";
import type { Quotation, QuotationEngineMode, QuotationSettings } from "../types";
import {
  DEFAULT_QUOTATION_SETTINGS,
  DEFAULT_RATE_CARD,
  QUOTATION_SETTINGS_KEY,
} from "../lib/quotationSettings";
import { QUOTATIONS_STORAGE_KEY, quotationNetExVat } from "../lib/quotationStorage";
import { platformPath } from "../routes/paths";
import { notifySuccess } from "../lib/platformNotify";
import { QUOTATION_SETTINGS_WHY, QUOTATIONS_WHY } from "../lib/fieldRequirementCopy";

function modeLabel(m: QuotationEngineMode): string {
  if (m === "automatic") return "Automatic";
  if (m === "manual") return "Manual";
  return "Disabled";
}

function statusBadge(status: Quotation["status"], pricesApproved: boolean) {
  if (pricesApproved) {
    return (
      <span className="inline-block rounded px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800">
        Approved
      </span>
    );
  }
  if (status === "rejected") {
    return <span className="inline-block rounded px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800">Rejected</span>;
  }
  if (status === "in_review") {
    return (
      <span className="inline-block rounded px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-900">In review</span>
    );
  }
  return (
    <span className="inline-block rounded px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-800">Submitted</span>
  );
}

export default function QuotationsPage() {
  const [quotations] = useLocalStorage<Quotation[]>(QUOTATIONS_STORAGE_KEY, []);
  const [settings, setSettings] = useLocalStorage<QuotationSettings>(QUOTATION_SETTINGS_KEY, {
    ...DEFAULT_QUOTATION_SETTINGS,
    rateCard: { ...DEFAULT_RATE_CARD },
  });

  const sorted = useMemo(
    () => [...quotations].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [quotations]
  );

  const totals = useMemo(() => {
    const approved = quotations.filter((q) => q.pricesApproved);
    const count = quotations.length;
    const approvedCount = approved.length;
    const valueExVat = approved.reduce((s, q) => s + quotationNetExVat(q), 0);
    return { count, approvedCount, valueExVat };
  }, [quotations]);

  const persistSettings = (next: QuotationSettings) => {
    setSettings(next);
    notifySuccess("Quotation settings saved", { description: `Mode: ${modeLabel(next.mode)}` });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ht-navy lg:text-3xl">Quotations</h1>
          <p className="mt-1 text-sm text-slate-600">
            Every website and office quote gets a unique number. Costs are editable here; customers only see prices after you approve them.
          </p>
        </div>
        <Link to={platformPath("/quotations/new")}>
          <Btn className="gap-2">
            <Plus size={18} aria-hidden />
            New quotation
          </Btn>
        </Link>
      </div>

      <WhyThisSection>{QUOTATIONS_WHY}</WhyThisSection>
      <MissingFieldLegend />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm font-medium text-slate-600">Quotations logged</p>
          <p className="mt-1 text-3xl font-semibold text-gray-900">{totals.count}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-slate-600">Approved (priced)</p>
          <p className="mt-1 text-3xl font-semibold text-gray-900">{totals.approvedCount}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-slate-600">Approved value (ex VAT)</p>
          <p className="mt-1 text-3xl font-semibold text-gray-900">£{totals.valueExVat.toFixed(2)}</p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-ht-border bg-ht-canvas/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-ht-navy">
            <Settings2 size={20} className="text-ht-slate shrink-0" aria-hidden />
            <h2 className="text-lg font-semibold">Quoting engine & rate card</h2>
          </div>
        </div>
        <div className="space-y-4 p-5">
          <WhyThisSection>{QUOTATION_SETTINGS_WHY}</WhyThisSection>

          <div>
            <p className="mb-2 text-sm font-medium text-gray-800">Public /quote behaviour</p>
            <div className="flex flex-wrap gap-3">
              {(
                [
                  ["automatic", "Automatic", "Suggest indicative cost lines when a request is submitted (staff still approve before customers see prices)."],
                  ["manual", "Manual", "No auto lines — staff add all costs (default until you are happy with the rate card)."],
                  ["disabled", "Disabled", "Public form hidden — contact the office only."],
                ] as const
              ).map(([value, label, hint]) => (
                <label
                  key={value}
                  className={`flex max-w-md cursor-pointer flex-col rounded-lg border p-3 text-sm ${
                    settings.mode === value ? "border-ht-slate bg-ht-slate/5" : "border-ht-border"
                  }`}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <input
                      type="radio"
                      name="qmode"
                      checked={settings.mode === value}
                      onChange={() => persistSettings({ ...settings, mode: value })}
                      className="text-ht-slate"
                    />
                    {label}
                  </span>
                  <span className="mt-1 pl-6 text-xs text-slate-600">{hint}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Domestic £ / mile (base)</label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-lg border border-ht-border px-3 py-2 text-sm"
                value={settings.rateCard.domesticPerMile}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    rateCard: { ...settings.rateCard, domesticPerMile: parseFloat(e.target.value) || 0 },
                  })
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">International multiplier</label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-lg border border-ht-border px-3 py-2 text-sm"
                value={settings.rateCard.internationalMult}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    rateCard: { ...settings.rateCard, internationalMult: parseFloat(e.target.value) || 0 },
                  })
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Artic mult.</label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-lg border border-ht-border px-3 py-2 text-sm"
                value={settings.rateCard.articMult}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    rateCard: { ...settings.rateCard, articMult: parseFloat(e.target.value) || 0 },
                  })
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Rigid mult.</label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-lg border border-ht-border px-3 py-2 text-sm"
                value={settings.rateCard.rigidMult}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    rateCard: { ...settings.rateCard, rigidMult: parseFloat(e.target.value) || 0 },
                  })
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Van mult.</label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-lg border border-ht-border px-3 py-2 text-sm"
                value={settings.rateCard.vanMult}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    rateCard: { ...settings.rateCard, vanMult: parseFloat(e.target.value) || 0 },
                  })
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Fuel surcharge % of base line</label>
              <input
                type="number"
                step="0.1"
                className="w-full rounded-lg border border-ht-border px-3 py-2 text-sm"
                value={settings.rateCard.fuelPct}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    rateCard: { ...settings.rateCard, fuelPct: parseFloat(e.target.value) || 0 },
                  })
                }
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Explanation (shown to staff on this screen)</label>
            <textarea
              className="min-h-[88px] w-full rounded-lg border border-ht-border px-3 py-2 text-sm"
              value={settings.rateCard.explanation}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  rateCard: { ...settings.rateCard, explanation: e.target.value },
                })
              }
            />
          </div>

          <Btn
            variant="outline"
            type="button"
            onClick={() =>
              persistSettings({
                ...DEFAULT_QUOTATION_SETTINGS,
                rateCard: { ...DEFAULT_RATE_CARD },
              })
            }
          >
            Reset rate card & mode to defaults
          </Btn>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-ht-border px-5 py-4">
          <h2 className="text-lg font-semibold text-ht-navy">All quotations</h2>
          <p className="mt-1 text-sm text-slate-600">Newest first — open a row to edit costs, approve prices, and export PDFs.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-ht-border bg-ht-canvas/30">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-600">Number</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-600">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-600">Source</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-600">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-600">Net ex VAT</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-600">Created</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-600">
                    No quotations yet. Use <strong>New quotation</strong> or wait for a public request from{" "}
                    <Link to="/quote" className="font-medium text-ht-slate underline">
                      /quote
                    </Link>
                    .
                  </td>
                </tr>
              ) : (
                sorted.map((q) => (
                  <tr key={q.id} className="border-b border-ht-border/70 hover:bg-ht-canvas/40">
                    <td className="px-4 py-3">
                      <Link
                        to={platformPath(`/quotations/${q.id}`)}
                        className="inline-flex items-center gap-1.5 font-mono text-sm font-medium text-ht-slate hover:underline"
                      >
                        <FileText size={16} className="shrink-0 opacity-70" aria-hidden />
                        {q.quotationNumber}
                      </Link>
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-sm text-gray-800" title={q.companyName}>
                      {q.companyName || q.customerName || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {q.source === "public_request" ? "Website" : "Manual"}
                    </td>
                    <td className="px-4 py-3">{statusBadge(q.status, q.pricesApproved)}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-gray-800">
                      {q.pricesApproved ? `£${quotationNetExVat(q).toFixed(2)}` : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {new Date(q.createdAt).toLocaleDateString("en-GB")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

import { Link } from "react-router-dom";
import type { BibbyBreakdown, BibbyTerms } from "../lib/bibbyFinancing";
import { bibbyTotalDiscountAprPercent } from "../lib/bibbyFinancing";
import { BIBBY_FINANCE_WHY, REQ } from "../lib/fieldRequirementCopy";
import { platformPath } from "../routes/paths";
import { WhyThisSection, ReqStar } from "./FormGuidance";

type Props = {
  terms: BibbyTerms;
  breakdown: BibbyBreakdown | null;
  /** Empty string = use net turnover (sell + fuel + extras). */
  invoiceValueInput: string;
  daysOutstandingInput: string;
  onInvoiceChange: (v: string) => void;
  onDaysChange: (v: string) => void;
  invoiceMiss: boolean;
  daysMiss: boolean;
  netTurnoverHint: number;
};

export function BibbyJobCosting({
  terms,
  breakdown,
  invoiceValueInput,
  daysOutstandingInput,
  onInvoiceChange,
  onDaysChange,
  invoiceMiss,
  daysMiss,
  netTurnoverHint,
}: Props) {
  const apr = bibbyTotalDiscountAprPercent(terms);

  return (
    <div className="mt-6 border-t border-gray-200 pt-6">
      <h3 className="mb-2 text-sm font-semibold text-gray-900">Invoice financing (Bibby-style costing)</h3>
      <WhyThisSection>{BIBBY_FINANCE_WHY}</WhyThisSection>
      <p className="mb-3 text-xs text-gray-600">
        <Link to={platformPath("/settings")} className="font-medium text-ht-slate underline decoration-ht-slate/30">
          Settings → Invoice financing (Bibby-style terms)
        </Link>{" "}
        is where prepayment, service fee, BDP, discount margin, and base rate are saved for this browser.
      </p>

      <p className="mb-3 text-xs text-gray-600">
        Facility rates from Settings: prepayment {terms.prepaymentPercent}% · service fee {terms.serviceFeePercent}% ·
        {terms.includeBadDebtProtection ? ` BDP ${terms.badDebtProtectionPercent}% ·` : " BDP off ·"} discount fee{" "}
        {terms.discountFeePercent}% + base rate {terms.bankBaseRatePercent}% ={" "}
        <strong>{apr.toFixed(2)}%</strong> p.a. on drawn funds.
      </p>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Invoice value (ex VAT)
            <ReqStar show={invoiceMiss} why={REQ.bibbyInvoiceValue} />
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
            <input
              type="number"
              step="0.01"
              value={invoiceValueInput}
              onChange={(e) => onInvoiceChange(e.target.value)}
              placeholder={netTurnoverHint > 0 ? netTurnoverHint.toFixed(2) : "—"}
              className="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-3 text-sm"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Leave blank to use net turnover (sell + fuel + extras):{" "}
            {netTurnoverHint > 0 ? `£${netTurnoverHint.toFixed(2)}` : "enter pricing first"}.
          </p>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Days outstanding
            <ReqStar show={daysMiss} why={REQ.bibbyDaysOutstanding} />
          </label>
          <input
            type="number"
            min={0}
            step={1}
            value={daysOutstandingInput}
            onChange={(e) => onDaysChange(e.target.value)}
            placeholder="e.g. 30"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">How long the prepayment is drawn — drives discount fee for the period.</p>
        </div>
      </div>

      {breakdown && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-gray-50/80">
          <table className="w-full min-w-[280px] text-sm">
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-3 py-2 text-gray-600">Invoice value (ex VAT)</td>
                <td className="px-3 py-2 text-right font-mono font-medium">£{breakdown.invoiceValue.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-gray-600">Amount advanced ({breakdown.prepaymentPercent}% prepayment)</td>
                <td className="px-3 py-2 text-right font-mono">£{breakdown.amountAdvanced.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-gray-600">Service fee on invoice</td>
                <td className="px-3 py-2 text-right font-mono">£{breakdown.serviceFee.toFixed(2)}</td>
              </tr>
              {terms.includeBadDebtProtection && (
                <tr>
                  <td className="px-3 py-2 text-gray-600">Bad debt protection</td>
                  <td className="px-3 py-2 text-right font-mono">£{breakdown.badDebtProtection.toFixed(2)}</td>
                </tr>
              )}
              <tr>
                <td className="px-3 py-2 text-gray-600">Discount fee (annual on advance @ {breakdown.totalDiscountAprPercent.toFixed(2)}%)</td>
                <td className="px-3 py-2 text-right font-mono">£{breakdown.annualDiscountCost.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-gray-600">Daily discount</td>
                <td className="px-3 py-2 text-right font-mono">£{breakdown.dailyDiscount.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-gray-600">
                  Discount for period
                  {!breakdown.daysProvided && (
                    <span className="ml-1 text-xs font-normal text-amber-700">(enter days)</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  £{breakdown.discountFeeForPeriod.toFixed(2)}
                  {breakdown.daysProvided && (
                    <span className="ml-1 text-xs text-gray-500">× {breakdown.daysOutstanding} days</span>
                  )}
                </td>
              </tr>
              <tr className="bg-white font-semibold">
                <td className="px-3 py-2 text-gray-900">Overall finance cost</td>
                <td className="px-3 py-2 text-right font-mono">£{breakdown.overallCost.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-gray-600">Cost vs invoice (T/O)</td>
                <td className="px-3 py-2 text-right font-mono">{breakdown.costPercentOfTurnover.toFixed(2)}%</td>
              </tr>
              <tr className="border-t-2 border-gray-300 bg-emerald-50/50">
                <td className="px-3 py-2 text-gray-900">Operating GP (haulage)</td>
                <td className="px-3 py-2 text-right font-mono font-medium">£{breakdown.operatingProfit.toFixed(2)}</td>
              </tr>
              <tr className="bg-emerald-50/80 font-semibold">
                <td className="px-3 py-2 text-emerald-950">Net after financing</td>
                <td
                  className={`px-3 py-2 text-right font-mono ${
                    breakdown.profitAfterBibby < 0 ? "text-red-700" : "text-emerald-800"
                  }`}
                >
                  £{breakdown.profitAfterBibby.toFixed(2)}
                </td>
              </tr>
              <tr className="bg-emerald-50/50 text-xs">
                <td className="px-3 py-2 text-gray-600">Net margin vs invoice value</td>
                <td className="px-3 py-2 text-right font-mono">{breakdown.marginAfterBibbyPercent.toFixed(2)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {!breakdown && (
        <p className="text-sm text-gray-500">Enter a positive sell (and net turnover) to preview financing costs.</p>
      )}
    </div>
  );
}

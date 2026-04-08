import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { Card } from "../components/Layout";

export default function FinanceCalculatorPage() {
  const [distance, setDistance] = useState("120");
  const [rate, setRate] = useState("1.15");
  const [fuelPct, setFuelPct] = useState("12");
  const [extras, setExtras] = useState("0");

  const result = useMemo(() => {
    const d = parseFloat(distance) || 0;
    const r = parseFloat(rate) || 0;
    const f = parseFloat(fuelPct) || 0;
    const e = parseFloat(extras) || 0;
    const base = Math.round(d * r * 100) / 100;
    const fuel = Math.round(base * (f / 100) * 100) / 100;
    const total = Math.round((base + fuel + e) * 100) / 100;
    return { base, fuel, total };
  }, [distance, rate, fuelPct, extras]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900 lg:text-3xl">
          <Calculator className="text-[#2563EB]" />
          Finance Calculator
        </h1>
        <p className="mt-1 text-gray-500">Quick transport cost and sell-price modelling (ex VAT)</p>
      </div>

      <Card className="space-y-4 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Distance (miles)</label>
            <input
              type="number"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Rate (£ / mile)</label>
            <input
              type="number"
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Fuel surcharge %</label>
            <input
              type="number"
              value={fuelPct}
              onChange={(e) => setFuelPct(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Extras (£)</label>
            <input
              type="number"
              step="0.01"
              value={extras}
              onChange={(e) => setExtras(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </div>
        </div>
        <div className="rounded-lg bg-gray-50 p-4">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Base transport</span>
            <span className="font-medium text-gray-900">£{result.base.toFixed(2)}</span>
          </div>
          <div className="mt-2 flex justify-between text-sm text-gray-600">
            <span>Fuel surcharge</span>
            <span className="font-medium text-gray-900">£{result.fuel.toFixed(2)}</span>
          </div>
          <div className="mt-3 flex justify-between border-t border-gray-200 pt-3 text-lg font-semibold">
            <span>Indicative total</span>
            <span>£{result.total.toFixed(2)}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

import { useMemo, useState } from "react";
import { Palette } from "lucide-react";
import { Btn, Card } from "./Layout";
import { notifyError, notifySuccess } from "../lib/platformNotify";
import {
  buildCustomThemeVars,
  DEFAULT_CUSTOM_SEEDS,
  emitPlatformThemeChanged,
  type PlatformThemePresetId,
  PLATFORM_THEME_PRESETS,
  presetPreviewStrip,
  readStoredPlatformTheme,
  writeStoredPlatformTheme,
} from "../lib/platformTheme";

function normalizeHexInput(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  const h = t.startsWith("#") ? t : `#${t}`;
  return /^#[0-9a-f]{6}$/i.test(h) ? h.toLowerCase() : h;
}

export function PlatformAppearanceCard() {
  const initial = useMemo(() => readStoredPlatformTheme(), []);
  const [mode, setMode] = useState<PlatformThemePresetId>(() => {
    if (!initial) return "default";
    if (initial.preset === "custom") return "custom";
    return initial.preset;
  });
  const [customBrand, setCustomBrand] = useState(
    () => initial?.preset === "custom" && initial.seeds?.brand ? initial.seeds.brand : DEFAULT_CUSTOM_SEEDS.brand,
  );
  const [customAccent, setCustomAccent] = useState(
    () => initial?.preset === "custom" && initial.seeds?.accent ? initial.seeds.accent : DEFAULT_CUSTOM_SEEDS.accent,
  );
  const [customCanvas, setCustomCanvas] = useState(
    () => initial?.preset === "custom" && initial.seeds?.canvas ? initial.seeds.canvas : DEFAULT_CUSTOM_SEEDS.canvas,
  );

  const applyPreset = (id: Exclude<PlatformThemePresetId, "custom">) => {
    setMode(id);
    if (id === "default") {
      writeStoredPlatformTheme(null);
      emitPlatformThemeChanged();
      notifySuccess("Theme reset", { description: "Hayleigh default colours restored." });
      return;
    }
    const stored = { preset: id } as const;
    writeStoredPlatformTheme(stored);
    emitPlatformThemeChanged();
    notifySuccess("Theme updated", { description: PLATFORM_THEME_PRESETS.find((p) => p.id === id)?.label ?? id });
  };

  const applyCustom = () => {
    const brand = normalizeHexInput(customBrand);
    const accent = normalizeHexInput(customAccent);
    const canvas = normalizeHexInput(customCanvas);
    const vars = buildCustomThemeVars(brand, accent, canvas);
    if (Object.keys(vars).length === 0) {
      notifyError("Invalid colours", { description: "Use six-digit hex values, e.g. #1e3a5f." });
      return;
    }
    setMode("custom");
    const stored = {
      preset: "custom" as const,
      vars,
      seeds: { brand, accent, canvas },
    };
    writeStoredPlatformTheme(stored);
    emitPlatformThemeChanged();
    notifySuccess("Custom theme applied", { description: "Your colours are saved on this device." });
  };

  const resetToDefault = () => {
    setMode("default");
    setCustomBrand(DEFAULT_CUSTOM_SEEDS.brand);
    setCustomAccent(DEFAULT_CUSTOM_SEEDS.accent);
    setCustomCanvas(DEFAULT_CUSTOM_SEEDS.canvas);
    writeStoredPlatformTheme(null);
    emitPlatformThemeChanged();
    notifySuccess("Theme reset", { description: "Hayleigh default colours restored." });
  };

  return (
    <Card className="space-y-4 p-6">
      <h2 className="flex items-center gap-2 font-semibold">
        <Palette className="h-5 w-5 text-ht-slate" aria-hidden />
        Appearance
      </h2>
      <p className="text-sm text-gray-600">
        Adjust platform colours only — layout and spacing stay the same. Saved in this browser for your account session;
        marketing pages keep the standard brand look.
      </p>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Presets</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {PLATFORM_THEME_PRESETS.map((p) => {
            const [c1, c2, c3] = presetPreviewStrip(p.id);
            const active = mode === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className={`flex flex-col gap-2 rounded-xl border p-3 text-left text-sm transition-colors ${
                  active ? "border-ht-slate bg-ht-canvas ring-2 ring-ht-slate/25" : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <div className="flex gap-1">
                  <span className="h-6 flex-1 rounded-md border border-black/10" style={{ backgroundColor: c1 }} />
                  <span className="h-6 flex-1 rounded-md border border-black/10" style={{ backgroundColor: c2 }} />
                  <span className="h-6 flex-1 rounded-md border border-black/10" style={{ backgroundColor: c3 }} />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{p.label}</div>
                  <div className="text-xs text-gray-500">{p.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-ht-border bg-ht-canvas/50 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Custom colours</p>
        <p className="text-xs text-gray-600">
          Brand drives navigation and primary buttons; accent is used for highlights; page is the main background. Borders
          and text are derived for contrast.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-xs font-medium text-gray-700">
            Brand
            <input
              type="color"
              value={normalizeHexInput(customBrand).match(/^#[0-9a-f]{6}$/i) ? normalizeHexInput(customBrand) : "#1e3a5f"}
              onChange={(e) => setCustomBrand(e.target.value)}
              className="mt-1 h-9 w-full cursor-pointer rounded border border-gray-200 bg-white"
            />
          </label>
          <label className="block text-xs font-medium text-gray-700">
            Accent
            <input
              type="color"
              value={normalizeHexInput(customAccent).match(/^#[0-9a-f]{6}$/i) ? normalizeHexInput(customAccent) : "#d97706"}
              onChange={(e) => setCustomAccent(e.target.value)}
              className="mt-1 h-9 w-full cursor-pointer rounded border border-gray-200 bg-white"
            />
          </label>
          <label className="block text-xs font-medium text-gray-700">
            Page background
            <input
              type="color"
              value={normalizeHexInput(customCanvas).match(/^#[0-9a-f]{6}$/i) ? normalizeHexInput(customCanvas) : "#eef1f5"}
              onChange={(e) => setCustomCanvas(e.target.value)}
              className="mt-1 h-9 w-full cursor-pointer rounded border border-gray-200 bg-white"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn type="button" onClick={applyCustom}>
            Apply custom theme
          </Btn>
          <Btn type="button" variant="outline" onClick={resetToDefault}>
            Reset to Hayleigh default
          </Btn>
        </div>
        {mode === "custom" && (
          <p className="text-xs text-gray-500">Custom theme is active. Pick a preset above to switch back to a bundled palette.</p>
        )}
      </div>
    </Card>
  );
}

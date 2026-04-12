/** Persisted platform UI colours (layout unchanged). Maps to `--color-ht-*` in `index.css` / Tailwind theme. */

export const PLATFORM_THEME_STORAGE_KEY = "ht_platform_theme_v1";

export const PLATFORM_THEME_CHANGED_EVENT = "ht-platform-theme-changed";

export function emitPlatformThemeChanged(): void {
  window.dispatchEvent(new CustomEvent(PLATFORM_THEME_CHANGED_EVENT));
}

export const THEME_CSS_VARS = [
  "--color-ht-navy",
  "--color-ht-navy-mid",
  "--color-ht-slate",
  "--color-ht-slate-dark",
  "--color-ht-canvas",
  "--color-ht-border",
  "--color-ht-amber",
  "--color-ht-amber-dark",
  "--color-ht-body-text",
] as const;

export type ThemeCssVar = (typeof THEME_CSS_VARS)[number];

export type ThemeCssVars = Partial<Record<ThemeCssVar, string>>;

export type PlatformThemePresetId = "default" | "ocean" | "forest" | "wine" | "mono" | "custom";

export type CustomThemeSeeds = { brand: string; accent: string; canvas: string };

export type StoredPlatformTheme =
  | { preset: Exclude<PlatformThemePresetId, "custom"> }
  | { preset: "custom"; vars: ThemeCssVars; seeds?: CustomThemeSeeds };

const PRESET_VARS: Record<Exclude<PlatformThemePresetId, "custom">, ThemeCssVars> = {
  default: {},
  ocean: {
    "--color-ht-navy": "#082f49",
    "--color-ht-navy-mid": "#0c4a6e",
    "--color-ht-slate": "#0e7490",
    "--color-ht-slate-dark": "#155e75",
    "--color-ht-canvas": "#f0f9ff",
    "--color-ht-border": "#bae6fd",
    "--color-ht-amber": "#d97706",
    "--color-ht-amber-dark": "#b45309",
    "--color-ht-body-text": "#0c1929",
  },
  forest: {
    "--color-ht-navy": "#052e16",
    "--color-ht-navy-mid": "#14532d",
    "--color-ht-slate": "#166534",
    "--color-ht-slate-dark": "#14532d",
    "--color-ht-canvas": "#f0fdf4",
    "--color-ht-border": "#bbf7d0",
    "--color-ht-amber": "#ca8a04",
    "--color-ht-amber-dark": "#a16207",
    "--color-ht-body-text": "#0f172a",
  },
  wine: {
    "--color-ht-navy": "#450a0a",
    "--color-ht-navy-mid": "#7f1d1d",
    "--color-ht-slate": "#991b1b",
    "--color-ht-slate-dark": "#7f1d1d",
    "--color-ht-canvas": "#fef2f2",
    "--color-ht-border": "#fecaca",
    "--color-ht-amber": "#c2410c",
    "--color-ht-amber-dark": "#9a3412",
    "--color-ht-body-text": "#1c1917",
  },
  mono: {
    "--color-ht-navy": "#111827",
    "--color-ht-navy-mid": "#1f2937",
    "--color-ht-slate": "#374151",
    "--color-ht-slate-dark": "#1f2937",
    "--color-ht-canvas": "#f3f4f6",
    "--color-ht-border": "#d1d5db",
    "--color-ht-amber": "#4b5563",
    "--color-ht-amber-dark": "#374151",
    "--color-ht-body-text": "#111827",
  },
};

export const PLATFORM_THEME_PRESETS: {
  id: Exclude<PlatformThemePresetId, "custom">;
  label: string;
  description: string;
}[] = [
  { id: "default", label: "Hayleigh (default)", description: "Original navy & slate brand colours." },
  { id: "ocean", label: "Ocean", description: "Cool cyan and ice-blue backgrounds." },
  { id: "forest", label: "Forest", description: "Green accents with soft mint page tone." },
  { id: "wine", label: "Wine", description: "Deep red navigation with warm page tone." },
  { id: "mono", label: "Graphite", description: "Neutral greys with a calmer accent." },
];

function parseHex6(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function toHex6(r: number, g: number, b: number): string {
  const clamp = (x: number) => Math.max(0, Math.min(255, Math.round(x)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("")}`;
}

/** Move colour toward black (0–1) or white (0–1). */
export function blendToward(hex: string, target: "black" | "white", amount: number): string {
  const p = parseHex6(hex);
  if (!p) return hex;
  const t = Math.max(0, Math.min(1, amount));
  if (target === "black") {
    return toHex6(p.r * (1 - t), p.g * (1 - t), p.b * (1 - t));
  }
  return toHex6(p.r + (255 - p.r) * t, p.g + (255 - p.g) * t, p.b + (255 - p.b) * t);
}

/** Derive full token set from three user picks (brand, accent, page background). */
export function buildCustomThemeVars(brand: string, accent: string, canvas: string): ThemeCssVars {
  const b = parseHex6(brand);
  const a = parseHex6(accent);
  const c = parseHex6(canvas);
  if (!b || !a || !c) return {};
  const navy = blendToward(brand, "black", 0.42);
  const navyMid = blendToward(brand, "black", 0.22);
  const slateDark = blendToward(brand, "black", 0.18);
  const border = blendToward(canvas, "black", 0.12);
  const accentDark = blendToward(accent, "black", 0.2);
  const body = blendToward(canvas, "black", 0.88);
  return {
    "--color-ht-navy": navy,
    "--color-ht-navy-mid": navyMid,
    "--color-ht-slate": brand,
    "--color-ht-slate-dark": slateDark,
    "--color-ht-canvas": canvas,
    "--color-ht-border": border,
    "--color-ht-amber": accent,
    "--color-ht-amber-dark": accentDark,
    "--color-ht-body-text": body,
  };
}

export function clearThemeDomOverrides(root: HTMLElement = document.documentElement): void {
  for (const key of THEME_CSS_VARS) {
    root.style.removeProperty(key);
  }
}

export function applyThemeVars(vars: ThemeCssVars, root: HTMLElement = document.documentElement): void {
  for (const key of THEME_CSS_VARS) {
    const v = vars[key];
    if (v) root.style.setProperty(key, v);
    else root.style.removeProperty(key);
  }
}

export function applyStoredPlatformTheme(
  stored: StoredPlatformTheme | null,
  root: HTMLElement = document.documentElement,
): void {
  clearThemeDomOverrides(root);
  if (!stored) return;
  if (stored.preset === "custom") {
    applyThemeVars(stored.vars, root);
    return;
  }
  const presetVars = PRESET_VARS[stored.preset];
  if (presetVars && Object.keys(presetVars).length > 0) {
    applyThemeVars(presetVars, root);
  }
}

export function readStoredPlatformTheme(): StoredPlatformTheme | null {
  try {
    const raw = localStorage.getItem(PLATFORM_THEME_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const o = parsed as Record<string, unknown>;
    if (o.preset === "custom" && o.vars && typeof o.vars === "object") {
      const s = o.seeds;
      let seeds: CustomThemeSeeds | undefined;
      if (
        s &&
        typeof s === "object" &&
        typeof (s as CustomThemeSeeds).brand === "string" &&
        typeof (s as CustomThemeSeeds).accent === "string" &&
        typeof (s as CustomThemeSeeds).canvas === "string"
      ) {
        seeds = {
          brand: (s as CustomThemeSeeds).brand,
          accent: (s as CustomThemeSeeds).accent,
          canvas: (s as CustomThemeSeeds).canvas,
        };
      }
      return { preset: "custom", vars: o.vars as ThemeCssVars, seeds };
    }
    const preset = o.preset;
    if (
      preset === "default" ||
      preset === "ocean" ||
      preset === "forest" ||
      preset === "wine" ||
      preset === "mono"
    ) {
      return { preset };
    }
    return null;
  } catch {
    return null;
  }
}

export function writeStoredPlatformTheme(theme: StoredPlatformTheme | null): void {
  if (!theme || theme.preset === "default") {
    localStorage.removeItem(PLATFORM_THEME_STORAGE_KEY);
    return;
  }
  localStorage.setItem(PLATFORM_THEME_STORAGE_KEY, JSON.stringify(theme));
}

export function presetVarsFor(id: Exclude<PlatformThemePresetId, "custom">): ThemeCssVars {
  return { ...PRESET_VARS[id] };
}

/** Swatch colours for settings UI: brand / page / accent. */
export function presetPreviewStrip(id: Exclude<PlatformThemePresetId, "custom">): [string, string, string] {
  if (id === "default") {
    return ["#1e3a5f", "#eef1f5", "#d97706"];
  }
  const v = PRESET_VARS[id];
  return [
    v["--color-ht-slate"] ?? "#1e3a5f",
    v["--color-ht-canvas"] ?? "#eef1f5",
    v["--color-ht-amber"] ?? "#d97706",
  ];
}

export const DEFAULT_CUSTOM_SEEDS: CustomThemeSeeds = {
  brand: "#1e3a5f",
  accent: "#d97706",
  canvas: "#eef1f5",
};

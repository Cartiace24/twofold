export type ThemePresetId = "soft" | "romantic" | "natural" | "calm" | "midnight";

export interface ThemePreset {
  id: ThemePresetId;
  label: string;
  description: string;
  accent: string;
  secondary: string;
  background: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "soft",
    label: "Soft",
    description: "warm cream · dusty rose · muted brown",
    accent: "#8B3A4A",
    secondary: "#B98282",
    background: "#FAF6EF",
  },
  {
    id: "romantic",
    label: "Romantic",
    description: "warm ivory · wine/burgundy · dusty pink",
    accent: "#7D2E3B",
    secondary: "#D4A5A5",
    background: "#FFFDF5",
  },
  {
    id: "natural",
    label: "Natural",
    description: "warm cream · sage green · muted olive",
    accent: "#7A8B6F",
    secondary: "#B8C4A6",
    background: "#FAF6EF",
  },
  {
    id: "calm",
    label: "Calm",
    description: "soft blue-gray · cream · muted slate",
    accent: "#6B7D8A",
    secondary: "#A8B8C2",
    background: "#F5F0E8",
  },
  {
    id: "midnight",
    label: "Midnight",
    description: "dark charcoal/navy · warm cream text · muted rose",
    accent: "#C4908A",
    secondary: "#8B5E5E",
    background: "#171615",
  },
];

export const BG_OPTIONS = [
  { id: "warm", label: "Warm Paper", value: "#FAF6EF" },
  { id: "cream", label: "Soft Cream", value: "#F5F0E8" },
  { id: "blush", label: "Blush Paper", value: "#F8EEEE" },
  { id: "sage", label: "Sage Paper", value: "#EFF3EA" },
  { id: "night", label: "Night", value: "#171615" },
] as const;

export interface CoupleTheme {
  preset: ThemePresetId;
  name: string;
  accent: string;
  secondary: string;
  background: string;
}

export const DEFAULT_THEME: CoupleTheme = {
  preset: "soft",
  name: "Our Space",
  accent: "#7D2E3B",
  secondary: "#B98282",
  background: "#FAF6EF",
};

// keep the app's current default as fallback for legacy couples where theme is null
export const LEGACY_DEFAULT: CoupleTheme = {
  preset: "soft",
  name: "Our Space",
  accent: "#7D2E3B",
  secondary: "#B98282",
  background: "#FAF6EF",
};

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function isValidHex(v: string): boolean {
  return HEX_RE.test(v.trim());
}

export function normalizeHex(v: string): string {
  const t = v.trim();
  if (!isValidHex(t)) return v;
  if (t.length === 4) {
    return `#${t[1]}${t[1]}${t[2]}${t[2]}${t[3]}${t[3]}`.toUpperCase();
  }
  return t.toUpperCase();
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (full.length !== 6) return null;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function luminance(hex: string): number {
  const c = hexToRgb(hex);
  if (!c) return 0.5;
  const srgb = [c.r, c.g, c.b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

export function accentTextColor(bgHex: string): string {
  // WCAG-ish: light text on dark accent, dark text on light accent
  return luminance(bgHex) > 0.45 ? "#2B2622" : "#FFFEFA";
}

export function themeFromCouple(c: { accent?: string | null; secondary_accent?: string | null; background?: string | null; theme_preset?: string | null; theme_name?: string | null } | null): CoupleTheme {
  if (!c) return DEFAULT_THEME;
  const presetId = (c.theme_preset as ThemePresetId) || "soft";
  const preset = THEME_PRESETS.find((p) => p.id === presetId) ?? THEME_PRESETS[0];
  return {
    preset: presetId,
    name: (c.theme_name || "Our Space").slice(0, 32),
    accent: isValidHex(c.accent || "") ? normalizeHex(c.accent!) : preset.accent,
    secondary: isValidHex(c.secondary_accent || "") ? normalizeHex(c.secondary_accent!) : preset.secondary,
    background: isValidHex(c.background || "") ? normalizeHex(c.background!) : preset.background,
  };
}

export function themeToCouplePatch(t: CoupleTheme) {
  return {
    accent: normalizeHex(t.accent),
    secondary_accent: normalizeHex(t.secondary),
    background: normalizeHex(t.background),
    theme_preset: t.preset,
    theme_name: t.name.slice(0, 32),
  };
}

function isDark(hex: string): boolean {
  return luminance(hex) < 0.35;
}

export function themeCssVars(t: CoupleTheme): Record<string, string> {
  const accentText = accentTextColor(t.accent);
  const darkBg = isDark(t.background);
  // For dark backgrounds (midnight), flip surface/text/muted/border to dark mode
  const surface = darkBg ? "#232120" : "#FFFDF7";
  const text = darkBg ? "#FAF6EF" : "#2B2622";
  const muted = darkBg ? "#B8AEA0" : "#8A7F72";
  const border = darkBg ? "#3A3632" : "#E5DAC6";
  const paper = t.background;
  return {
    "--twofold-bg": paper,
    "--twofold-surface": surface,
    "--twofold-text": text,
    "--twofold-muted": muted,
    "--twofold-accent": t.accent,
    "--twofold-accent-text": accentText,
    "--twofold-secondary": t.secondary,
    "--twofold-border": border,
  };
}

export function applyTheme(t: CoupleTheme) {
  if (typeof document === "undefined") return;
  const vars = themeCssVars(t);
  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  // also set meta theme-color for mobile browser chrome
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", t.background);
}

export function resetTheme() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  ["--twofold-bg", "--twofold-surface", "--twofold-text", "--twofold-muted", "--twofold-accent", "--twofold-accent-text", "--twofold-secondary", "--twofold-border"].forEach((k) => root.style.removeProperty(k));
}

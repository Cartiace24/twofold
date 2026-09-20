/** 2026 film-inspired booth looks. Each preset carries two things:
 *  - `previewCss`: a lightweight CSS approximation for the live <video>.
 *  - `grade`: parametric values for the canvas pipeline (the export truth).
 *  Original approximations only — no film-stock profiles are reproduced. */

export interface GradeParams {
  exposure: number; // EV-ish offset, ±
  contrast: number; // 1 = neutral
  saturation: number; // 1 = neutral
  warmth: number; // -1..1, red/blue balance
  tint: number; // -1..1, + = magenta/pink
  shadowCool: number; // 0..1, cool shadows
  olive: number; // 0..1, greens drift to muted olive
  mono: boolean;
  lift: number; // 0..1, lifted blacks
  rolloff: number; // 0..1, highlight compression
  soften: number; // 0..1, clarity reduction
  glow: number; // 0..1, base halation
  grain: number; // 0..2, base grain
  vignette: number; // 0..1, base vignette
  leak: number; // 0..1, warm light leak
  dust: number; // 0..1, imperfections
  variation: boolean; // faint per-photo color drift (lo-fi character)
}

const NEUTRAL: GradeParams = {
  exposure: 0, contrast: 1, saturation: 1, warmth: 0, tint: 0,
  shadowCool: 0, olive: 0, mono: false, lift: 0, rolloff: 0,
  soften: 0, glow: 0, grain: 0, vignette: 0, leak: 0, dust: 0,
  variation: false,
};

export interface BoothPreset {
  id: string;
  label: string;
  previewCss: string;
  grade: GradeParams;
}

function g(p: Partial<GradeParams>): GradeParams {
  return { ...NEUTRAL, ...p };
}

export const BOOTH_PRESETS: BoothPreset[] = [
  {
    id: "original", label: "original",
    previewCss: "contrast(1.02)",
    grade: g({ contrast: 1.02, grain: 0.15, vignette: 0.06 }),
  },
  {
    id: "softfilm", label: "soft film",
    previewCss: "contrast(0.94) saturate(0.92) brightness(1.03) sepia(0.08)",
    grade: g({ exposure: 0.02, contrast: 0.94, saturation: 0.92, warmth: 0.08, lift: 0.18, rolloff: 0.5, soften: 0.1, grain: 0.5, vignette: 0.1 }),
  },
  {
    id: "portra", label: "portra",
    previewCss: "sepia(0.22) saturate(1.05) contrast(0.96) brightness(1.03)",
    grade: g({ exposure: 0.03, contrast: 0.95, saturation: 0.95, warmth: 0.16, tint: 0.03, lift: 0.28, rolloff: 0.55, olive: 0.5, grain: 0.5, vignette: 0.1, leak: 0.4 }),
  },
  {
    id: "flash", label: "flash",
    previewCss: "contrast(1.12) brightness(1.06) saturate(1.08)",
    grade: g({ exposure: 0.08, contrast: 1.1, saturation: 1.05, warmth: 0.06, shadowCool: 0.35, lift: 0.05, rolloff: 0.3, glow: 0.35, grain: 0.9, vignette: 0.22, leak: 0.25 }),
  },
  {
    id: "dreamy", label: "dreamy",
    previewCss: "contrast(0.9) saturate(0.95) brightness(1.05) sepia(0.1)",
    grade: g({ contrast: 0.88, saturation: 0.94, warmth: 0.1, tint: 0.08, lift: 0.12, rolloff: 0.6, soften: 0.35, glow: 0.45, grain: 0.45, vignette: 0.12 }),
  },
  {
    id: "olive", label: "olive",
    previewCss: "sepia(0.18) saturate(0.85) hue-rotate(20deg) contrast(0.95)",
    grade: g({ contrast: 0.93, saturation: 0.9, warmth: 0.06, shadowCool: 0.25, olive: 0.85, lift: 0.15, grain: 0.5, vignette: 0.12 }),
  },
  {
    id: "mono", label: "mono",
    previewCss: "grayscale(1) contrast(1.05) brightness(1.02)",
    grade: g({ contrast: 1.06, mono: true, lift: 0.18, rolloff: 0.4, grain: 0.55, vignette: 0.16 }),
  },
  {
    id: "lofi", label: "lo-fi",
    previewCss: "saturate(0.85) contrast(0.92) brightness(1.03)",
    grade: g({ contrast: 0.9, saturation: 0.82, warmth: 0.04, lift: 0.3, soften: 0.18, grain: 1.1, vignette: 0.24, dust: 0.7, variation: true }),
  },
];

export type BoothFrame = "none" | "polaroid" | "film" | "square";

export const BOOTH_FRAMES: Array<{ id: BoothFrame; label: string }> = [
  { id: "none", label: "bare" },
  { id: "polaroid", label: "polaroid" },
  { id: "film", label: "35mm" },
  { id: "square", label: "square" },
];

/** Photo-area aspect (w/h) each frame crops the sensor to. */
export function frameAspect(frame: BoothFrame): number | null {
  if (frame === "polaroid" || frame === "square") return 1;
  if (frame === "film") return 3 / 2;
  return null; // bare sensor
}

/** User-tunable layers (0..100 sliders). Added on top of the preset base. */
export interface AdjustState {
  grain: number;
  fade: number;
  glow: number;
  vignette: number;
}

export const ADJUST_DEFAULTS: AdjustState = { grain: 12, fade: 8, glow: 15, vignette: 18 };

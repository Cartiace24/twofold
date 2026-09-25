import type { AdjustState, BoothFrame, BoothPreset } from "./filters";
import { frameAspect } from "./filters";
import { compressImage, fileToDataUrl } from "../../lib/image";

const INK = "#2B2622";
const PAPER = "#FFFEFA";

/* ------------------------------------------------------------------ */
/* small utilities                                                     */
/* ------------------------------------------------------------------ */

export function supportsCanvasFilter(): boolean {
  try {
    const ctx = document.createElement("canvas").getContext("2d");
    return !!ctx && "filter" in ctx;
  } catch {
    return false;
  }
}

let filterMemo: boolean | null = null;
function filterOk(): boolean {
  if (filterMemo === null) filterMemo = supportsCanvasFilter();
  return filterMemo;
}

/** Real current-date stamp, e.g. "sep ’26". */
export function shortStamp(d = new Date()): string {
  const m = d.toLocaleDateString("en-US", { month: "short" }).toLowerCase();
  const y = String(d.getFullYear()).slice(2);
  return `${m} ’${y}`;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function loadFont(face: string, sizePx: number, weight = 600): Promise<string> {
  try {
    return document.fonts.load(`${weight} ${sizePx}px "${face}"`).then(
      () => `"${face}"`,
      () => (face === "Caveat" ? "cursive" : "Georgia, serif")
    );
  } catch {
    return Promise.resolve(face === "Caveat" ? "cursive" : "Georgia, serif");
  }
}

export function canvasToJpeg(canvas: HTMLCanvasElement, quality = 0.86): Promise<Blob> {
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("export failed"))), "image/jpeg", quality)
  );
}

/** Final handoff: pass through blobs that are already small, otherwise run
 *  the shared compressor once — never repeatedly compress the same image. */
export async function blobToFinalDataUrl(blob: Blob): Promise<string> {
  try {
    const bmp = await createImageBitmap(blob);
    const longEdge = Math.max(bmp.width, bmp.height);
    if (typeof bmp.close === "function") bmp.close();
    if (longEdge <= 1600 && blob.size <= 700 * 1024) return fileToDataUrl(blob);
  } catch {
    /* fall through to compress */
  }
  const small = await compressImage(new File([blob], "photobooth.jpg", { type: "image/jpeg" }));
  return fileToDataUrl(small);
}

/* ------------------------------------------------------------------ */
/* capture (source-preserving: no grading, no compression here)        */
/* ------------------------------------------------------------------ */

/** Plain full-resolution sensor grab. The source stays untouched until
 *  the user picks Use Photo — grading happens only at export. */
export function grabFrame(video: HTMLVideoElement, mirror: boolean, maxLong = 2000): HTMLCanvasElement | null {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;
  const s = Math.min(1, maxLong / Math.max(vw, vh));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(vw * s);
  canvas.height = Math.round(vh * s);
  const ctx = canvas.getContext("2d")!;
  if (mirror) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Tiny display-only thumbnail (never used for export). */
export function thumbDataUrl(video: HTMLVideoElement, mirror: boolean, w = 160): string | null {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;
  const h = Math.max(1, Math.round((w * vh) / vw));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  if (mirror) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, w, h);
  try {
    return canvas.toDataURL("image/jpeg", 0.7);
  } catch {
    return null;
  }
}

export async function decodeToCanvas(blob: Blob): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0);
  if (typeof bmp.close === "function") bmp.close();
  return canvas;
}

/* ------------------------------------------------------------------ */
/* grade resolution: preset × intensity + user adjust layers           */
/* ------------------------------------------------------------------ */

export interface ResolvedGrade {
  exposure: number;
  contrast: number;
  saturation: number;
  warmth: number;
  tint: number;
  shadowCool: number;
  olive: number;
  mono: boolean;
  lift: number;
  rolloff: number;
  soften: number;
  glowAmt: number;
  grainAmt: number;
  vigAmt: number;
  leak: number;
  dust: number;
  varR: number;
  varG: number;
  varB: number;
}

export function resolveGrade(preset: BoothPreset, intensityPct: number, adjust: AdjustState): ResolvedGrade {
  const k = clamp01(intensityPct / 100);
  const L = (v: number, neutral: number) => neutral + (v - neutral) * k;
  const g = preset.grade;
  const fadeK = clamp01(adjust.fade / 100);

  const contrast = L(g.contrast, 1) * (1 - fadeK * 0.12);
  const saturation = (g.mono ? 0 : L(g.saturation, 1)) * (1 - fadeK * 0.08);

  return {
    exposure: L(g.exposure, 0),
    contrast,
    saturation,
    warmth: L(g.warmth, 0),
    tint: L(g.tint, 0),
    shadowCool: L(g.shadowCool, 0),
    olive: L(g.olive, 0),
    mono: g.mono,
    lift: L(g.lift, 0) + fadeK * 0.35,
    rolloff: L(g.rolloff, 0),
    soften: L(g.soften, 0),
    glowAmt: Math.min(1, g.glow * (0.3 + 0.7 * k) + (adjust.glow / 100) * 0.9),
    grainAmt: Math.min(2.2, g.grain * (0.3 + 0.7 * k) + (adjust.grain / 100) * 1.6),
    vigAmt: Math.min(0.6, g.vignette * (0.4 + 0.6 * k) + (adjust.vignette / 100) * 0.55),
    leak: L(g.leak, 0),
    dust: L(g.dust, 0),
    varR: g.variation ? (Math.random() - 0.5) * 0.024 : 0,
    varG: g.variation ? (Math.random() - 0.5) * 0.024 : 0,
    varB: g.variation ? (Math.random() - 0.5) * 0.024 : 0,
  };
}

/* ------------------------------------------------------------------ */
/* photographic grade (per-pixel, single pass incl. grain)             */
/* ------------------------------------------------------------------ */

export function gradePhotoCanvas(source: HTMLCanvasElement, r: ResolvedGrade): HTMLCanvasElement {
  const w = source.width;
  const h = source.height;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0);

  // clarity reduction first (blend a soft copy underneath the grade)
  if (r.soften > 0.01 && filterOk()) {
    const soft = document.createElement("canvas");
    soft.width = w;
    soft.height = h;
    const sctx = soft.getContext("2d")!;
    try {
      sctx.filter = `blur(${Math.round(2 + r.soften * 3)}px)`;
    } catch {
      /* no soften without ctx.filter */
    }
    if (sctx.filter && sctx.filter !== "none") {
      sctx.drawImage(source, 0, 0);
      ctx.save();
      ctx.globalAlpha = Math.min(0.5, r.soften * 0.55);
      ctx.drawImage(soft, 0, 0);
      ctx.restore();
    }
  }

  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const expo = Math.pow(2, r.exposure);
  const cont = r.contrast;
  const sat = r.saturation;
  const wR = 1 + r.warmth * 0.12;
  const wB = 1 - r.warmth * 0.12;
  const tRB = 1 + r.tint * 0.06;
  const tG = 1 - r.tint * 0.06;
  const sc = r.shadowCool;
  const ol = r.olive;
  const lf = r.lift;
  const ro = r.rolloff;
  const ga = r.grainAmt;
  const mono = r.mono;

  // fast deterministic-ish grain source (varies per render)
  let s = ((Date.now() ^ (w * 31 + h)) >>> 0) || 1;
  const rnd = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };

  for (let i = 0; i < d.length; i += 4) {
    let R = (d[i] / 255) * expo;
    let G = (d[i + 1] / 255) * expo;
    let B = (d[i + 2] / 255) * expo;

    if (mono) {
      const l = 0.2126 * R + 0.7152 * G + 0.0722 * B;
      R = G = B = l;
    }
    R += r.varR;
    G += r.varG;
    B += r.varB;

    R *= wR;
    B *= wB;
    R *= tRB;
    B *= tRB;
    G *= tG;

    let lum = 0.2126 * R + 0.7152 * G + 0.0722 * B;
    if (sc > 0) {
      const sh = 1 - Math.min(1, lum);
      const k2 = sh * sh * sc;
      B += k2 * 0.08;
      R -= k2 * 0.04;
    }
    if (ol > 0) {
      const mx = R > B ? R : B;
      let gr = (G - mx) * 2;
      gr = gr < 0 ? 0 : gr > 1 ? 1 : gr;
      G -= gr * ol * 0.1;
      R += gr * ol * 0.05;
    }

    lum = 0.2126 * R + 0.7152 * G + 0.0722 * B;
    R = lum + (R - lum) * sat;
    G = lum + (G - lum) * sat;
    B = lum + (B - lum) * sat;

    R = 0.5 + (R - 0.5) * cont;
    G = 0.5 + (G - 0.5) * cont;
    B = 0.5 + (B - 0.5) * cont;

    if (lf > 0) {
      const liftK = lf * 0.14;
      const tR = 1 - Math.min(1, Math.max(0, R));
      const tG2 = 1 - Math.min(1, Math.max(0, G));
      const tB = 1 - Math.min(1, Math.max(0, B));
      R += liftK * tR * tR;
      G += liftK * tG2 * tG2;
      B += liftK * tB * tB;
    }
    if (ro > 0) {
      const rk = 1 - ro * 0.55;
      if (R > 0.72) R = 0.72 + (R - 0.72) * rk;
      if (G > 0.72) G = 0.72 + (G - 0.72) * rk;
      if (B > 0.72) B = 0.72 + (B - 0.72) * rk;
    }

    if (ga > 0) {
      const l2 = lum < 0 ? 0 : lum > 1 ? 1 : lum;
      const n = (rnd() * 2 - 1) * ga * (1 - l2 * 0.55) * 0.09;
      R += n;
      G += n;
      B += n;
    }

    d[i] = R < 0 ? 0 : R > 1 ? 255 : Math.round(R * 255);
    d[i + 1] = G < 0 ? 0 : G > 1 ? 255 : Math.round(G * 255);
    d[i + 2] = B < 0 ? 0 : B > 1 ? 255 : Math.round(B * 255);
  }
  ctx.putImageData(img, 0, 0);

  applyGlow(ctx, w, h, r.glowAmt);

  if (r.vigAmt > 0.005) {
    const g2 = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.72);
    g2.addColorStop(0, "rgba(30,20,14,0)");
    g2.addColorStop(1, `rgba(30,20,14,${(r.vigAmt * 0.55).toFixed(3)})`);
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, w, h);
  }
  if (r.leak > 0.01) {
    const g2 = ctx.createLinearGradient(w * 0.55, 0, w, h * 0.6);
    g2.addColorStop(0, "rgba(232,168,56,0)");
    g2.addColorStop(1, `rgba(232,120,60,${(r.leak * 0.2).toFixed(3)})`);
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, w, h);
  }
  const dustN = Math.round(r.dust * 14 + (r.grainAmt > 0.9 ? 6 : 0));
  if (dustN > 0) {
    ctx.fillStyle = "rgba(250,246,239,0.35)";
    for (let i = 0; i < dustN; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.beginPath();
      ctx.arc(x, y, 1 + Math.random() * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return canvas;
}

/** Highlight halation: blurred bright copy screened back over the image.
 *  Bright areas bloom; dark areas barely move. Skipped where ctx.filter
 *  is unavailable (the grade itself still applies). */
function applyGlow(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) {
  if (amount <= 0.01 || !filterOk()) return;
  const sw = 160;
  const sh = Math.max(1, Math.round((160 * h) / w));
  const small = document.createElement("canvas");
  small.width = sw;
  small.height = sh;
  const sctx = small.getContext("2d")!;
  try {
    sctx.filter = "blur(7px) brightness(1.5) saturate(1.15)";
  } catch {
    return;
  }
  if (!sctx.filter || sctx.filter === "none") return;
  sctx.drawImage(ctx.canvas, 0, 0, sw, sh);
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = Math.min(0.5, amount * 0.5);
  ctx.drawImage(small, 0, 0, w, h);
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* frames + strip chrome (rendered into the export)                    */
/* ------------------------------------------------------------------ */

export function coverSrc(sw: number, sh: number, dw: number, dh: number, biasY = 0.5) {
  const target = dw / dh;
  const src = sw / sh;
  let sx = 0;
  let sy = 0;
  let w = sw;
  let h = sh;
  if (src > target) {
    w = sh * target;
    sx = (sw - w) / 2;
  } else {
    h = sw / target;
    // biasY: 0.5 = center (default), 0 = keep the top. Selfies carry faces
    // near the top, so the together strip anchors there instead of centering.
    sy = (sh - h) * biasY;
  }
  return { sx, sy, w, h };
}

function sprockets(ctx: CanvasRenderingContext2D, w: number, y: number, h: number) {
  ctx.fillStyle = "#141110";
  ctx.fillRect(0, y, w, h);
  const holeW = Math.max(14, w / 28);
  const holeH = h * 0.52;
  const gap = holeW * 0.9;
  ctx.fillStyle = "#E9DDC8";
  for (let x = gap / 2; x + holeW < w; x += holeW + gap) {
    const hy = y + (h - holeH) / 2;
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(x, hy, holeW, holeH, 3);
      ctx.fill();
    } else {
      ctx.fillRect(x, hy, holeW, holeH);
    }
  }
}

/** Wrap a graded photo canvas in frame chrome. Non-bare frames first
 *  center cover-crop the photo to the frame aspect (matching the preview). */
export async function framePhotoCanvas(photo: HTMLCanvasElement, frame: BoothFrame): Promise<HTMLCanvasElement> {
  if (frame === "none") return photo;
  const aspect = frameAspect(frame) ?? photo.width / photo.height;
  const crop = coverSrc(photo.width, photo.height, aspect, 1);
  const pw = Math.round(crop.w);
  const ph = Math.round(crop.h);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  const blit = (dx: number, dy: number) =>
    ctx.drawImage(photo, crop.sx, crop.sy, crop.w, crop.h, dx, dy, pw, ph);

  if (frame === "polaroid") {
    const mx = Math.round(pw * 0.09);
    const top = Math.round(pw * 0.09);
    const bottom = Math.round(pw * 0.3);
    canvas.width = pw + mx * 2;
    canvas.height = ph + top + bottom;
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    blit(mx, top);
    const fraunces = await loadFont("Fraunces", 44);
    ctx.fillStyle = INK;
    ctx.font = `600 34px ${fraunces}`;
    ctx.textBaseline = "middle";
    ctx.fillText("twofold", mx, top + ph + bottom * 0.52);
    ctx.textAlign = "right";
    ctx.font = "700 25px ui-monospace, monospace";
    ctx.fillStyle = "#7D2E3B";
    ctx.fillText(shortStamp(), canvas.width - mx, top + ph + bottom * 0.52);
    ctx.textAlign = "left";
  } else if (frame === "film") {
    const bar = Math.round(ph * 0.16);
    canvas.width = pw;
    canvas.height = ph + bar * 2;
    ctx.fillStyle = "#141110";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    blit(0, bar);
    sprockets(ctx, canvas.width, 0, bar);
    sprockets(ctx, canvas.width, bar + ph, bar);
  } else {
    const b = Math.round(pw * 0.035);
    canvas.width = pw + b * 2;
    canvas.height = ph + b * 2;
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    blit(b, b);
  }
  return canvas;
}

/** Combine graded photo canvases into one vertical printed strip. */
export function composeStripCanvas(photos: HTMLCanvasElement[]): HTMLCanvasElement {
  const W = 900;
  const pad = 42;
  const gap = 22;
  const photoW = W - pad * 2;
  const photoH = Math.round((photoW * 3) / 4);
  const footH = 190;
  const H = pad + photos.length * photoH + (photos.length - 1) * gap + footH + pad;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);

  let y = pad;
  for (const photo of photos) {
    const { sx, sy, w, h } = coverSrc(photo.width, photo.height, photoW, photoH);
    ctx.drawImage(photo, sx, sy, w, h, pad, y, photoW, photoH);
    ctx.strokeStyle = "rgba(43,38,34,0.25)";
    ctx.lineWidth = 2;
    ctx.strokeRect(pad + 1, y + 1, photoW - 2, photoH - 2);
    y += photoH + gap;
  }
  return canvas;
}

/** Combine two graded long-distance captures into one vertical
 *  photobooth print: creator on top, partner below (role-based order so
 *  both devices compose the identical strip), each with a name caption,
 *  finished with the standard twofold footer. */
export async function composeTogetherStripCanvas(
  creator: HTMLCanvasElement,
  partner: HTMLCanvasElement,
  creatorName: string,
  partnerName: string
): Promise<HTMLCanvasElement> {
  const W = 900;
  const pad = 42;
  const gap = 22;
  const captionH = 58;
  const photoW = W - pad * 2;
  const photoH = Math.round((photoW * 3) / 4);
  const footH = 190;
  const H = pad + (photoH + captionH) * 2 + gap + footH + pad;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);

  const caveat = await loadFont("Caveat", 44);
  let y = pad;
  const pairs: Array<[HTMLCanvasElement, string]> = [
    [creator, creatorName],
    [partner, partnerName],
  ];
  for (const [photo, name] of pairs) {
    // Anchor toward the top so portrait selfies keep heads, not necks.
    const { sx, sy, w, h } = coverSrc(photo.width, photo.height, photoW, photoH, 0.15);
    ctx.drawImage(photo, sx, sy, w, h, pad, y, photoW, photoH);
    ctx.strokeStyle = "rgba(43,38,34,0.25)";
    ctx.lineWidth = 2;
    ctx.strokeRect(pad + 1, y + 1, photoW - 2, photoH - 2);
    ctx.fillStyle = "#8A7F72";
    ctx.font = `500 40px ${caveat}`;
    ctx.textBaseline = "middle";
    ctx.fillText(name ? `${name} ♡` : "♡", pad + 4, y + photoH + captionH / 2);
    y += photoH + captionH + gap;
  }
  await stampStripFooter(canvas);
  return canvas;
}

/* ------------------------------------------------------------------ */
/* together frame: post-capture two-photo compositions                 */
/* ------------------------------------------------------------------ */

export type TogetherLayout = "side" | "stack" | "polaroid";
export type TogetherFrameStyle = "paper" | "film" | "polaroid";

const WINE = "#7D2E3B";
const MUTED = "#8A7F72";

/** Draw the COMPLETE photo, proportionally scaled — never cropped, never
 *  stretched. The destination rect must already match the photo aspect. */
function drawWholePhoto(
  ctx: CanvasRenderingContext2D,
  photo: HTMLCanvasElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number
) {
  ctx.fillStyle = PAPER;
  ctx.fillRect(dx, dy, dw, dh);
  ctx.drawImage(photo, 0, 0, photo.width, photo.height, dx, dy, dw, dh);
  ctx.strokeStyle = "rgba(43,38,34,0.25)";
  ctx.lineWidth = 2;
  ctx.strokeRect(dx + 1, dy + 1, dw - 2, dh - 2);
}

function footerHeight(caption: string, showDate: boolean, showMark: boolean): number {
  let h = 30;
  if (caption.trim()) h += 78;
  if (showDate || showMark) h += 92;
  return h;
}

async function drawFrameFooter(
  ctx: CanvasRenderingContext2D,
  W: number,
  pad: number,
  y: number,
  opts: { caption: string; showDate: boolean; showMark: boolean; date?: Date }
): Promise<number> {
  const cap = opts.caption.trim().slice(0, 80);
  if (cap) {
    const caveat = await loadFont("Caveat", 46);
    ctx.fillStyle = "#4A423B";
    ctx.font = `500 46px ${caveat}`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText(cap, W / 2, y + 38, W - pad * 2);
    ctx.textAlign = "left";
    y += 78;
  }
  if (opts.showMark || opts.showDate) {
    const fraunces = await loadFont("Fraunces", 56);
    ctx.textBaseline = "middle";
    if (opts.showMark) {
      ctx.fillStyle = INK;
      ctx.font = `600 54px ${fraunces}`;
      ctx.fillText("twofold ♡", pad, y + 42);
    }
    if (opts.showDate) {
      ctx.textAlign = "right";
      ctx.font = "700 30px ui-monospace, monospace";
      ctx.fillStyle = WINE;
      ctx.fillText(shortStamp(opts.date), W - pad, y + 42);
      ctx.textAlign = "left";
    }
    y += 92;
  }
  return y + 30;
}

async function drawPhotoName(
  ctx: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number
) {
  if (!name.trim()) return;
  const caveat = await loadFont("Caveat", 40);
  ctx.fillStyle = MUTED;
  ctx.font = `500 38px ${caveat}`;
  ctx.textBaseline = "middle";
  ctx.fillText(`${name.trim().slice(0, 24)} ♡`, x, y);
}

export interface TogetherFrameOpts {
  layout: TogetherLayout;
  /** Frame chrome for side/stack; polaroid layout has its fixed look. */
  frame: TogetherFrameStyle;
  photoA: HTMLCanvasElement;
  photoB: HTMLCanvasElement;
  nameA: string;
  nameB: string;
  showNames: boolean;
  showDate: boolean;
  showMark: boolean;
  caption: string;
  date?: Date;
  maxLong?: number;
}

/** Contain-fit: scale the whole photo proportionally into a box of at most
 *  (maxW × maxH). Nothing is ever cropped. */
function containSize(
  sw: number,
  sh: number,
  maxW: number,
  maxH: number
): { w: number; h: number } {
  const s = Math.min(maxW / sw, maxH / sh);
  return { w: Math.max(1, Math.round(sw * s)), h: Math.max(1, Math.round(sh * s)) };
}

async function gridFrameCanvas(o: TogetherFrameOpts): Promise<HTMLCanvasElement> {
  const side = o.layout === "side";
  const pad = 48;
  const gap = 24;
  const nameH = o.showNames ? 58 : 0;
  const footH = footerHeight(o.caption, o.showDate, o.showMark);
  const filmBar = o.frame === "film" ? 90 : 0;
  const polaroidPad = o.frame === "polaroid" ? 40 : 0;

  // Composition adapts to the photos: shared row height (side) or shared
  // column width (stack), everything else derived from real aspects.
  let cellA = { w: 0, h: 0 };
  let cellB = { w: 0, h: 0 };
  let contentW = 0;
  let blockH = 0;
  if (side) {
    let rowH = 900;
    const aA = o.photoA.width / o.photoA.height;
    const aB = o.photoB.width / o.photoB.height;
    if ((rowH * aA + gap + rowH * aB) > 2000) {
      rowH = Math.round(((2000 - gap) / (aA + aB)) * 10) / 10;
    }
    cellA = { w: Math.round(rowH * aA), h: Math.round(rowH) };
    cellB = { w: Math.round(rowH * aB), h: Math.round(rowH) };
    contentW = cellA.w + gap + cellB.w;
    blockH = Math.round(rowH) + nameH;
  } else {
    const colW = 1104;
    cellA = { w: colW, h: Math.round(colW / (o.photoA.width / o.photoA.height)) };
    cellB = { w: colW, h: Math.round(colW / (o.photoB.width / o.photoB.height)) };
    contentW = colW;
    blockH = cellA.h + nameH + gap + cellB.h + nameH;
  }
  const W = contentW + pad * 2 + polaroidPad * 2;
  const H = filmBar + pad + polaroidPad + blockH + footH + pad + polaroidPad + filmBar;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (o.frame === "polaroid") {
    ctx.strokeStyle = "rgba(43,38,34,0.35)";
    ctx.lineWidth = 3;
    ctx.strokeRect(14, filmBar + 14, canvas.width - 28, H - filmBar * 2 - 28);
  }
  if (o.frame === "film") {
    sprockets(ctx, canvas.width, 0, filmBar);
    sprockets(ctx, canvas.width, H - filmBar, filmBar);
  }

  const ox = pad + polaroidPad;
  const oy = filmBar + pad + polaroidPad;
  const cells = side
    ? [
        { x: ox, y: oy },
        { x: ox + cellA.w + gap, y: oy },
      ]
    : [
        { x: ox, y: oy },
        { x: ox, y: oy + cellA.h + nameH + gap },
      ];
  const photos = [
    { photo: o.photoA, size: cellA, name: o.nameA },
    { photo: o.photoB, size: cellB, name: o.nameB },
  ];
  for (let i = 0; i < 2; i++) {
    drawWholePhoto(ctx, photos[i].photo, cells[i].x, cells[i].y, photos[i].size.w, photos[i].size.h);
    if (o.showNames) {
      await drawPhotoName(
        ctx,
        photos[i].name,
        cells[i].x + 4,
        cells[i].y + photos[i].size.h + nameH / 2
      );
    }
  }
  await drawFrameFooter(ctx, canvas.width, ox, oy + blockH, {
    caption: o.caption,
    showDate: o.showDate,
    showMark: o.showMark,
    date: o.date,
  });
  return canvas;
}

async function polaroidFrameCanvas(o: TogetherFrameOpts): Promise<HTMLCanvasElement> {
  const W = 1200;
  const pad = 48;
  const bw = 26;
  const foot = 104;
  // Each card fits its whole photo inside a max box — full image, no crop.
  const fitA = containSize(o.photoA.width, o.photoA.height, 620, 500);
  const fitB = containSize(o.photoB.width, o.photoB.height, 620, 500);
  const cards = [
    { photo: o.photoA, size: fitA, name: o.nameA, cx: 555, rot: -4 },
    { photo: o.photoB, size: fitB, name: o.nameB, cx: 645, rot: 3.5 },
  ];
  const cardHs = cards.map((c) => c.size.h + bw + foot);
  const overlap = 30;
  const top = 110;
  const footY = top + cardHs[0] + cardHs[1] - overlap;
  const footH = footerHeight(o.caption, o.showDate, o.showMark);
  const H = footY + footH + pad;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);

  let y = top;
  for (const c of cards) {
    const cw = c.size.w + bw * 2;
    const ch = c.size.h + bw + foot;
    const cy = y + ch / 2;
    ctx.save();
    ctx.translate(c.cx, cy);
    ctx.rotate((c.rot * Math.PI) / 180);
    ctx.shadowColor = "rgba(43,38,34,0.28)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = "#FFFEFA";
    ctx.fillRect(-cw / 2, -ch / 2, cw, ch);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    drawWholePhoto(ctx, c.photo, -c.size.w / 2, -ch / 2 + bw, c.size.w, c.size.h);
    if (o.showNames && c.name.trim()) {
      const caveat = await loadFont("Caveat", 40);
      ctx.fillStyle = MUTED;
      ctx.font = `500 36px ${caveat}`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillText(c.name.trim().slice(0, 24), 0, ch / 2 - foot / 2);
      ctx.textAlign = "left";
    }
    ctx.restore();
    y += ch - overlap;
  }
  await drawFrameFooter(ctx, W, pad, footY, {
    caption: o.caption,
    showDate: o.showDate,
    showMark: o.showMark,
    date: o.date,
  });
  return canvas;
}

/** Final Together Frame composition at print scale (long edge ≤ maxLong),
 *  exported by the caller with canvasToJpeg. */
export async function composeTogetherFrameCanvas(o: TogetherFrameOpts): Promise<HTMLCanvasElement> {
  const full =
    o.layout === "polaroid" ? await polaroidFrameCanvas(o) : await gridFrameCanvas(o);
  const maxLong = o.maxLong ?? 1600;
  const long = Math.max(full.width, full.height);
  if (long <= maxLong) return full;
  const s = maxLong / long;
  const small = document.createElement("canvas");
  small.width = Math.round(full.width * s);
  small.height = Math.round(full.height * s);
  small.getContext("2d")!.drawImage(full, 0, 0, small.width, small.height);
  return small;
}

export async function stampStripFooter(canvas: HTMLCanvasElement): Promise<void> {
  const ctx = canvas.getContext("2d")!;
  const W = canvas.width;
  const H = canvas.height;
  const pad = 42;
  const footH = 190;
  const fy = H - pad - footH / 2;
  const fraunces = await loadFont("Fraunces", 64);
  ctx.fillStyle = INK;
  ctx.textBaseline = "middle";
  ctx.font = `600 56px ${fraunces}`;
  ctx.fillText("twofold", pad, fy - 8);
  const caveat = await loadFont("Caveat", 44);
  ctx.fillStyle = "#8A7F72";
  ctx.font = `500 40px ${caveat}`;
  ctx.fillText("two lives, one story", pad, fy + 44);
  ctx.textAlign = "right";
  ctx.font = "700 30px ui-monospace, monospace";
  ctx.fillStyle = "#7D2E3B";
  ctx.fillText(shortStamp(), W - pad, fy + 10);
  ctx.textAlign = "left";
}

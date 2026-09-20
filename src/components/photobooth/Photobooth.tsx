import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Aperture, ImagePlus, Loader2, RefreshCw, SwitchCamera, X, Zap, ZapOff } from "lucide-react";
import { useApp } from "../../store/AppContext";
import { todayISO } from "../../lib/format";
import { Button, Sheet } from "../ui/primitives";
import { Doodle, FilterTabs, Tape } from "../scrapbook/bits";
import { MemoryForm } from "../forms/forms";
import { ADJUST_DEFAULTS, BOOTH_FRAMES, BOOTH_PRESETS, type AdjustState, type BoothFrame } from "./filters";
import {
  blobToFinalDataUrl,
  canvasToJpeg,
  composeStripCanvas,
  decodeToCanvas,
  framePhotoCanvas,
  grabFrame,
  gradePhotoCanvas,
  resolveGrade,
  shortStamp,
  stampStripFooter,
  thumbDataUrl,
} from "./render";
import { useCamera, type Facing } from "./useCamera";

function wait(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

const GRAIN_BG = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='140' height='140' filter='url(%23n)'/></svg>")`;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-3 min-h-[48px]">
      <span className="w-[76px] shrink-0 text-[12.5px] font-bold uppercase tracking-[0.1em] text-[#8A7F72]">
        {label}
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="flex-1 h-12 accent-[#7D2E3B]"
      />
      <span className="w-8 text-right font-hand text-[20px] leading-none text-[#4A423B]">{value}</span>
    </label>
  );
}

type Stage = "camera" | "result";

export default function Photobooth() {
  const { addMemory, user } = useApp();
  const nav = useNavigate();

  const [facing, setFacing] = useState<Facing>("environment");
  const [presetId, setPresetId] = useState("softfilm");
  const [intensity, setIntensity] = useState(100);
  const [adjust, setAdjust] = useState<AdjustState>(ADJUST_DEFAULTS);
  const [frame, setFrame] = useState<BoothFrame>("polaroid");
  const [flash, setFlash] = useState(true);
  const [timer, setTimer] = useState(0);
  const [mode, setMode] = useState<"single" | "strip">("single");
  const [stripCount, setStripCount] = useState<3 | 4>(4);

  const [stage, setStage] = useState<Stage>("camera");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flashOn, setFlashOn] = useState(false);
  const [shotThumbs, setShotThumbs] = useState<string[]>([]);
  const [thumbSrc, setThumbSrc] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultIsStrip, setResultIsStrip] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("developing…");
  const [pageError, setPageError] = useState("");

  // Save flow
  const [showSave, setShowSave] = useState(false);
  const [saveView, setSaveView] = useState<"choice" | "memory">("choice");
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [finalDataUrl, setFinalDataUrl] = useState<string | null>(null);

  const { videoRef, status, detail, restart } = useCamera(facing);
  const capturingRef = useRef(false);
  const pendingKindRef = useRef<"single" | "strip" | null>(null);
  const resultBlobRef = useRef<Blob | null>(null);
  const shotBlobsRef = useRef<Blob[]>([]);

  const preset = BOOTH_PRESETS.find((f) => f.id === presetId) ?? BOOTH_PRESETS[0];
  const mirror = facing === "user";
  const camBusy = countdown !== null || busy;
  const thumbsRef = useRef<string[]>([]);
  thumbsRef.current = shotThumbs;

  // Revoke preview object URLs when replaced / on unmount.
  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  // Live filter-carousel source: tiny frame every few seconds (display only).
  useEffect(() => {
    if (stage !== "camera" || status !== "ready") return;
    const grab = () => {
      const v = videoRef.current;
      if (!v || v.readyState < 2) return;
      const t = thumbDataUrl(v, mirror);
      if (t) setThumbSrc(t);
    };
    grab();
    const id = window.setInterval(grab, 2500);
    return () => window.clearInterval(id);
  }, [stage, status, mirror, videoRef]);

  const showResult = useCallback((blob: Blob, isStrip: boolean) => {
    setResultUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(blob);
    });
    resultBlobRef.current = blob;
    setResultIsStrip(isStrip);
    setStage("result");
  }, []);

  const flashSnap = useCallback(
    async (fn: () => Promise<void>) => {
      if (flash) {
        setFlashOn(true);
        await wait(280);
      }
      try {
        await fn();
      } finally {
        if (flash) {
          setFlashOn(true);
          await wait(160);
          setFlashOn(false);
        }
      }
    },
    [flash]
  );

  const graded = useCallback(
    (source: HTMLCanvasElement) => gradePhotoCanvas(source, resolveGrade(preset, intensity, adjust)),
    [preset, intensity, adjust]
  );

  const captureSingle = useCallback(async () => {
    const video = videoRef.current;
    if (!video || status !== "ready") return;
    const src = grabFrame(video, mirror);
    if (!src) throw new Error("camera not ready");
    setBusyLabel("developing…");
    setBusy(true);
    try {
      const framed = await framePhotoCanvas(graded(src), frame);
      showResult(await canvasToJpeg(framed), false);
    } finally {
      setBusy(false);
    }
  }, [videoRef, status, mirror, graded, frame, showResult]);

  const captureStripShot = useCallback(async () => {
    const video = videoRef.current;
    if (!video || status !== "ready") return;
    // Freeze a near-lossless source once; grading happens at export, never twice.
    const src = grabFrame(video, mirror);
    if (!src) throw new Error("camera not ready");
    const frozen = await canvasToJpeg(src, 0.95);
    const thumb = thumbDataUrl(video, mirror);
    const nextBlobs = [...shotBlobsRef.current, frozen];
    shotBlobsRef.current = nextBlobs;
    const nextThumbs = thumb ? [...thumbsRef.current, thumb] : [...thumbsRef.current];
    setShotThumbs(nextThumbs);
    if (nextBlobs.length >= stripCount) {
      setBusyLabel("printing your strip…");
      setBusy(true);
      try {
        const photos: HTMLCanvasElement[] = [];
        for (const b of nextBlobs) {
          photos.push(graded(await decodeToCanvas(b)));
        }
        const strip = composeStripCanvas(photos);
        await stampStripFooter(strip);
        showResult(await canvasToJpeg(strip), true);
      } finally {
        setBusy(false);
      }
    }
  }, [videoRef, status, mirror, graded, stripCount, showResult]);

  // Shared countdown driver for timer + strip shots.
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      const t = window.setTimeout(() => {
        setCountdown(null);
        const kind = pendingKindRef.current;
        pendingKindRef.current = null;
        if (capturingRef.current) return;
        capturingRef.current = true;
        void (async () => {
          try {
            if (kind === "strip") await flashSnap(captureStripShot);
            else await flashSnap(captureSingle);
          } catch {
            setPageError("Couldn't grab that frame — try again?");
          } finally {
            capturingRef.current = false;
          }
        })();
      }, 400);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : null)), 1000);
    return () => window.clearTimeout(t);
  }, [countdown, flashSnap, captureSingle, captureStripShot]);

  const pressCapture = () => {
    if (capturingRef.current || camBusy || status !== "ready" || stage !== "camera") return;
    setPageError("");
    if (mode === "strip") {
      if (shotThumbs.length >= stripCount) return;
      pendingKindRef.current = "strip";
      setCountdown(3);
      return;
    }
    if (timer > 0) {
      pendingKindRef.current = "single";
      setCountdown(timer);
      return;
    }
    pendingKindRef.current = null;
    if (capturingRef.current) return;
    capturingRef.current = true;
    void (async () => {
      try {
        await flashSnap(captureSingle);
      } catch {
        setPageError("Couldn't grab that frame — try again?");
      } finally {
        capturingRef.current = false;
      }
    })();
  };

  const retakeStripLast = () => {
    if (countdown !== null || busy) return;
    shotBlobsRef.current = shotBlobsRef.current.slice(0, -1);
    setShotThumbs((prev) => prev.slice(0, -1));
  };

  const backToCamera = () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    resultBlobRef.current = null;
    shotBlobsRef.current = [];
    setShotThumbs([]);
    setPageError("");
    setStage("camera");
  };

  const openSave = async () => {
    const blob = resultBlobRef.current;
    if (!blob || busy) return;
    setSaveError("");
    setBusyLabel("getting it ready…");
    setBusy(true);
    try {
      // Pass through when already small, compress once when not — the same
      // shared pipeline MemoryForm uses (private via couple RLS, demo-safe).
      setFinalDataUrl(await blobToFinalDataUrl(blob));
      setSaveView("choice");
      setShowSave(true);
    } catch {
      setSaveError("Couldn't get that photo ready — try retaking?");
    } finally {
      setBusy(false);
    }
  };

  const savePhotoOnly = async () => {
    if (!finalDataUrl || saveBusy) return;
    setSaveBusy(true);
    setSaveError("");
    try {
      const id = await addMemory({
        title: resultIsStrip ? "Photobooth strip" : "Photobooth",
        caption: "",
        date: todayISO(),
        location_label: "",
        tags: ["photobooth"],
        creator: user?.displayName ?? "You",
        favorite: false,
        photos: [{ id: `${Date.now()}-0`, url: finalDataUrl, caption: "", sort: 0 }],
      });
      setShowSave(false);
      nav(`/memories/${id}`);
    } catch (e) {
      setSaveError(
        e instanceof Error && /quota|storage/i.test(e.message)
          ? "Too big for demo storage on this device — try a shorter strip?"
          : "Couldn't save — check connection and try again?"
      );
    } finally {
      setSaveBusy(false);
    }
  };

  const flip = () => {
    if (camBusy || stage !== "camera") return;
    setFacing((f) => (f === "user" ? "environment" : "user"));
  };

  const filmStripRef = useRef<HTMLDivElement>(null);
  const filmDrag = useRef<{ x: number; left: number; moved: boolean; active: boolean } | null>(null);

  const setAdj = (key: keyof typeof adjust) => (v: number) =>
    setAdjust((a) => ({ ...a, [key]: v }));

  const cameraOk = status === "ready";
  const stamp = shortStamp();
  const previewCss = preset.previewCss === "none" ? undefined : preset.previewCss;
  // Preview approximation of the export overlays (subtle by design).
  const vigOpacity = clamp01(preset.grade.vignette * 0.4 + (adjust.vignette / 100) * 0.5);
  const fadeOpacity = (adjust.fade / 100) * 0.16;
  const grainOpacity = 0.04 + (adjust.grain / 100) * 0.08;

  return (
    <div className="min-h-dvh flex flex-col bg-[#FAF6EF] max-w-xl mx-auto">
      {/* top bar */}
      <header className="flex items-center justify-between gap-2 px-3 pt-[calc(0.6rem+env(safe-area-inset-top))] pb-2 border-b border-[#E5DAC6]">
        <button onClick={() => nav(-1)} aria-label="Close photobooth" className="touch w-12 h-12 grid place-items-center text-[#4A423B]">
          <X size={24} />
        </button>
        <div className="text-center leading-none">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8B5E3C]">twofold · photo booth</p>
          <p className="font-display font-semibold text-[19px] tracking-tight inline-flex items-center gap-1.5">
            <Aperture size={17} className="text-[#7D2E3B]" /> say cheese ♡
          </p>
        </div>
        <div className="w-12" aria-hidden />
      </header>

      {stage === "camera" ? (
        <>
          {/* preview — larger so you actually see yourself */}
          <div className="flex-[1.7] min-h-[48dvh] sm:min-h-[52dvh] relative bg-[#141110] overflow-hidden">
            {/* stable camera element — always mounted so srcObject is never lost */}
            <div
              className={`absolute inset-0 flex flex-col justify-center ${
                cameraOk && frame === "film"
                  ? "film"
                  : cameraOk && frame === "polaroid"
                    ? "bg-[#FFFEFA] p-2.5 pb-9 sm:p-3 sm:pb-12"
                    : cameraOk && frame === "square"
                      ? "bg-[#FFFEFA] p-1.5"
                      : "bg-[#141110]"
              }`}
              aria-hidden={!cameraOk}
            >
              <div
                className={`relative w-full overflow-hidden bg-black ${
                  !cameraOk
                    ? "aspect-[4/3]"
                    : frame === "polaroid" || frame === "square"
                      ? "aspect-square"
                      : frame === "film"
                        ? "aspect-[3/2]"
                        : "aspect-[4/3]"
                }`}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  aria-label="Camera preview"
                  className="absolute inset-0 w-full h-full object-cover block"
                  style={{
                    filter: previewCss,
                    transform: mirror ? "scaleX(-1)" : undefined,
                    opacity: cameraOk ? 1 : 0,
                    visibility: cameraOk ? "visible" : "hidden",
                  }}
                />
                {/* approximation overlays: vignette + fade wash + fine grain — only when ready */}
                {cameraOk && (
                  <>
                    <div
                      aria-hidden
                      className="absolute inset-0 pointer-events-none"
                      style={{ background: "radial-gradient(ellipse at center, transparent 58%, rgba(30,20,14,0.55) 100%)", opacity: vigOpacity }}
                    />
                    {fadeOpacity > 0.005 && (
                      <div aria-hidden className="absolute inset-0 bg-[#FFFDF7] pointer-events-none" style={{ opacity: fadeOpacity }} />
                    )}
                    <div
                      aria-hidden
                      className="absolute inset-0 pointer-events-none"
                      style={{ backgroundImage: GRAIN_BG, backgroundSize: "140px", opacity: grainOpacity }}
                    />
                  </>
                )}
              </div>
              {cameraOk && frame === "polaroid" && (
                <div aria-hidden className="flex items-center justify-between px-1 pt-2">
                  <span className="font-display font-semibold text-[15px] text-[#2B2622]">twofold</span>
                  <span className="font-mono text-[11px] tracking-[0.14em] text-[#7D2E3B]">{stamp}</span>
                </div>
              )}
            </div>

            {/* countdown */}
            {countdown !== null && countdown > 0 && (
              <div aria-live="polite" aria-atomic className="absolute inset-0 grid place-items-center pointer-events-none">
                <span className="font-display font-semibold text-[110px] leading-none text-[#FFFDF7] drop-shadow-[0_2px_18px_rgba(0,0,0,0.6)]">
                  {countdown}
                </span>
              </div>
            )}

            {/* flash */}
            {flashOn && <div aria-hidden className="absolute inset-0 bg-[#FFFDF7] pointer-events-none" />}

            {/* strip thumbs */}
            {mode === "strip" && cameraOk && (
              <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1.5 px-3 pointer-events-none">
                {Array.from({ length: stripCount }).map((_, i) => (
                  <span key={i} className="block w-12 h-14 border overflow-hidden bg-black/50 border-[#FFFDF7]/60">
                    {shotThumbs[i] ? (
                      <img src={shotThumbs[i]} alt={`Strip shot ${i + 1}`} className="w-full h-full object-cover" />
                    ) : (
                      <span className="grid place-items-center w-full h-full font-hand text-[20px] text-[#FFFDF7]/80">{i + 1}</span>
                    )}
                  </span>
                ))}
              </div>
            )}

            {/* camera states */}
            {status === "insecure" && (
              <div className="absolute inset-0 bg-[#F3EBDD] p-6 flex flex-col items-center justify-center text-center gap-3">
                <Doodle kind="star" className="text-[#8B5E3C]" />
                <h2 className="font-display font-semibold text-[22px]">Camera unavailable</h2>
                <p className="text-[14.5px] text-[#4A423B] max-w-[34ch]">{detail}</p>
                <p className="text-[13px] text-[#8A7F72] max-w-[36ch]">Open Twofold over HTTPS — the Camera needs a secure connection. The rest of the app still works.</p>
              </div>
            )}
            {status === "starting" && (
              <div className="absolute inset-0 grid place-items-center bg-[#141110]">
                <p className="font-hand text-[24px] text-[#E9DDC8] animate-pulse">warming up the booth…</p>
              </div>
            )}
            {(status === "denied" || status === "missing" || status === "error") && (
              <div className="absolute inset-0 bg-[#F3EBDD] p-6 flex flex-col items-center justify-center text-center gap-3 overflow-y-auto">
                <Doodle kind="star" className="text-[#8B5E3C]" />
                <h2 className="font-display font-semibold text-[22px]">
                  {status === "denied" ? "Camera access needed" : "no camera backstage"}
                </h2>
                <p className="text-[14.5px] text-[#4A423B] max-w-[34ch]">{detail}</p>
                {status === "denied" && (
                  <p className="text-[13px] text-[#8A7F72] max-w-[36ch]">Twofold needs access to your camera to use the Photobooth. Enable it in the browser address bar or device Settings → Site permissions.</p>
                )}
                <div className="flex flex-col gap-2 w-full max-w-[300px] mt-1">
                  {status !== "missing" && (
                    <Button onClick={restart} variant="secondary">
                      Try again
                    </Button>
                  )}
                  <Link
                    to="/memories?new=photo"
                    className="touch inline-flex items-center justify-center gap-2 bg-[#2B2622] text-[#FAF6EF] px-5 rounded-[3px] text-[15px] font-bold"
                  >
                    <ImagePlus size={18} /> Add from gallery instead
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* control deck — scrollable so it never crushes the preview on short phones */}
          <div className="border-t border-[#E5DAC6] bg-[#FAF6EF] px-4 pt-2.5 pb-[calc(0.9rem+env(safe-area-inset-bottom))] max-h-[42dvh] sm:max-h-none overflow-y-auto no-scrollbar shrink-0">
            {pageError && <p className="text-[14px] font-semibold text-[#7D2E3B] text-center mb-1.5">{pageError}</p>}
            {busy && (
              <p className="text-center font-hand text-[21px] text-[#8A7F72] mb-1.5 inline-flex w-full justify-center items-center gap-2">
                <Loader2 size={18} className="animate-spin" /> {busyLabel}
              </p>
            )}

            {/* capture row */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <button
                onClick={() => setFlash((f) => !f)}
                aria-label={flash ? "Turn flash off" : "Turn flash on"}
                aria-pressed={flash}
                className="touch w-12 h-12 grid place-items-center text-[#4A423B]"
              >
                {flash ? <Zap size={23} /> : <ZapOff size={23} className="text-[#B6AA99]" />}
              </button>
              <button
                onClick={pressCapture}
                disabled={!cameraOk || camBusy}
                aria-label={mode === "strip" ? `Take strip photo ${shotThumbs.length + 1} of ${stripCount}` : "Take photo"}
                className="touch w-[76px] h-[76px] rounded-full bg-[#7D2E3B] border-4 border-[#2B2622] grid place-items-center active:scale-95 transition disabled:opacity-50 shadow-md"
              >
                <span className="block w-[52px] h-[52px] rounded-full bg-[#FFFDF7] border-2 border-[#2B2622]/30 grid place-items-center font-hand text-[19px] text-[#7D2E3B]">
                  {mode === "strip" ? `${shotThumbs.length + 1}/${stripCount}` : "♡"}
                </span>
              </button>
              <button
                onClick={flip}
                disabled={!cameraOk || camBusy}
                aria-label="Switch camera"
                className="touch w-12 h-12 grid place-items-center text-[#4A423B] disabled:opacity-40"
              >
                <SwitchCamera size={24} />
              </button>
            </div>
            <p className="text-center font-hand text-[18px] text-[#8A7F72] leading-none mb-1.5 -mt-0.5">
              {mode === "strip"
                ? shotThumbs.length === 0
                  ? "one tap per photo — strike a pose ♡"
                  : `${shotThumbs.length} of ${stripCount} in the can`
                : timer > 0
                  ? `timer ${timer}s — get ready…`
                  : "tap the big button ♡"}
            </p>
            {mode === "strip" && shotThumbs.length > 0 && !camBusy && (
              <div className="flex justify-center gap-4 mb-1 text-[13.5px] font-bold">
                <button onClick={retakeStripLast} className="underline text-[#7D2E3B]">
                  retake last
                </button>
                <button
                  onClick={() => {
                    shotBlobsRef.current = [];
                    setShotThumbs([]);
                  }}
                  className="underline text-[#8A7F72]"
                >
                  start strip over
                </button>
              </div>
            )}

            {/* options */}
            <div className="flex flex-col">
              <FilterTabs
                ariaLabel="Booth mode"
                value={mode}
                onChange={(v: string) => {
                  if (camBusy) return;
                  setMode(v as typeof mode);
                  shotBlobsRef.current = [];
                  setShotThumbs([]);
                }}
                options={[
                  { id: "single", label: "single" },
                  { id: "strip", label: "strip ✂" },
                ]}
              />
              {mode === "strip" ? (
                <FilterTabs
                  ariaLabel="Strip length"
                  value={String(stripCount)}
                  onChange={(v: string) => {
                    setStripCount(v === "3" ? 3 : 4);
                    shotBlobsRef.current = [];
                    setShotThumbs([]);
                  }}
                  options={[
                    { id: "3", label: "3 photos" },
                    { id: "4", label: "4 photos" },
                  ]}
                />
              ) : (
                <FilterTabs
                  ariaLabel="Frame"
                  value={frame}
                  onChange={(v: string) => setFrame(v as typeof frame)}
                  options={BOOTH_FRAMES.map((f) => ({ id: f.id, label: f.label }))}
                />
              )}

              {/* film carousel with live scene thumbnails */}
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8B5E3C] mt-1.5 mb-0.5 px-1">
                film — hold & slide
              </p>
              <div
                ref={filmStripRef}
                className="flex gap-2.5 overflow-x-auto no-scrollbar -mx-4 px-4 py-1 cursor-grab active:cursor-grabbing select-none touch-pan-x overscroll-x-contain"
                role="tablist"
                aria-label="Film look"
                onPointerDown={(e) => {
                  // touch uses native scroll — only intercept mouse/pen for drag
                  if (e.pointerType === "touch") return;
                  const el = filmStripRef.current;
                  if (!el) return;
                  filmDrag.current = { x: e.clientX, left: el.scrollLeft, moved: false, active: true };
                  el.setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (e.pointerType === "touch") return;
                  const el = filmStripRef.current;
                  const d = filmDrag.current;
                  if (!d?.active || !el) return;
                  const dx = e.clientX - d.x;
                  if (Math.abs(dx) > 8) d.moved = true;
                  el.scrollLeft = d.left - dx;
                }}
                onPointerUp={(e) => {
                  if (e.pointerType === "touch") return;
                  const el = filmStripRef.current;
                  const d = filmDrag.current;
                  el?.releasePointerCapture(e.pointerId);
                  if (d) {
                    d.active = false;
                    if (d.moved) window.setTimeout(() => (d.moved = false), 150);
                  }
                }}
                onPointerCancel={(e) => {
                  if (e.pointerType === "touch") return;
                  const el = filmStripRef.current;
                  const d = filmDrag.current;
                  el?.releasePointerCapture(e.pointerId);
                  if (d) d.active = false;
                }}
              >
                {BOOTH_PRESETS.map((p) => {
                  const active = p.id === presetId;
                  return (
                    <button
                      key={p.id}
                      role="tab"
                      aria-selected={active}
                      onClick={() => {
                        if (filmDrag.current?.moved) return;
                        setPresetId(p.id);
                      }}
                      className="touch shrink-0 w-[74px] flex flex-col items-center gap-1 py-1"
                    >
                      <span
                        className={`block w-16 h-16 overflow-hidden border-2 bg-[#EDE6D6] ${
                          active ? "border-[#7D2E3B]" : "border-[#E5DAC6]"
                        }`}
                      >
                        {thumbSrc ? (
                          <img
                            src={thumbSrc}
                            alt=""
                            aria-hidden
                            className="w-full h-full object-cover"
                            style={{ filter: p.previewCss === "none" ? undefined : p.previewCss }}
                          />
                        ) : (
                          <span className="grid place-items-center w-full h-full font-hand text-[22px] text-[#8A7F72]">?</span>
                        )}
                      </span>
                      <span
                        className={`font-hand text-[19px] leading-none ${
                          active ? "text-[#7D2E3B] sketch-underline" : "text-[#8A7F72]"
                        }`}
                      >
                        {p.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="px-1">
                <Slider label="Intensity" value={intensity} onChange={setIntensity} />
              </div>

              <details className="border-t border-[#EFE6D3] mt-1">
                <summary className="touch flex items-center justify-between py-1 font-hand text-[21px] text-[#8A7F72] list-none cursor-pointer [&::-webkit-details-marker]:hidden">
                  <span>tune the film ✎</span>
                  <span aria-hidden className="text-[15px]">···</span>
                </summary>
                <div className="px-1 pb-1">
                  <Slider label="Grain" value={adjust.grain} onChange={setAdj("grain")} />
                  <Slider label="Fade" value={adjust.fade} onChange={setAdj("fade")} />
                  <Slider label="Glow" value={adjust.glow} onChange={setAdj("glow")} />
                  <Slider label="Vignette" value={adjust.vignette} onChange={setAdj("vignette")} />
                </div>
              </details>

              {mode === "single" && (
                <FilterTabs
                  ariaLabel="Timer"
                  value={String(timer)}
                  onChange={(v: string) => setTimer(v === "3" ? 3 : v === "5" ? 5 : 0)}
                  options={[
                    { id: "0", label: "no timer" },
                    { id: "3", label: "3s" },
                    { id: "5", label: "5s" },
                  ]}
                />
              )}
            </div>
          </div>
        </>
      ) : (
        /* result */
        <div className="flex-1 flex flex-col px-4 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] max-w-md w-full mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#8B5E3C] text-center">
            {resultIsStrip ? "fresh off the rollers" : "hot off the flash"}
          </p>
          <h2 className="font-display text-[26px] font-semibold tracking-tight text-center">
            {resultIsStrip ? "your strip ♡" : "keeper?"}
          </h2>
          <div className="relative mt-4 self-center max-w-full">
            <Tape className="left-1/2 -translate-x-1/2 -top-[11px] rotate-[-4deg] z-10" />
            {resultUrl && (
              <img
                src={resultUrl}
                alt={resultIsStrip ? "Finished photobooth strip" : "Captured photobooth photo"}
                className={`block border border-[#E5DAC6] shadow-md ${
                  resultIsStrip ? "max-h-[52dvh] w-auto mx-auto" : "w-full max-h-[52dvh] object-contain bg-[#141110]"
                }`}
              />
            )}
          </div>
          {saveError && <p className="mt-3 text-[14px] font-semibold text-[#7D2E3B] text-center">{saveError}</p>}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              onClick={backToCamera}
              className="touch inline-flex items-center justify-center gap-1.5 bg-[#FFFDF7] border border-[#E5DAC6] rounded-[3px] font-bold text-[15px] text-[#4A423B]"
            >
              <RefreshCw size={17} /> Retake
            </button>
            <button
              onClick={openSave}
              disabled={busy}
              className="touch inline-flex items-center justify-center gap-1.5 bg-[#7D2E3B] text-[#FFFDF7] rounded-[3px] font-bold text-[15px] disabled:opacity-60"
            >
              {busy ? <Loader2 size={18} className="animate-spin" /> : null} Use Photo
            </button>
          </div>
          {busy && <p className="mt-2 text-center font-hand text-[20px] text-[#8A7F72]">{busyLabel}</p>}
        </div>
      )}

      {/* save choice / memory form */}
      <Sheet
        open={showSave}
        onClose={() => {
          setShowSave(false);
          setSaveView("choice");
          setSaveError("");
        }}
        title={saveView === "choice" ? "Keep this one?" : "Tuck it into a memory"}
      >
        {saveView === "choice" ? (
          <div className="flex flex-col gap-3">
            {finalDataUrl && (
              <img src={finalDataUrl} alt="Photo to keep" className="w-24 h-24 object-cover border border-[#E5DAC6] self-center rotate-[-2deg]" />
            )}
            <p className="font-hand text-[21px] text-[#8A7F72] text-center -mt-1">developed with love ♡</p>
            {saveError && <p className="text-[14px] font-semibold text-[#7D2E3B] text-center">{saveError}</p>}
            <button
              onClick={() => setSaveView("memory")}
              className="touch text-left bg-[#E7EBDD] border border-[#A8B89A]/60 p-4 rounded-[4px] rotate-[0.4deg] active:scale-[0.98]"
            >
              <div className="font-display font-semibold text-[16px]">Save to Memory</div>
              <div className="text-[13px] text-[#6B7F5E]">add a title + note, keep it with your story</div>
            </button>
            <button
              onClick={savePhotoOnly}
              disabled={saveBusy}
              className="touch text-left bg-[#FFFDF7] border border-[#E5DAC6] p-4 rounded-[4px] rotate-[-0.4deg] active:scale-[0.98] disabled:opacity-60"
            >
              <div className="font-display font-semibold text-[16px]">
                {saveBusy ? "Tucking it in…" : "Just save the photo"}
              </div>
              <div className="text-[13px] text-[#8A7F72]">a quick photobooth page, no words needed</div>
            </button>
          </div>
        ) : finalDataUrl ? (
          <MemoryForm
            initialPhotos={[finalDataUrl]}
            onDone={() => {
              setShowSave(false);
              setSaveView("choice");
              nav("/memories");
            }}
          />
        ) : null}
      </Sheet>
    </div>
  );
}

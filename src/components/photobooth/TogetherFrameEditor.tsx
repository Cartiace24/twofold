import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowLeftRight, Loader2, RotateCcw } from "lucide-react";
import { Button, Field, Input } from "../ui/primitives";
import { FilterTabs, Tape } from "../scrapbook/bits";
import {
  canvasToJpeg,
  composeTogetherFrameCanvas,
  decodeToCanvas,
  FRAME_TRANSFORM_DEFAULT,
  frameWindow,
  type FrameTransform,
  type TogetherFrameStyle,
  type TogetherLayout,
} from "./render";

/* ------------------------------------------------------------------ */
/* pan / zoom cell — CSS preview derived from frameWindow(), so what   */
/* you see is exactly what the export draws. Drag to pan, pinch or     */
/* wheel to zoom.                                                      */
/* ------------------------------------------------------------------ */

function PanZoomCell({
  src,
  sw,
  sh,
  aspect,
  value,
  onChange,
  label,
}: {
  src: string;
  sw: number;
  sh: number;
  aspect: number;
  value: FrameTransform;
  onChange: (v: FrameTransform) => void;
  label: string;
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [cw, setCw] = useState(0);
  const [imgBroken, setImgBroken] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchBase = useRef<{ d: number; s: number } | null>(null);
  const valRef = useRef(value);
  valRef.current = value;
  const changeRef = useRef(onChange);
  changeRef.current = onChange;

  useEffect(() => {
    const measure = () => {
      if (boxRef.current) setCw(boxRef.current.clientWidth);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Desktop wheel zoom needs a non-passive listener to own the gesture.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const v = valRef.current;
      const s = Math.min(3.5, Math.max(1, v.s * (e.deltaY < 0 ? 1.09 : 0.92)));
      changeRef.current({ ...v, s });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const ch = cw > 0 ? cw / aspect : 0;
  const win = cw > 0 ? frameWindow(sw, sh, cw, ch, value) : null;
  const k = win ? cw / win.w : 1;

  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);

  const panBy = (dxPx: number, dyPx: number, base: FrameTransform) => {
    const w = frameWindow(sw, sh, cw, ch, base);
    const kw = cw / w.w;
    const overflowX = Math.max(0, sw * kw - cw);
    const overflowY = Math.max(0, sh * kw - ch);
    const fx = overflowX > 0 ? Math.max(-1, Math.min(1, base.fx + dxPx / (overflowX / 2))) : 0;
    const fy = overflowY > 0 ? Math.max(-1, Math.min(1, base.fy + dyPx / (overflowY / 2))) : 0;
    changeRef.current({ ...base, fx, fy });
  };

  return (
    <div
      ref={boxRef}
      role="application"
      aria-label={`${label} — drag to reposition, pinch or scroll to zoom`}
      className="relative w-full overflow-hidden bg-[#EDE6D6] border border-[#E5DAC6] select-none [touch-action:none]"
      style={{ height: ch || 160 }}
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.current.size === 2) {
          const [a, b] = [...pointers.current.values()];
          pinchBase.current = { d: Math.max(1, dist(a, b)), s: valRef.current.s };
        }
      }}
      onPointerMove={(e) => {
        const prev = pointers.current.get(e.pointerId);
        if (!prev) return;
        const dx = e.clientX - prev.x;
        const dy = e.clientY - prev.y;
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.current.size === 2) {
          const [a, b] = [...pointers.current.values()];
          const base = pinchBase.current;
          if (!base) return;
          const s = Math.min(3.5, Math.max(1, (base.s * Math.max(1, dist(a, b))) / base.d));
          changeRef.current({ ...valRef.current, s });
          return;
        }
        // Single pointer (mouse, pen, or one finger): drag to pan.
        if (Math.abs(dx) + Math.abs(dy) > 0) panBy(dx, dy, valRef.current);
      }}
      onPointerUp={(e) => {
        pointers.current.delete(e.pointerId);
        if (pointers.current.size < 2) pinchBase.current = null;
      }}
      onPointerCancel={(e) => {
        pointers.current.delete(e.pointerId);
        if (pointers.current.size < 2) pinchBase.current = null;
      }}
    >
      {win && !imgBroken && (
        <img
          src={src}
          alt={label}
          draggable={false}
          onError={() => setImgBroken(true)}
          className="absolute max-w-none pointer-events-none"
          style={{
            width: sw * k,
            height: sh * k,
            left: -win.sx * k,
            top: -win.sy * k,
          }}
        />
      )}
      {(!win || imgBroken) && (
        <div className="absolute inset-0 grid place-items-center px-4 text-center">
          <p className="font-hand text-[19px] text-[#8A7F72]">
            {imgBroken ? "this photo didn't load — try retaking?" : "loading photo…"}
          </p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* layout selector with visual thumbnails                              */
/* ------------------------------------------------------------------ */

const LAYOUTS: Array<{ id: TogetherLayout; label: string }> = [
  { id: "side", label: "Side by side" },
  { id: "stack", label: "Up and down" },
  { id: "polaroid", label: "Polaroid" },
];

function LayoutThumb({ id, active }: { id: TogetherLayout; active: boolean }) {
  const box = `border-2 ${active ? "border-[#7D2E3B]" : "border-[#B6AA99]"} bg-[#FFFDF7]`;
  if (id === "side") {
    return (
      <span className="flex gap-[3px] w-[64px] h-[44px]" aria-hidden>
        <span className={`${box} flex-1 border`} />
        <span className={`${box} flex-1 border`} />
      </span>
    );
  }
  if (id === "stack") {
    return (
      <span className="flex flex-col gap-[3px] w-[64px] h-[44px]" aria-hidden>
        <span className={`${box} flex-1 border`} />
        <span className={`${box} flex-1 border`} />
      </span>
    );
  }
  return (
    <span className="relative w-[64px] h-[44px]" aria-hidden>
      <span className={`absolute left-1 top-0 w-[34px] h-[30px] border-2 bg-white ${active ? "border-[#7D2E3B]" : "border-[#B6AA99]"} rotate-[-5deg]`} />
      <span className={`absolute right-1 top-2 w-[34px] h-[30px] border-2 bg-white ${active ? "border-[#7D2E3B]" : "border-[#B6AA99]"} rotate-[4deg]`} />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* editor                                                              */
/* ------------------------------------------------------------------ */

export default function TogetherFrameEditor({
  photoAUrl,
  photoBUrl,
  nameA,
  nameB,
  onExport,
  onBack,
}: {
  photoAUrl: string;
  photoBUrl: string;
  nameA: string;
  nameB: string;
  onExport: (blob: Blob) => void;
  onBack: () => void;
}) {
  const [srcA, setSrcA] = useState<HTMLCanvasElement | null>(null);
  const [srcB, setSrcB] = useState<HTMLCanvasElement | null>(null);
  const [loadError, setLoadError] = useState("");
  const [layout, setLayout] = useState<TogetherLayout>("side");
  const [frame, setFrame] = useState<TogetherFrameStyle>("paper");
  const [swapped, setSwapped] = useState(false);
  const [trans, setTrans] = useState<{ a: FrameTransform; b: FrameTransform }>({
    a: { ...FRAME_TRANSFORM_DEFAULT },
    b: { ...FRAME_TRANSFORM_DEFAULT },
  });
  const [showNames, setShowNames] = useState(true);
  const [showDate, setShowDate] = useState(true);
  const [showMark, setShowMark] = useState(true);
  const [caption, setCaption] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  useEffect(() => {
    if (!photoAUrl || !photoBUrl) {
      setLoadError("Both photos are needed for a frame — go back and capture again?");
      return;
    }
    let dead = false;
    void (async () => {
      try {
        const [ba, bb] = await Promise.all([
          fetch(photoAUrl).then((r) => {
            if (!r.ok) throw new Error("load failed");
            return r.blob();
          }),
          fetch(photoBUrl).then((r) => {
            if (!r.ok) throw new Error("load failed");
            return r.blob();
          }),
        ]);
        const [ca, cb] = await Promise.all([decodeToCanvas(ba), decodeToCanvas(bb)]);
        if (!dead) {
          setSrcA(ca);
          setSrcB(cb);
        }
      } catch {
        if (!dead) setLoadError("Couldn't load the photos — go back and try again?");
      }
    })();
    return () => {
      dead = true;
    };
  }, [photoAUrl, photoBUrl]);

  if (loadError) {
    return (
      <div className="text-center py-8">
        <p className="font-hand text-[22px] text-[#8A7F72]">{loadError}</p>
        <Button variant="secondary" onClick={onBack} className="mt-4">
          Back
        </Button>
      </div>
    );
  }
  if (!srcA || !srcB) {
    return <p className="text-center font-hand text-[22px] text-[#8A7F72] py-8 animate-pulse">laying out the frame…</p>;
  }

  const order: Array<"a" | "b"> = swapped ? ["b", "a"] : ["a", "b"];
  const first = order[0] === "a" ? { url: photoAUrl, c: srcA, t: trans.a, name: nameA } : { url: photoBUrl, c: srcB, t: trans.b, name: nameB };
  const second = order[1] === "a" ? { url: photoAUrl, c: srcA, t: trans.a, name: nameA } : { url: photoBUrl, c: srcB, t: trans.b, name: nameB };
  const setFirstT = (v: FrameTransform) =>
    setTrans((p) => (order[0] === "a" ? { ...p, a: v } : { ...p, b: v }));
  const setSecondT = (v: FrameTransform) =>
    setTrans((p) => (order[1] === "a" ? { ...p, a: v } : { ...p, b: v }));

  const doExport = async () => {
    if (exporting) return;
    setExporting(true);
    setExportError("");
    try {
      const canvas = await composeTogetherFrameCanvas({
        layout,
        frame,
        photoA: first.c,
        photoB: second.c,
        transA: first.t,
        transB: second.t,
        nameA: showNames ? first.name : "",
        nameB: showNames ? second.name : "",
        showNames,
        showDate,
        showMark,
        caption,
        date: new Date(),
      });
      onExport(await canvasToJpeg(canvas));
    } catch {
      setExportError("Couldn't build the frame — try again?");
    } finally {
      setExporting(false);
    }
  };

  const toggleRow = (on: boolean, onTap: () => void, label: string, hint: string) => (
    <button
      onClick={onTap}
      role="switch"
      aria-checked={on}
      className="touch w-full flex items-center gap-3 text-left min-h-[48px]"
    >
      <span
        aria-hidden
        className={`w-7 h-7 grid place-items-center border-2 rounded-[3px] text-[15px] font-bold shrink-0 ${
          on ? "border-[#7D2E3B] bg-[#7D2E3B] text-[#FFFDF7]" : "border-[#B6AA99] text-transparent"
        }`}
      >
        ✓
      </span>
      <span>
        <span className="block text-[14.5px] font-bold text-[#2B2622]">{label}</span>
        <span className="block text-[12px] text-[#8A7F72]">{hint}</span>
      </span>
    </button>
  );

  const aspect = layout === "side" ? 3 / 4 : 4 / 3;

  return (
    <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-5 lg:items-start">
      {/* preview */}
      <div className="lg:sticky lg:top-4">
        <div className="relative bg-[#FFFDF7] border border-[#E5DAC6] p-3">
          <Tape className="left-1/2 -translate-x-1/2 -top-[11px]" />
          {layout === "polaroid" ? (
            <div className="relative py-3">
              <div className="rotate-[-3deg] border-[10px] border-b-[34px] border-white shadow-md max-w-[280px] mx-auto">
                <PanZoomCell src={first.url} sw={first.c.width} sh={first.c.height} aspect={aspect} value={first.t} onChange={setFirstT} label={`First photo (${first.name || "you"})`} />
                {showNames && !!first.name.trim() && (
                  <p className="font-hand text-[17px] text-[#4A423B] text-center leading-none mt-0.5">{first.name.trim()} ♡</p>
                )}
              </div>
              <div className="rotate-[2.5deg] border-[10px] border-b-[34px] border-white shadow-md max-w-[280px] mx-auto -mt-3 ml-auto mr-2">
                <PanZoomCell src={second.url} sw={second.c.width} sh={second.c.height} aspect={aspect} value={second.t} onChange={setSecondT} label={`Second photo (${second.name || "them"})`} />
                {showNames && !!second.name.trim() && (
                  <p className="font-hand text-[17px] text-[#4A423B] text-center leading-none mt-0.5">{second.name.trim()} ♡</p>
                )}
              </div>
            </div>
          ) : (
            <div className={layout === "side" ? "grid grid-cols-2 gap-2" : "flex flex-col gap-2"}>
              <div>
                <PanZoomCell src={first.url} sw={first.c.width} sh={first.c.height} aspect={aspect} value={first.t} onChange={setFirstT} label={`First photo (${first.name || "you"})`} />
                {showNames && !!first.name.trim() && (
                  <p className="font-hand text-[17px] text-[#8A7F72] mt-1">{first.name.trim()} ♡</p>
                )}
              </div>
              <div>
                <PanZoomCell src={second.url} sw={second.c.width} sh={second.c.height} aspect={aspect} value={second.t} onChange={setSecondT} label={`Second photo (${second.name || "them"})`} />
                {showNames && !!second.name.trim() && (
                  <p className="font-hand text-[17px] text-[#8A7F72] mt-1">{second.name.trim()} ♡</p>
                )}
              </div>
            </div>
          )}
          <p className="mt-2 text-[11.5px] text-[#8A7F72] text-center">drag to reposition · pinch or scroll to zoom</p>
        </div>
      </div>

      {/* controls */}
      <div className="mt-4 lg:mt-0 flex flex-col gap-4 min-w-0">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8B5E3C] mb-1.5 px-1">Layout</p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 py-1" role="group" aria-label="Frame layout">
            {LAYOUTS.map((l) => (
              <button
                key={l.id}
                onClick={() => setLayout(l.id)}
                aria-pressed={layout === l.id}
                aria-label={l.label}
                className={`touch shrink-0 flex flex-col items-center gap-1 px-3 py-2 border-2 rounded-[3px] bg-[#FFFDF7] ${
                  layout === l.id ? "border-[#7D2E3B]" : "border-[#E5DAC6]"
                }`}
              >
                <LayoutThumb id={l.id} active={layout === l.id} />
                <span className={`font-hand text-[18px] leading-none ${layout === l.id ? "text-[#7D2E3B]" : "text-[#8A7F72]"}`}>
                  {l.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setSwapped((s) => !s)}
            aria-label={layout === "side" ? "Swap left and right photos" : "Swap top and bottom photos"}
            className="touch inline-flex items-center justify-center gap-1.5 bg-[#FFFDF7] border border-[#E5DAC6] rounded-[3px] font-bold text-[14px] text-[#4A423B]"
          >
            <ArrowLeftRight size={17} /> Swap
          </button>
          <button
            onClick={() => setTrans({ a: { ...FRAME_TRANSFORM_DEFAULT }, b: { ...FRAME_TRANSFORM_DEFAULT } })}
            aria-label="Reset zoom and position for both photos"
            className="touch inline-flex items-center justify-center gap-1.5 bg-[#FFFDF7] border border-[#E5DAC6] rounded-[3px] font-bold text-[14px] text-[#4A423B]"
          >
            <RotateCcw size={17} /> Reset
          </button>
        </div>

        {layout !== "polaroid" && (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8B5E3C] mb-1 px-1">Frame</p>
            <FilterTabs<TogetherFrameStyle>
              ariaLabel="Frame style"
              value={frame}
              onChange={(v) => setFrame(v)}
              options={[
                { id: "paper", label: "clean paper" },
                { id: "film", label: "film" },
                { id: "polaroid", label: "polaroid" },
              ]}
            />
          </div>
        )}

        <div className="bg-[#FFFDF7] border border-[#E5DAC6] px-3 py-1.5">
          {toggleRow(showNames, () => setShowNames((v) => !v), "Names", "you + them under each photo")}
          {toggleRow(showDate, () => setShowDate((v) => !v), "Date", "little stamped date")}
          {toggleRow(showMark, () => setShowMark((v) => !v), "Twofold mark", "tiny twofold ♡ on the frame")}
        </div>

        <Field label="Caption" hint="optional — a line under the photos">
          <Input value={caption} onChange={(e) => setCaption(e.target.value.slice(0, 80))} placeholder="our little moment ♡" maxLength={80} />
        </Field>

        {exportError && <p className="text-[13.5px] font-semibold text-[#7D2E3B]" role="alert">{exportError}</p>}
        <Button onClick={doExport} disabled={exporting}>
          {exporting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 size={18} className="animate-spin" /> Building your frame…
            </span>
          ) : (
            "Make the frame ♡"
          )}
        </Button>
        <button onClick={onBack} className="touch inline-flex items-center justify-center gap-1.5 text-[14px] font-bold text-[#8A7F72] underline">
          <ArrowLeft size={16} /> back to strip
        </button>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/primitives";
import { Tape } from "../scrapbook/bits";

interface CropSheetProps {
  open: boolean;
  src: string;
  onCancel: () => void;
  onSave: (blob: Blob) => void;
}

export function CropSheet({ open, src, onCancel, onSave }: CropSheetProps) {
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (open) {
      setZoom(1);
      setPos({ x: 0, y: 0 });
      setBusy(false);
    }
  }, [open, src]);

  const onPointerDown = (e: React.PointerEvent) => {
    setDrag(true);
    setStart({ x: e.clientX - pos.x, y: e.clientY - pos.y });
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    setPos({ x: e.clientX - start.x, y: e.clientY - start.y });
  };
  const onPointerUp = () => setDrag(false);

  const handleSave = async () => {
    if (!imgRef.current || !containerRef.current) return;
    setBusy(true);
    try {
      const out = 512;
      const canvas = document.createElement("canvas");
      canvas.width = out;
      canvas.height = out;
      const ctx = canvas.getContext("2d")!;
      // white paper background
      ctx.fillStyle = "#FFFEFA";
      ctx.fillRect(0, 0, out, out);

      const img = imgRef.current;
      const vw = 280;
      const rect = img.getBoundingClientRect();
      const crect = containerRef.current.getBoundingClientRect();
      // image rect in container coords
      const ix = rect.left - crect.left;
      const iy = rect.top - crect.top;
      const iw = rect.width;
      const ih = rect.height;
      // map to output
      const sx = -ix * (out / vw);
      const sy = -iy * (out / vw);
      const sw = (iw * out) / vw;
      const sh = (ih * out) / vw;
      // draw white first, then image
      // Use the source image element as source
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, out, out);

      const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("crop failed"))), "image/jpeg", 0.85));
      if (blob.size > 480 * 1024) {
        // if still large, let caller handle further compress (we already at 512)
      }
      onSave(blob);
    } catch {
      setBusy(false);
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Crop profile photo">
      <button aria-label="Close" onClick={onCancel} className="absolute inset-0 bg-[#2B2622]/60 backdrop-blur-[1px]" />
      <div className="relative w-full sm:max-w-[380px] bg-[#FAF6EF] border-t sm:border border-[#E5DAC6] rounded-t-[14px] sm:rounded-[6px] max-h-[92dvh] overflow-hidden flex flex-col shadow-2xl">
        <div className="px-5 pt-3 pb-3 border-b border-[#E5DAC6] bg-[#FAF6EF]/95 backdrop-blur z-10">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-[#E5DAC6] sm:hidden" aria-hidden />
          <h3 className="font-display text-[20px] font-semibold">Crop — make it you</h3>
          <p className="font-hand text-[18px] text-[#8A7F72] leading-tight">drag to reposition, pinch the slider to zoom</p>
        </div>

        <div className="p-5 flex flex-col items-center gap-4">
          <div
            ref={containerRef}
            className="relative w-[280px] h-[280px] overflow-hidden bg-[#EDE6D6] border border-[#E5DAC6] touch-none select-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            <img
              ref={imgRef}
              src={src}
              alt="Crop preview"
              draggable={false}
              className="absolute left-1/2 top-1/2 max-w-none select-none"
              style={{
                width: "auto",
                height: "auto",
                maxWidth: "none",
                maxHeight: "none",
                transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) scale(${zoom})`,
                transformOrigin: "center",
              }}
            />
            {/* square guide */}
            <div aria-hidden className="absolute inset-0 border-2 border-white/80 shadow-[0_0_0_999px_rgba(43,38,34,0.35)] pointer-events-none" />
            <Tape className="left-1/2 -translate-x-1/2 -top-[8px] w-[54px] rotate-[-3deg]" />
          </div>

          <label className="w-full flex items-center gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8A7F72]">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.02}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 h-10 accent-[#7D2E3B]"
              aria-label="Zoom"
            />
          </label>

          <div className="flex gap-2 w-full">
            <Button variant="secondary" onClick={onCancel} disabled={busy} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={busy} className="flex-1">
              {busy ? "Saving…" : "Save photo"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

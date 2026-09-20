import * as React from "react";
import { cn } from "../../lib/utils";
import { hashSeedPick } from "../../lib/variation";

export type TapeTone = "sage" | "tape-yellow" | "wine" | "";

// Washi tape strip
export function Tape({ className, tone = "" }: { className?: string; tone?: TapeTone }) {
  return <div aria-hidden className={cn("washi", tone, className)} />;
}

/** Seeded handmade variation — same seed always looks the same, different
 *  seeds look varied, so decoration never repeats on a visible cycle. */
const TAPE_TONES: TapeTone[] = ["", "sage", "tape-yellow", "wine"];
const TAPE_SPOTS = [
  "left-1/2 -translate-x-1/2 -top-[11px] rotate-[-4deg] w-[86px]",
  "left-7 -top-[10px] rotate-[-9deg] w-[68px]",
  "right-7 -top-[10px] rotate-[7deg] w-[68px]",
  "left-1/2 -translate-x-1/2 -top-[11px] rotate-[5deg] w-[62px]",
] as const;
const TILTS = [-1.5, -0.9, -0.5, 0.4, 0.8, 1.4];

export const seededTilt = (seed: string): number => hashSeedPick(seed, TILTS);
export const seededTapeTone = (seed: string): TapeTone => hashSeedPick(seed + ":tone", TAPE_TONES);
export const seededTapeSpot = (seed: string): string => hashSeedPick(seed + ":spot", TAPE_SPOTS);

// Small doodles: heart, flower, star, arrow, sparkle — hand-drawn SVG
export function Doodle({ kind, className }: { kind: "heart" | "flower" | "star" | "arrow" | "sparkle" | "squiggle"; className?: string }) {
  const common = "pointer-events-none select-none";
  if (kind === "heart")
    return (
      <svg viewBox="0 0 24 22" className={cn(common, className)} width="22" fill="none" aria-hidden>
        <path d="M12 19C6 14.5 2.5 11 2.5 7.2 2.5 4.3 4.8 2.5 7.3 2.5c1.9 0 3.6 1 4.7 2.7C13.1 3.5 14.8 2.5 16.7 2.5c2.5 0 4.8 1.8 4.8 4.7 0 3.8-3.5 7.3-9.5 11.8Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (kind === "flower")
    return (
      <svg viewBox="0 0 28 28" className={cn(common, className)} width="22" fill="none" aria-hidden>
        <circle cx="14" cy="14" r="3" fill="currentColor" opacity=".9" />
        {[0, 72, 144, 216, 288].map((r) => (
          <ellipse key={r} cx="14" cy="7" rx="3.4" ry="5" stroke="currentColor" strokeWidth="1.4" transform={`rotate(${r} 14 14)`} />
        ))}
      </svg>
    );
  if (kind === "star")
    return (
      <svg viewBox="0 0 24 24" className={cn(common, className)} width="18" fill="none" aria-hidden>
        <path d="M12 2.5 13.8 9l6.7 1-5 4.4 1.6 6.6L12 17.3 6.9 21l1.6-6.6-5-4.4 6.7-1L12 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    );
  if (kind === "arrow")
    return (
      <svg viewBox="0 0 80 24" className={cn(common, className)} width="64" fill="none" aria-hidden>
        <path d="M3 14C22 8 46 8 66 12M60 6l8 6-8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (kind === "sparkle")
    return (
      <svg viewBox="0 0 24 24" className={cn(common, className)} width="16" fill="none" aria-hidden>
        <path d="M12 2v20M2 12h20M5 5l14 14M19 5 5 19" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity=".9" />
      </svg>
    );
  return (
    <svg viewBox="0 0 100 12" className={cn(common, className)} width="90" fill="none" aria-hidden>
      <path d="M2 8c12-7 20 5 32-2s20 5 32-2 20 4 32-1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Polaroid({
  src,
  caption,
  date,
  rotate,
  seed,
  tape = true,
  tapeTone,
  className,
  imgClassName,
}: {
  src: string;
  caption?: string;
  date?: string;
  rotate?: number;
  /** When given, tilt + tape tone/spot are derived from the seed instead of
   *  repeating the same decoration on every photo. */
  seed?: string;
  tape?: boolean;
  tapeTone?: TapeTone;
  className?: string;
  imgClassName?: string;
}) {
  const tilt = seed !== undefined ? seededTilt(seed) : (rotate ?? 0);
  const tone = tapeTone ?? (seed !== undefined ? seededTapeTone(seed) : "");
  const spot =
    seed !== undefined ? seededTapeSpot(seed) : "left-1/2 -translate-x-1/2 -top-[11px] rotate-[-4deg]";
  return (
    <figure
      className={cn("polaroid relative", className)}
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      {tape && <Tape className={spot} tone={tone} />}
      <div className="overflow-hidden bg-[#EDE6D6]">
        <img src={src} alt={caption || "memory photo"} loading="lazy" className={cn("aspect-[4/4.4]", imgClassName)} />
      </div>
      {(caption || date) && (
        <figcaption className="pt-2 pb-2.5 px-1 flex items-end justify-between gap-2">
          <span className="font-hand text-[19px] leading-[1.05] text-[#4A423B] line-clamp-2">{caption}</span>
          {date && <span className="stamp shrink-0 text-[#7D2E3B]">{date}</span>}
        </figcaption>
      )}
    </figure>
  );
}

export function SectionHeading({
  kicker,
  title,
  note,
  action,
}: {
  kicker?: string;
  title: string;
  note?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3 mb-3">
      <div>
        {kicker && (
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8B5E3C] mb-1">{kicker}</div>
        )}
        <h2 className="font-display text-[24px] leading-[1.05] font-semibold tracking-tight">{title}</h2>
        {note && <p className="font-hand text-[19px] text-[#8A7F72] leading-tight mt-0.5">{note}</p>}
      </div>
      {action}
    </div>
  );
}

/** Handwritten filter tabs — an underline sketch instead of pills.
 *  Holds + drags anywhere on the row to scroll; tapping still selects. */
export function FilterTabs<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: ReadonlyArray<{ id: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef({ active: false, x: 0, left: 0, moved: false });

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    const el = ref.current;
    if (!el) return;
    drag.current = { active: true, x: e.clientX, left: el.scrollLeft, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    const d = drag.current;
    const el = ref.current;
    if (!d.active || !el) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 8) d.moved = true;
    el.scrollLeft = d.left - dx;
  };
  const stopDrag = () => {
    if (drag.current.moved) {
      window.setTimeout(() => {
        drag.current.moved = false;
      }, 150);
    }
    drag.current.active = false;
  };

  return (
    <div
      ref={ref}
      role="tablist"
      aria-label={ariaLabel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      onPointerLeave={stopDrag}
      className="flex gap-1 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1 cursor-grab active:cursor-grabbing select-none touch-pan-x overscroll-x-contain"
    >
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            role="tab"
            aria-selected={active}
            onClick={() => {
              if (drag.current.moved) return;
              onChange(o.id);
            }}
            className={`touch shrink-0 px-3 font-hand text-[22px] leading-none transition active:scale-[0.97] ${
              active ? "text-[#7D2E3B] sketch-underline" : "text-[#8A7F72]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("flex items-center gap-2 my-6 opacity-70", className)}>
      <div className="h-px flex-1 bg-[#E5DAC6]" />
      <span className="text-[#B6AA99] text-[13px]">♡</span>
      <div className="h-px flex-1 bg-[#E5DAC6]" />
    </div>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden className="grid place-items-center w-8 h-8 border border-[#2B2622] rounded-[3px] bg-[#FFFDF7] relative overflow-hidden">
        <span className="absolute inset-y-0 left-1/2 w-px bg-[#2B2622]/70" />
        <span className="font-display font-bold text-[15px] tracking-tight">2f</span>
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="font-display font-semibold text-[20px] tracking-tight block">twofold</span>
          {!compact && <span className="block text-[11px] tracking-[0.08em] text-[#8A7F72] mt-0.5">Two Lives, one story.</span>}
        </span>
      )}
      {compact && <span className="font-display font-semibold text-[19px] tracking-tight">twofold</span>}
    </div>
  );
}

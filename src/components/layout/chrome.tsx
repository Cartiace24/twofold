import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Aperture, BookHeart, Home, Images, NotebookPen, Plus, type LucideIcon } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { cn } from "../../lib/utils";
import { Logo } from "../scrapbook/bits";
import { Sheet } from "../ui/primitives";
import { Camera, MapPin, PenLine, Sparkles } from "lucide-react";
import { useApp } from "../../store/AppContext";

export function DesktopSidebar() {
  return (
    <aside className="hidden lg:flex w-[248px] shrink-0 flex-col border-r border-[var(--twofold-border)] bg-[var(--twofold-surface)]/60 sticky top-0 h-dvh overflow-y-auto no-scrollbar px-5 py-6 pb-8">
      <Logo />
      <nav className="mt-8 flex flex-col gap-1 text-[15px] font-medium">
        <SideLink to="/home" icon={Home} label="Home" />
        <SideLink to="/memories" icon={BookHeart} label="Memories" />
        <SideLink to="/gallery" icon={Images} label="Photos" />
        <SideLink to="/notes" icon={NotebookPen} label="Notes" />
        <SideLink to="/timeline" icon={Sparkles} label="Our story" />
        <SideLink to="/photobooth" icon={Aperture} label="Photobooth" />
        <SideLink to="/places" icon={MapPin} label="Our places" />
        <SideLink to="/wishlist" icon={Sparkles} label="Wishlist" />
        <SideLink to="/profile" icon={Camera} label="Couple profile" />
      </nav>
      <div className="mt-auto pt-8">
        <div className="paper-card p-4 rotate-[-1deg] mx-0.5 mb-1">
          <p className="font-hand text-[20px] leading-tight text-[#4A423B]">“We made our own little place on the internet.”</p>
          <p className="mt-2 text-[12px] uppercase tracking-[0.14em] text-[#8A7F72]">— twofold</p>
        </div>
      </div>
    </aside>
  );
}

function SideLink({ to, icon: Icon, label }: { to: string; icon: LucideIcon; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-[3px] transition",
          isActive ? "bg-[var(--twofold-accent)] text-[var(--twofold-accent-text)]" : "text-[var(--twofold-text)] hover:bg-[var(--twofold-bg)]"
        )
      }
    >
      <Icon size={19} strokeWidth={1.9} />
      {label}
    </NavLink>
  );
}

export function TopBar({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="lg:hidden sticky top-0 z-40 bg-[#FAF6EF]/92 backdrop-blur border-b border-[#E5DAC6] px-4 pt-[calc(0.7rem+env(safe-area-inset-top))] pb-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8B5E3C]">twofold</div>
          <h1 className="font-display text-[22px] font-semibold leading-none tracking-tight">{title}</h1>
          {subtitle && <p className="font-hand text-[18px] text-[#8A7F72] leading-tight">{subtitle}</p>}
        </div>
        {right}
      </div>
    </div>
  );
}

export function MobileNav({ onAdd }: { onAdd: () => void }) {
  const loc = useLocation();
  const isActive = (p: string) => loc.pathname.startsWith(p);
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t border-[#E5DAC6] bg-[#FFFDF7]/97 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5 items-end px-2 pt-1.5 pb-1.5">
        <Tab to="/home" label="Home" icon={Home} active={loc.pathname === "/home" || loc.pathname === "/"} />
        <Tab to="/memories" label="Memories" icon={BookHeart} active={isActive("/memories")} />
        <button onClick={onAdd} aria-label="Add" className="flex flex-col items-center gap-0.5 -mt-6">
          <span className="grid place-items-center w-[58px] h-[58px] rounded-full bg-[var(--twofold-accent)] text-[var(--twofold-accent-text)] border-4 border-[var(--twofold-bg)] shadow-lg active:scale-95 transition">
            <Plus size={26} strokeWidth={2.4} />
          </span>
          <span className="text-[11px] font-bold tracking-wide text-[var(--twofold-accent)]">Add</span>
        </button>
        <Tab to="/notes" label="Notes" icon={NotebookPen} active={isActive("/notes")} />
        <Tab to="/more" label="More" icon={Images} active={isActive("/more") || isActive("/gallery") || isActive("/timeline") || isActive("/places") || isActive("/wishlist") || isActive("/profile")} />
      </div>
    </nav>
  );
}

function Tab({ to, label, icon: Icon, active }: { to: string; label: string; icon: LucideIcon; active: boolean }) {
  return (
    <NavLink to={to} className={cn("flex flex-col items-center gap-0.5 py-1 px-1 min-h-[52px] justify-center", active ? "text-[#7D2E3B]" : "text-[#8A7F72]")}>
      <Icon size={23} strokeWidth={active ? 2.2 : 1.8} />
      <span className="text-[11px] font-bold tracking-wide">{label}</span>
      {active && <span className="w-1 h-1 rounded-full bg-[#7D2E3B]" />}
    </NavLink>
  );
}

export function QuickAddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate();
  const [prefill, setPrefill] = useState<string | null>(null);
  void prefill;
  const { couple } = useApp();
  void couple;
  const go = (path: string, kind?: string) => {
    onClose();
    if (kind) setPrefill(kind);
    nav(path + (kind ? `?new=${kind}` : "?new=1"));
  };

  const carouselRef = React.useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const drag = React.useRef({ active: false, x: 0, left: 0, moved: false });

  const onScroll = () => {
    const el = carouselRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    setActive(idx);
  };

  const scrollTo = (idx: number) => {
    carouselRef.current?.scrollTo({ left: idx * (carouselRef.current?.clientWidth ?? 0), behavior: "smooth" });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const el = carouselRef.current;
    if (!el) return;
    drag.current = { active: true, x: e.clientX, left: el.scrollLeft, moved: false };
    el.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const el = carouselRef.current;
    const d = drag.current;
    if (!d.active || !el) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 4) d.moved = true;
    el.scrollLeft = d.left - dx;
  };
  const stopDrag = (e: React.PointerEvent) => {
    const el = carouselRef.current;
    el?.releasePointerCapture(e.pointerId);
    if (drag.current.moved) window.setTimeout(() => (drag.current.moved = false), 0);
    drag.current.active = false;
  };

  return (
    <Sheet open={open} onClose={onClose} title="Add a little something">
      <p className="font-hand text-[21px] text-[#8A7F72] -mt-1 mb-3">takes seconds, keeps forever ♡</p>

      {/* swipeable — Photobooth first, then the rest */}
      <div
        ref={carouselRef}
        onScroll={onScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar -mx-5 px-5 pb-2 cursor-grab active:cursor-grabbing select-none touch-pan-x"
        style={{ scrollBehavior: "smooth" }}
      >
        {/* slide 1 — Photobooth */}
        <div className="snap-center shrink-0 w-full">
          <button
            onClick={() => {
              if (drag.current.moved) return;
              onClose();
              nav("/photobooth");
            }}
            className="touch w-full text-left bg-[#221E1B] text-[#FAF6EF] p-4 rounded-[4px] rotate-[-0.4deg] active:scale-[0.98]"
          >
            <div className="flex items-center gap-1.5 mb-2 opacity-80" aria-hidden>
              {Array.from({ length: 12 }).map((_, i) => (
                <span key={i} className="block w-2 h-2 rounded-full bg-[#FAF6EF]/70" />
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Aperture size={26} className="text-[#E8B4B8] shrink-0" />
              <span>
                <span className="font-display font-semibold text-[17px] block">Photobooth</span>
                <span className="text-[13px] text-[#E9DDC8] block">filters, frames & photo strips — right now</span>
              </span>
            </div>
          </button>
          <p className="text-center text-[12px] font-bold uppercase tracking-[0.14em] text-[#B6AA99] mt-2">swipe → for more</p>
        </div>

        {/* slide 2 — the other four */}
        <div className="snap-center shrink-0 w-full">
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => go("/memories", "photo")} className="touch text-left bg-[#FFFDF7] border border-[#E5DAC6] p-4 rounded-[4px] active:scale-[0.98]">
              <Camera className="mb-2 text-[#7D2E3B]" size={24} />
              <div className="font-display font-semibold text-[16px]">Add Photo</div>
              <div className="text-[13px] text-[#8A7F72]">fast upload, tiny caption</div>
            </button>
            <button onClick={() => go("/notes", "note")} className="touch text-left bg-[#F9E8E6] border border-[#E8B4B8]/60 p-4 rounded-[4px] rotate-[0.6deg] active:scale-[0.98]">
              <PenLine className="mb-2 text-[#7D2E3B]" size={24} />
              <div className="font-display font-semibold text-[16px]">Write Note</div>
              <div className="text-[13px] text-[#8A7F72]">love note, thought, plan</div>
            </button>
            <button onClick={() => go("/memories", "memory")} className="touch text-left bg-[#E7EBDD] border border-[#A8B89A]/60 p-4 rounded-[4px] rotate-[-0.6deg] active:scale-[0.98]">
              <BookHeart className="mb-2 text-[#6B7F5E]" size={24} />
              <div className="font-display font-semibold text-[16px]">Add Memory</div>
              <div className="text-[13px] text-[#6B7F5E]">photos + story + place</div>
            </button>
            <button onClick={() => go("/places", "place")} className="touch text-left bg-[#FFFDF7] border border-[#E5DAC6] p-4 rounded-[4px] active:scale-[0.98]">
              <MapPin className="mb-2 text-[#8B5E3C]" size={24} />
              <div className="font-display font-semibold text-[16px]">Save Place</div>
              <div className="text-[13px] text-[#8A7F72]">pin it to your map</div>
            </button>
          </div>
        </div>
      </div>

      {/* dots */}
      <div className="flex items-center justify-center gap-1.5 mt-3" aria-hidden>
        {[0, 1].map((i) => (
          <button
            key={i}
            aria-label={`Go to page ${i + 1}`}
            onClick={() => scrollTo(i)}
            className={`h-1.5 rounded-full transition-all ${active === i ? "w-6 bg-[#7D2E3B]" : "w-1.5 bg-[#E5DAC6]"}`}
          />
        ))}
      </div>
    </Sheet>
  );
}

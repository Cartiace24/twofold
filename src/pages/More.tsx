import { Link } from "react-router-dom";
import {
  Aperture,
  BookHeart,
  ChevronRight,
  MapPin,
  NotebookPen,
  Settings,
  Sparkles,
} from "lucide-react";
import { useApp } from "../store/AppContext";
import { Doodle, Tape } from "../components/scrapbook/bits";
import { InviteCodeCard } from "../components/InviteCode";
import { Avatar } from "../components/profile/Avatar";

export default function More() {
  const { couple, signOut, memories, notes, places, wishlist, timeline, regenerateCode, profile, avatarUrl, user } = useApp();

  const previewUrls = memories.flatMap((m) => m.photos.map((p) => p.url)).slice(0, 6);
  const p0 = previewUrls[0] ?? "https://picsum.photos/seed/twofold-more-p1/400/400";
  const p1 = previewUrls[1] ?? "https://picsum.photos/seed/twofold-more-p2/400/400";
  const pFlow = previewUrls[2] ?? "https://picsum.photos/seed/twofold-more-pf/300/300";

  return (
    <div className="px-4 pb-10 max-w-[560px] mx-auto lg:max-w-2xl">
      {/* invite at the very top of the drawer — you open More to find it */}
      {couple && (
        <div className="mt-4">
          <InviteCodeCard code={couple.invite_code} onRegenerate={regenerateCode} />
        </div>
      )}
      {/* header — tight, with the little sticky note from the mockup */}
      <div className="relative pt-5 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#8B5E3C]">everything else</p>
        <h1 className="font-display text-[32px] font-semibold tracking-tight leading-none mt-1">More</h1>
        {couple && <p className="font-hand text-[19px] text-[#8A7F72] leading-none mt-1">{couple.name} ♡</p>}

        {/* "same place, different days" — mockup's top-right scrap */}
        <div
          aria-hidden
          className="hidden sm:block absolute -right-1 top-1 rotate-[3deg] bg-[#FFFEFA] border border-[#E5DAC6] px-2.5 py-2 shadow-sm w-[96px] text-left"
        >
          <Tape className="left-1/2 -translate-x-1/2 -top-[8px] w-[44px] rotate-[-2deg]" tone="tape-yellow" />
          <p className="font-hand text-[13px] leading-[1.1] text-[#4A423B]">
            same
            <br />
            place,
            <br />
            different
            <br />
            days
          </p>
          <Doodle kind="flower" className="absolute -right-1 -bottom-1 text-[#8B5E3C] scale-[0.45]" />
          <span className="absolute right-1.5 bottom-1 text-[10px] leading-none">♡</span>
        </div>
      </div>

      {/* your account — face where your name is */}
      <Link to="/profile" className="mt-4 flex items-center gap-3 bg-[#FFFDF7] border border-[#E5DAC6] p-3 active:scale-[0.98] transition touch">
        <Avatar src={avatarUrl} name={profile?.display_name || user?.displayName} size={44} />
        <span className="min-w-0">
          <span className="font-display font-semibold text-[15px] leading-none block truncate">{profile?.display_name || user?.displayName || "You"}</span>
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8A7F72] block">Your profile →</span>
        </span>
        <ChevronRight size={16} className="text-[#B6AA99] ml-auto" />
      </Link>

      {/* drawer */}
      <div className="mt-5 flex flex-col gap-3">
        {/* 1 — Photos · torn beige paper + polaroid stack (mockup) */}
        <Link
          to="/gallery"
          className="group relative block bg-[#F5EEE0] border border-[#E5DAC6] p-3 active:scale-[0.98] transition touch overflow-hidden rotate-[-0.35deg]"
          style={{
            boxShadow: "0 1px 3px rgba(43,38,34,0.08)",
            backgroundImage:
              "radial-gradient(rgba(139,94,60,0.07) 1px, transparent 1.1px), radial-gradient(rgba(139,94,60,0.04) 1px, transparent 1.1px)",
            backgroundSize: "20px 20px, 14px 14px",
            backgroundPosition: "0 0, 8px 7px",
          }}
        >
          {/* torn top + bottom */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[8px] bg-[#F5EEE0]"
            style={{
              clipPath:
                "polygon(0 100%, 0 45%, 3% 68%, 7% 32%, 11% 62%, 15% 28%, 20% 58%, 26% 34%, 32% 60%, 38% 28%, 44% 56%, 50% 30%, 56% 58%, 62% 32%, 68% 60%, 74% 36%, 80% 62%, 86% 30%, 92% 58%, 96% 38%, 100% 52%, 100% 100%)",
            }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[8px] bg-[#F5EEE0]"
            style={{
              clipPath:
                "polygon(0 0, 100% 0, 100% 55%, 97% 40%, 92% 62%, 86% 30%, 80% 58%, 74% 32%, 68% 60%, 62% 28%, 56% 62%, 50% 30%, 44% 56%, 38% 28%, 32% 60%, 26% 34%, 20% 58%, 15% 32%, 11% 62%, 7% 36%, 3% 68%, 0 45%)",
            }}
          />
          <Tape className="left-7 -top-[7px] rotate-[-9deg] w-[56px] opacity-90" tone="wine" />

          <div className="relative flex items-center gap-3 pt-2 pb-1">
            {/* polaroid stack — left */}
            <div className="relative w-[108px] h-[84px] shrink-0 hidden sm:block" aria-hidden>
              <span className="polaroid absolute left-0 top-0 w-[72px] rotate-[-6deg] p-1.5 pb-1 shadow-md">
                <img src={p0} alt="" className="w-full aspect-square object-cover" loading="lazy" />
              </span>
              <span className="polaroid absolute left-[28px] top-[8px] w-[72px] rotate-[4deg] p-1.5 pb-1 shadow-md">
                <img src={p1} alt="" className="w-full aspect-square object-cover" loading="lazy" />
              </span>
              <span className="absolute left-[48px] -bottom-1 w-12 h-12 overflow-hidden border border-white/60 shadow-sm rotate-[-8deg] bg-[#EDE6D6]">
                <img src={pFlow} alt="" className="w-full h-full object-cover" loading="lazy" />
              </span>
            </div>
            {/* mobile: single polaroid hint so it stays tappable */}
            <div className="relative w-[68px] h-[68px] shrink-0 sm:hidden" aria-hidden>
              <span className="polaroid absolute inset-0 rotate-[-4deg] p-1.5 pb-1 shadow-md">
                <img src={p0} alt="" className="w-full h-full object-cover" loading="lazy" />
              </span>
            </div>

            <span className="min-w-0 flex-1">
              <span className="font-display font-semibold text-[20px] leading-none block">Photos</span>
              <span className="text-[13px] text-[#8A7F72] block leading-tight mt-0.5">film wall & contact sheets</span>
              <span className="inline-flex items-center gap-1.5 mt-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8B5E3C]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7D2E3B]" />
                {previewUrls.length ? `${previewUrls.length} frames ready` : "your contact sheet awaits"} · {memories.length} memories
              </span>
            </span>
            <ChevronRight size={18} className="text-[#B6AA99] shrink-0 self-center group-active:translate-x-0.5 transition" />
          </div>

          <Doodle kind="flower" className="absolute right-2 bottom-2 text-[#B6AA99] scale-[0.5] hidden sm:block" />
        </Link>

        {/* 2 — paired scrapbook pieces */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/timeline"
            className="group relative flex flex-col justify-between bg-[#F9E8E6]/80 border border-[#E8B4B8]/40 p-4 min-h-[132px] rotate-[0.35deg] active:scale-[0.98] transition touch overflow-hidden"
            style={{
              backgroundImage: "radial-gradient(rgba(139,94,60,0.05) 1px, transparent 1.1px)",
              backgroundSize: "18px 18px",
            }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-[6px] bg-[#F9E8E6]"
              style={{
                clipPath:
                  "polygon(0 100%, 0 50%, 6% 70%, 12% 30%, 20% 60%, 28% 32%, 36% 62%, 44% 28%, 52% 60%, 60% 30%, 68% 62%, 76% 32%, 84% 60%, 92% 30%, 100% 60%, 100% 100%)",
              }}
            />
            <Tape className="right-7 -top-[8px] rotate-[7deg] w-[46px]" tone="wine" />
            <span className="w-10 h-10 grid place-items-center bg-white/70 border border-[#E8B4B8]/40 rounded-[3px] text-[#7D2E3B]">
              <Sparkles size={18} />
            </span>
            <span className="mt-3">
              <span className="font-display font-semibold text-[17px] leading-none block">Our story</span>
              <span className="text-[13px] text-[#8A7F72] leading-tight block mt-1">milestones in order</span>
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#B6AA99] mt-1.5 block">
                {timeline.length ? `${timeline.length} chapters` : "start yours"}
              </span>
            </span>
            <span className="absolute right-3 bottom-3 text-[#B6AA99] text-[12px] leading-none">♡</span>
          </Link>

          <Link
            to="/wishlist"
            className="group relative flex flex-col justify-between bg-[#EFE9DC] border border-[#E5DAC6] p-4 min-h-[132px] rotate-[-0.55deg] active:scale-[0.98] transition touch overflow-hidden"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-[6px] bg-[#EFE9DC]"
              style={{
                clipPath:
                  "polygon(0 0, 100% 0, 100% 50%, 92% 30%, 84% 60%, 76% 32%, 68% 62%, 60% 30%, 52% 60%, 44% 28%, 36% 62%, 28% 32%, 20% 60%, 12% 30%, 6% 70%, 0 50%)",
              }}
            />
            <Doodle kind="heart" className="absolute -top-1.5 -right-1 text-[#E8B4B8] w-[18px]" />
            <span className="w-10 h-10 grid place-items-center bg-white border border-[#E5DAC6] rounded-[3px] text-[#7D2E3B]">
              <BookHeart size={18} />
            </span>
            <span className="mt-3">
              <span className="font-display font-semibold text-[17px] leading-none block">Wishlist</span>
              <span className="text-[13px] text-[#8A7F72] leading-tight block mt-1">someday, together</span>
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#B6AA99] mt-1.5 block">
                {wishlist.length ? `${wishlist.filter((w) => !w.done).length} still to dream` : "dream a little"}
              </span>
            </span>
            <Doodle kind="heart" className="absolute right-2 bottom-2 text-[#7D2E3B]/40 scale-[0.7]" />
          </Link>

          <Link
            to="/places"
            className="group relative flex flex-col justify-between bg-[#FFFDF7] border border-[#E5DAC6] p-4 min-h-[132px] rotate-[-0.3deg] active:scale-[0.98] transition touch overflow-hidden"
          >
            <Tape className="left-1/2 -translate-x-1/2 -top-[8px] rotate-[6deg] w-[40px]" tone="tape-yellow" />
            <span className="w-10 h-10 grid place-items-center bg-[#F3EBDD] border border-[#E5DAC6] rounded-[3px] text-[#8B5E3C]">
              <MapPin size={18} />
            </span>
            <span className="mt-3">
              <span className="font-display font-semibold text-[17px] leading-none block">Our places</span>
              <span className="text-[13px] text-[#8A7F72] leading-tight block mt-1">the map of us</span>
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B7F5E] mt-1.5 block">
                {places.length ? `${places.length} pinned` : "pin your first"}
              </span>
            </span>
            <Doodle kind="arrow" className="absolute -right-1 bottom-1 text-[#A8B89A] scale-[0.45] origin-right opacity-70" />
            <span className="absolute right-3 bottom-8 text-[#A8B89A]/60 text-[11px]">✿</span>
          </Link>

          <Link
            to="/notes"
            className="group relative flex flex-col justify-between bg-[#FCE8E6]/70 border border-[#E8B4B8]/40 p-4 min-h-[132px] rotate-[0.45deg] active:scale-[0.98] transition touch overflow-hidden"
          >
            <span className="w-10 h-10 grid place-items-center bg-white border border-[#E8B4B8]/40 rounded-[3px] text-[#7D2E3B]">
              <NotebookPen size={18} />
            </span>
            <span className="mt-3">
              <span className="font-display font-semibold text-[17px] leading-none block">Notes</span>
              <span className="text-[13px] text-[#8A7F72] leading-tight block mt-1">letters & scraps</span>
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#B6AA99] mt-1.5 block">
                {notes.length ? `${notes.length} tucked away` : "leave one ♡"}
              </span>
            </span>
            <span className="absolute right-2 bottom-2 text-[#7D2E3B]/50 text-[13px]">♡</span>
          </Link>
        </div>

        {/* 3 — Photobooth · now with strip thumb like the mockup */}
        <Link
          to="/photobooth"
          className="group relative flex items-center gap-3 bg-[#E8E9D8] border border-[#A8B89A]/40 p-3 pr-2 active:scale-[0.98] transition touch overflow-hidden rotate-[0.2deg]"
          style={{
            backgroundImage: "radial-gradient(rgba(139,94,60,0.05) 1px, transparent 1.1px)",
            backgroundSize: "18px 18px",
          }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[6px] bg-[#E8E9D8]"
            style={{
              clipPath:
                "polygon(0 100%, 0 45%, 4% 65%, 9% 30%, 14% 60%, 20% 32%, 26% 58%, 32% 30%, 38% 60%, 44% 28%, 50% 58%, 56% 30%, 62% 60%, 68% 30%, 74% 58%, 80% 32%, 86% 58%, 92% 30%, 96% 55%, 100% 45%, 100% 100%)",
            }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[6px] bg-[#E8E9D8]"
            style={{
              clipPath:
                "polygon(0 0, 100% 0, 100% 55%, 96% 35%, 92% 60%, 86% 30%, 80% 60%, 74% 32%, 68% 60%, 62% 28%, 56% 62%, 50% 30%, 44% 58%, 38% 28%, 32% 62%, 26% 32%, 20% 60%, 14% 30%, 9% 60%, 4% 35%, 0 55%)",
            }}
          />
          <span className="w-11 h-11 grid place-items-center bg-white border border-[#A8B89A]/40 rounded-[3px] text-[#2B2622] shrink-0">
            <Aperture size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="font-display font-semibold text-[18px] leading-none block">Photobooth</span>
            <span className="text-[13px] text-[#6B7F5E] leading-tight block mt-0.5">moments, in frames</span>
          </span>

          {/* vertical strip thumb */}
          <span className="shrink-0 w-[72px] bg-white border border-[#E5DAC6] p-1 pb-1.5 shadow-sm rotate-[2deg] hidden sm:block" aria-hidden>
            <span className="grid grid-cols-1 gap-1">
              {(previewUrls.slice(0, 4).length ? previewUrls.slice(0, 4) : [p0, p1, pFlow, p0]).map((u, i) => (
                <img key={`${u}-${i}`} src={u} alt="" className="w-full aspect-[4/3] object-cover" loading="lazy" />
              ))}
            </span>
          </span>
          {/* mobile hint */}
          <span className="shrink-0 w-10 h-14 bg-white border border-[#E5DAC6] p-1 shadow-sm rotate-[3deg] sm:hidden grid place-items-center" aria-hidden>
            <Aperture size={14} className="text-[#B6AA99]" />
          </span>

          <ChevronRight size={18} className="text-[#8A7F72] shrink-0 group-active:translate-x-0.5 transition" />
          <span className="absolute right-2 -bottom-1 text-[#7D2E3B] text-[13px]">♡</span>
        </Link>

        {/* 4 — Memories · dusty blush, like the mockup */}
        <Link
          to="/memories"
          className="group relative flex items-center gap-3.5 bg-[#F9E0E1]/75 border border-[#E8B4B8]/40 p-4 active:scale-[0.98] transition touch overflow-hidden rotate-[-0.25deg]"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[6px] bg-[#F9E0E1]"
            style={{
              clipPath:
                "polygon(0 100%, 0 40%, 4% 60%, 9% 28%, 14% 58%, 20% 30%, 26% 58%, 32% 28%, 38% 60%, 44% 28%, 50% 60%, 56% 28%, 62% 60%, 68% 28%, 74% 58%, 80% 28%, 86% 60%, 92% 30%, 96% 50%, 100% 40%, 100% 100%)",
            }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[6px] bg-[#F9E0E1]"
            style={{
              clipPath:
                "polygon(0 0, 100% 0, 100% 60%, 96% 35%, 92% 58%, 86% 28%, 80% 58%, 74% 28%, 68% 58%, 62% 28%, 56% 58%, 50% 28%, 44% 58%, 38% 28%, 32% 58%, 26% 28%, 20% 58%, 14% 28%, 9% 58%, 4% 40%, 0 60%)",
            }}
          />
          <span className="w-11 h-11 grid place-items-center bg-white border border-[#E8B4B8]/40 rounded-[3px] text-[#7D2E3B] shrink-0">
            <BookHeart size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="font-display font-semibold text-[18px] leading-none block">Memories</span>
            <span className="text-[13px] text-[#8A7F72] leading-tight block mt-0.5">every page</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#B6AA99] mt-1 block">
              {memories.length ? `${memories.length} pages & counting` : "your first page awaits"}
            </span>
          </span>
          <ChevronRight size={18} className="text-[#8A7F72]/60 shrink-0 group-active:translate-x-0.5 transition" />
          <span className="absolute right-10 -bottom-1 text-[#8B5E3C]/50 text-[18px] leading-none" aria-hidden>
            ✿
          </span>
        </Link>

        {/* 5 — utility row */}
        <Link
          to="/profile"
          className="group flex items-center gap-3 bg-[#FAF6EF]/70 border border-dashed border-[#B6AA99]/60 px-4 py-3.5 active:scale-[0.98] transition touch"
        >
          <span className="w-9 h-9 grid place-items-center bg-white border border-[#E5DAC6] rounded-[3px] text-[#8A7F72] shrink-0">
            <Settings size={17} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="font-display font-semibold text-[15px] leading-none block">Settings & profile</span>
            <span className="text-[12.5px] text-[#8A7F72] leading-tight block">names, dates, invite</span>
          </span>
          <span className="text-[#B6AA99] text-[13px] leading-none">♡</span>
          <ChevronRight size={16} className="text-[#B6AA99] shrink-0" />
        </Link>
      </div>

      <button onClick={signOut} className="touch mt-4 w-full text-center text-[13px] font-bold text-[#8A7F72] underline">
        log out
      </button>
      <p className="mt-3 text-center text-[11px] uppercase tracking-[0.2em] text-[#D8CCB8]">twofold · Two Lives, one story.</p>
    </div>
  );
}

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { BookHeart, Camera, Heart, MapPin, NotebookPen, Plus } from "lucide-react";
import { useApp } from "../store/AppContext";
import { daysTogether, formatDate, formatDays } from "../lib/format";
import { Divider, Doodle, Polaroid, SectionHeading, Tape } from "../components/scrapbook/bits";
import { InviteCodeCard } from "../components/InviteCode";
import { hashSeedPick } from "../lib/variation";
import { Empty } from "../components/ui/primitives";

export default function Home({ onAdd }: { onAdd: () => void }) {
  const { couple, memories, notes, timeline, places, toggleMemoryFav, regenerateCode } = useApp();
  const days = couple ? daysTogether(couple.together_since) : 0;
  const recent = useMemo(() => memories.slice(0, 4), [memories]);
  const latestNotes = useMemo(() => notes.slice(0, 2), [notes]);
  const nextMilestones = useMemo(() => timeline.slice(0, 3), [timeline]);

  if (!couple) return null;

  return (
    <div className="px-4 sm:px-6 max-w-3xl mx-auto lg:max-w-5xl pb-10">
      {/* couple header — diary opening */}
      <section className="pt-5 sm:pt-8 text-center relative">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#8B5E3C]">our diary · est. {formatDate(couple.together_since)}</p>
        <div className="mt-3 flex items-center justify-center">
          <div className="flex items-center">
            <span className="w-[68px] h-[68px] sm:w-[84px] sm:h-[84px] rounded-full border-[3px] border-[#FFFDF7] shadow overflow-hidden bg-[#EDE6D6] -rotate-6">
              {couple.avatar_a_url ? <img src={couple.avatar_a_url} alt="" className="w-full h-full object-cover" /> : <span className="grid place-items-center h-full font-display font-bold text-[24px]">Y</span>}
            </span>
            <span className="w-[68px] h-[68px] sm:w-[84px] sm:h-[84px] rounded-full border-[3px] border-[#FFFDF7] shadow overflow-hidden bg-[#EDE6D6] -ml-4 rotate-6">
              {couple.avatar_b_url ? <img src={couple.avatar_b_url} alt="" className="w-full h-full object-cover" /> : <span className="grid place-items-center h-full font-display font-bold text-[24px]">M</span>}
            </span>
          </div>
        </div>
        <h2 className="font-display text-[34px] sm:text-[40px] font-semibold tracking-tight mt-2">{couple.name}</h2>
        <p className="font-display italic text-[18px] text-[#7D2E3B] mt-0.5">
          {formatDays(days)} days together <span aria-hidden>♡</span>
        </p>
        <p className="font-hand text-[20px] text-[#8A7F72] mt-1 max-w-[36ch] mx-auto leading-snug break-words">{couple.description}</p>
        <Doodle kind="squiggle" className="mx-auto mt-2 text-[#B6AA99]" aria-hidden />
      </section>

      {/* invite — most asked for, so it's right under your names */}
      <section className="mt-5" aria-label="Invite code">
        <InviteCodeCard code={couple.invite_code} onRegenerate={regenerateCode} />
      </section>

      {/* quick add */}
      <section className="mt-6">
        <div className="grid grid-cols-4 gap-2">
          <QuickBtn icon={<Camera size={22} />} label="Photo" onClick={onAdd} />
          <QuickBtn icon={<NotebookPen size={22} />} label="Note" onClick={onAdd} />
          <QuickBtn icon={<BookHeart size={22} />} label="Memory" onClick={onAdd} />
          <QuickBtn icon={<MapPin size={22} />} label="Place" onClick={onAdd} />
        </div>
      </section>

      {/* recent memories — varied compositions */}
      <section className="mt-8">
        <SectionHeading kicker="fresh off the film" title="Recent memories" note="the good stuff, latest first" action={<Link to="/memories" className="touch min-h-[44px] inline-flex items-center text-[14px] font-bold text-[#7D2E3B] underline shrink-0 px-2 -mr-2">all →</Link>} />
        {recent.length === 0 ? (
          <Empty title="No memories yet" body="Tap Add and save your first one — a photo and a line is plenty." action={<button onClick={onAdd} className="touch inline-flex items-center gap-2 bg-[#2B2622] text-[#FAF6EF] px-5 rounded-[3px] font-bold text-[15px]"><Plus size={17} /> Add memory</button>} />
        ) : (
          <div className="flex flex-col gap-8">
            {recent.map((m) => (
              <MemoryCard key={m.id} id={m.id} title={m.title} caption={m.caption} date={m.date} location={m.location_label} creator={m.creator} fav={m.favorite} photos={m.photos.map((p) => p.url)} onFav={() => toggleMemoryFav(m.id)} />
            ))}
          </div>
        )}
      </section>

      <Divider />

      {/* latest notes */}
      <section>
        <SectionHeading kicker="tucked between pages" title="Latest notes" note="little pieces of paper" action={<Link to="/notes" className="touch min-h-[44px] inline-flex items-center text-[14px] font-bold text-[#7D2E3B] underline shrink-0 px-2 -mr-2">all →</Link>} />
        <div className="grid sm:grid-cols-2 gap-3">
          {latestNotes.map((n, i) => (
            <div key={n.id} className={`${n.style === "sticky" ? "bg-[#FCE9A8] border-[#E8A838]/40 rotate-[0.8deg]" : n.style === "letter" ? "bg-[#F9E8E6] border-[#E8B4B8]/70 rotate-[-0.8deg]" : "paper-card rotate-[0.4deg]"} border p-4 relative`}>
              <Tape className="left-1/2 -translate-x-1/2 -top-[10px] w-[64px]" tone={i === 0 ? "" : "sage"} />
              <p className={`text-[16px] leading-relaxed ${n.style === "journal" ? "font-hand text-[22px] leading-[1.2]" : ""}`}>“{n.body}”</p>
              <p className="mt-2 text-[12px] uppercase tracking-[0.14em] text-[#8A7F72]">— {n.author} · {n.date_label || formatDate(n.created_at)}</p>
            </div>
          ))}
          {latestNotes.length === 0 && <p className="text-[14px] text-[#8A7F72]">No notes yet. Leave one for them ♡</p>}
        </div>
      </section>

      <Divider />

      {/* timeline preview */}
      <section>
        <SectionHeading kicker="how we got here" title="Our story, so far" action={<Link to="/timeline" className="touch min-h-[44px] inline-flex items-center text-[14px] font-bold text-[#7D2E3B] underline shrink-0 px-2 -mr-2">full story →</Link>} />
        <ol className="relative ml-2 border-l-2 border-dashed border-[#B6AA99] pl-5 flex flex-col gap-5">
          {nextMilestones.map((t) => (
            <li key={t.id} className="relative">
              <span className="absolute -left-[29px] top-1 w-3 h-3 rounded-full bg-[#7D2E3B] border-2 border-[#FAF6EF]" />
              <div className="font-display font-semibold text-[17px] leading-tight">{t.title}</div>
              <div className="text-[13px] uppercase tracking-[0.12em] text-[#8B5E3C] font-bold">{formatDate(t.date)}</div>
              {t.description && <p className="text-[14px] text-[#4A423B] mt-0.5">{t.description}</p>}
            </li>
          ))}
          {nextMilestones.length === 0 && <p className="text-[14px] text-[#8A7F72]">Pin your first milestone — “we met” is a good start.</p>}
        </ol>
      </section>

      <Divider />

      {/* places preview */}
      <section>
        <SectionHeading kicker="pinned with love" title="Our places" note={`${places.length} little dots on our map`} action={<Link to="/places" className="touch min-h-[44px] inline-flex items-center text-[14px] font-bold text-[#7D2E3B] underline shrink-0 px-2 -mr-2">map →</Link>} />
        <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
          {places.map((p) => (
            <Link key={p.id} to="/places" className="shrink-0 w-[190px] bg-[#FFFDF7] border border-[#E5DAC6] p-2.5 rotate-[-0.5deg] odd:rotate-[0.5deg]">
              {p.photo_url && <img src={p.photo_url} alt="" className="w-full h-[110px] object-cover" loading="lazy" />}
              <div className="font-display font-semibold text-[15px] mt-1.5 leading-tight">{p.name}</div>
              <div className="text-[12.5px] text-[#8A7F72] inline-flex items-center gap-1"><MapPin size={12} /> {p.date ? formatDate(p.date) : "someday"}</div>
            </Link>
          ))}
          {places.length === 0 && <p className="text-[14px] text-[#8A7F72]">No places yet — save the bench, the café, the dock.</p>}
        </div>
      </section>
    </div>
  );
}

function QuickBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="touch min-h-[48px] flex flex-col items-center justify-center gap-1 bg-[#FFFDF7] border border-[#E5DAC6] rounded-[4px] py-3 active:scale-[0.97] text-[#4A423B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D2E3B]">
      <span className="text-[#7D2E3B]" aria-hidden>{icon}</span>
      <span className="text-[12.5px] font-bold">{label}</span>
    </button>
  );
}

function MemoryCard({ id, title, caption, date, location, creator, fav, photos, onFav }: {
  id: string; title: string; caption: string; date: string; location?: string; creator: string; fav: boolean; photos: string[]; onFav: () => void;
}) {
  const doodle = hashSeedPick(id + ":doodle", ["heart", "star", "sparkle", null, null] as const);
  const doodleCls =
    doodle === "heart"
      ? "text-[#7D2E3B] -top-3 right-8 rotate-12"
      : doodle === "star"
        ? "text-[#E8A838] top-1/3 -right-2 -rotate-12"
        : "text-[#8B5E3C] -top-2 right-1/3 rotate-6";
  return (
    <div className="block group relative max-w-[520px]">
      {doodle && <Doodle kind={doodle} className={`absolute ${doodleCls}`} aria-hidden />}
      <Link to={`/memories/${id}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D2E3B] rounded-[3px]">
        {photos.length >= 2 ? (
          <div className="grid grid-cols-[1.15fr_0.85fr] gap-2 items-start min-w-0">
            <Polaroid src={photos[0]} seed={`${id}-0`} caption={title} date={formatDate(date)} className="w-full" imgClassName="aspect-[4/4.6]" />
            <div className="flex flex-col gap-2 pt-4">
              <Polaroid src={photos[1]} seed={`${id}-1`} className="w-full" imgClassName="aspect-square" />
              {photos[2] && <span className="stamp text-[#8B5E3C] self-start">+{photos.length - 2} more</span>}
            </div>
          </div>
        ) : (
          <div className={hashSeedPick(id + ":side", ["max-w-[420px]", "max-w-[420px] ml-auto"] as const)}>
            <Polaroid src={photos[0] || "https://picsum.photos/seed/empty/600/600"} seed={id} caption={title} date={formatDate(date)} imgClassName="aspect-[4/3.4]" />
          </div>
        )}
        <div className="mt-2 pr-[56px]">
          <h3 className="font-display font-semibold text-[19px] leading-tight group-hover:underline decoration-[#7D2E3B]/40 underline-offset-4 break-words">{title}</h3>
          <p className="text-[14.5px] text-[#4A423B] leading-relaxed mt-0.5 line-clamp-2 break-words" title={caption}>{caption}</p>
          <p className="mt-1 text-[12.5px] text-[#8A7F72] font-semibold tracking-wide break-words">{location && <span>{location} · </span>}by {creator}</p>
        </div>
      </Link>
      <button
        type="button"
        aria-label={fav ? `Remove favorite: ${title}` : `Favorite ${title}`}
        aria-pressed={fav}
        onClick={onFav}
        className={`touch absolute right-0 bottom-0 shrink-0 w-11 h-11 grid place-items-center border rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D2E3B] ${fav ? "bg-[#7D2E3B] text-white border-[#7D2E3B]" : "bg-[#FFFDF7] border-[#E5DAC6] text-[#B6AA99]"}`}
      >
        <Heart size={19} fill={fav ? "currentColor" : "none"} aria-hidden />
      </button>
    </div>
  );
}

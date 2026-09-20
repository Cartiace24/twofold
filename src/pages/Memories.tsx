import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Heart, MapPin, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useApp } from "../store/AppContext";
import { formatDate } from "../lib/format";
import { Empty, Sheet } from "../components/ui/primitives";
import { Polaroid, FilterTabs, SectionHeading, Tape } from "../components/scrapbook/bits";
import { MemoryForm } from "../components/forms/forms";

export default function Memories() {
  const { memories, toggleMemoryFav, deleteMemory } = useApp();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "fav">("all");
  const [params] = useSearchParams();
  const [showNew, setShowNew] = useState(params.get("new") !== null);

  const list = useMemo(() => {
    return memories.filter((m) => {
      if (tab === "fav" && !m.favorite) return false;
      if (!q.trim()) return true;
      const s = `${m.title} ${m.caption} ${m.location_label} ${m.tags.join(" ")}`.toLowerCase();
      return s.includes(q.toLowerCase());
    });
  }, [memories, q, tab]);

  return (
    <div className="px-4 sm:px-6 max-w-3xl mx-auto lg:max-w-5xl pb-10">
      <div className="pt-5 sm:pt-8">
        <SectionHeading kicker="the heart of it" title="Memories" note={`${memories.length} pages & counting`} action={
          <button onClick={() => setShowNew(true)} className="touch inline-flex items-center gap-1.5 bg-[#2B2622] text-[#FAF6EF] px-4 rounded-[3px] text-[14px] font-bold"><Plus size={16} /> New</button>
        } />
        <label className="flex items-center gap-2 bg-[#FFFDF7] border border-[#E5DAC6] rounded-[3px] px-3 focus-within:ring-2 focus-within:ring-[#7D2E3B]/15 focus-within:border-[#7D2E3B]">
          <Search size={18} className="text-[#B6AA99] shrink-0" aria-hidden />
          <input aria-label="Search memories" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search spaghetti nights, lakes…" className="touch flex-1 min-w-0 bg-transparent outline-none text-[15px] placeholder:text-[#B6AA99]" />
          {q && (
            <button type="button" aria-label="Clear search" onClick={() => setQ("")} className="touch w-11 h-11 -mr-2 grid place-items-center text-[#8A7F72] shrink-0">×</button>
          )}
        </label>
        <div className="mt-1">
          <FilterTabs
            ariaLabel="Memory filters"
            value={tab}
            onChange={setTab}
            options={[
              { id: "all", label: "everything" },
              { id: "fav", label: "favorites ♡" },
            ]}
          />
        </div>
      </div>

      {list.length === 0 ? (
        <div className="mt-6"><Empty title="Nothing here yet" body={q ? "No memories match that search. Try another word?" : "Save your first memory — a photo and one honest line."} /></div>
      ) : (
        <div className="mt-6 grid sm:grid-cols-2 gap-x-5 gap-y-9">
          {list.map((m) => (
            <article key={m.id} className="relative">
              <Link to={`/memories/${m.id}`}>
                <Polaroid src={m.photos[0]?.url || "https://picsum.photos/seed/empty/600/600"} seed={m.id} caption={m.title} date={formatDate(m.date)} imgClassName="aspect-[4/3.6]" />
              </Link>
              <p className="mt-2 text-[14px] text-[#4A423B] line-clamp-2 leading-relaxed">{m.caption}</p>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[12.5px] font-semibold text-[#8A7F72]">{m.location_label || "somewhere ours"} · {m.photos.length} photo{m.photos.length === 1 ? "" : "s"}</span>
                <span className="flex items-center gap-1">
                  <button type="button" aria-label={m.favorite ? `Remove favorite: ${m.title}` : `Favorite ${m.title}`} aria-pressed={m.favorite} onClick={() => toggleMemoryFav(m.id)} className={`touch w-11 h-11 grid place-items-center rounded-full border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D2E3B] ${m.favorite ? "bg-[#7D2E3B] text-white border-[#7D2E3B]" : "border-[#E5DAC6] text-[#B6AA99]"}`}>
                    <Heart size={17} fill={m.favorite ? "currentColor" : "none"} aria-hidden />
                  </button>
                  <button type="button" aria-label={`Delete ${m.title}`} onClick={() => { if (confirm(`Remove “${m.title}”?`)) deleteMemory(m.id); }} className="touch w-11 h-11 grid place-items-center rounded-full border border-[#E5DAC6] text-[#B6AA99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D2E3B]">
                    <Trash2 size={16} aria-hidden />
                  </button>
                </span>
              </div>
              {m.tags.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1.5">{m.tags.map((t) => <span key={t} className="text-[12px] font-bold text-[#6B7F5E] bg-[#E7EBDD] px-2 py-0.5 rounded-[2px]">#{t}</span>)}</div>}
            </article>
          ))}
        </div>
      )}

      <Sheet open={showNew} onClose={() => setShowNew(false)} title="New memory">
        <MemoryForm onDone={() => setShowNew(false)} />
      </Sheet>
    </div>
  );
}

export function MemoryDetail() {
  const { id } = useParams();
  const { memories, toggleMemoryFav, updateMemory, deleteMemory } = useApp();
  const m = memories.find((x) => x.id === id);
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState("");

  if (!m) return <div role="alert" className="p-8 text-center font-hand text-[22px] text-[#8A7F72]">That page seems to have slipped out… <Link to="/memories" className="underline text-[#7D2E3B]">back</Link></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-16">
      <Link to="/memories" className="touch inline-flex items-center gap-1.5 text-[14px] font-bold text-[#8A7F72] pt-5"><ArrowLeft size={16} /> all memories</Link>
      <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#8B5E3C]">{formatDate(m.date)}{m.location_label ? ` · ${m.location_label}` : ""}</p>
      <h1 className="font-display text-[32px] sm:text-[38px] font-semibold tracking-tight leading-[1.02] mt-1">{m.title}</h1>
      <p className="font-hand text-[22px] text-[#8A7F72]">by {m.creator}</p>

      <div className="mt-5 flex flex-col gap-6">
        {m.photos.map((p, i) => (
          <Polaroid key={p.id} src={p.url} seed={p.id} date={i === 0 ? formatDate(m.date) : undefined} imgClassName="aspect-[4/3.5]" />
        ))}
        {m.photos.length === 0 && <Empty title="No photos" body="Words count too." />}
      </div>

      <div className="relative mt-6 bg-[#FFFDF7] border border-[#E5DAC6] p-5">
        <Tape className="left-10 -top-[11px]" tone="tape-yellow" />
        {!editing ? (
          <p className="text-[16.5px] leading-relaxed">{m.caption || <span className="text-[#B6AA99] italic">No caption — add the story?</span>}</p>
        ) : (
          <div className="flex flex-col gap-3">
            <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={4} className="w-full bg-transparent border border-[#E5DAC6] rounded-[3px] p-3 text-[15.5px] outline-none" />
            <div className="flex gap-2">
              <button onClick={async () => { await updateMemory(m.id, { caption }); setEditing(false); }} className="touch bg-[#2B2622] text-white px-5 rounded-[3px] font-bold text-[14px]">Save</button>
              <button onClick={() => setEditing(false)} className="touch px-4 text-[14px] font-bold text-[#8A7F72]">Cancel</button>
            </div>
          </div>
        )}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[12.5px] font-bold text-[#8A7F72] inline-flex items-center gap-1"><MapPin size={13} /> {m.location_label || "somewhere ours"}</span>
          <span className="flex gap-1.5">
            <button onClick={() => { setCaption(m.caption); setEditing(true); }} className="touch px-3 inline-flex items-center gap-1 text-[13.5px] font-bold text-[#4A423B] border border-[#E5DAC6] rounded-[3px] bg-white"><Pencil size={14} /> Edit</button>
            <button onClick={() => toggleMemoryFav(m.id)} className={`touch w-11 grid place-items-center rounded-full border ${m.favorite ? "bg-[#7D2E3B] text-white border-[#7D2E3B]" : "border-[#E5DAC6]"}`}><Heart size={17} fill={m.favorite ? "currentColor" : "none"} /></button>
          </span>
        </div>
      </div>

      {m.tags.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{m.tags.map((t) => <span key={t} className="text-[12.5px] font-bold bg-[#E7EBDD] text-[#6B7F5E] px-2.5 py-1 rounded-[2px]">#{t}</span>)}</div>}

      <button onClick={async () => { if (confirm("Delete this memory forever?")) { await deleteMemory(m.id); window.history.back(); } }} className="mt-8 text-[13.5px] underline text-[#B6AA99]">delete this memory</button>
    </div>
  );
}

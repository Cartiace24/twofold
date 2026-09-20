import { useState } from "react";
import { Heart, Pencil, Plus, Trash2 } from "lucide-react";
import { useApp } from "../store/AppContext";
import { Empty, Sheet } from "../components/ui/primitives";
import { SectionHeading, FilterTabs, Tape, seededTapeSpot, seededTapeTone, seededTilt } from "../components/scrapbook/bits";
import { NoteForm } from "../components/forms/forms";
import { useSearchParams } from "react-router-dom";

export default function Notes() {
  const { notes, toggleNoteFav, deleteNote, updateNote } = useApp();
  const [params] = useSearchParams();
  const [showNew, setShowNew] = useState(params.get("new") !== null);
  const [onlyFav, setOnlyFav] = useState(false);  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const list = notes.filter((n) => !onlyFav || n.favorite);

  return (
    <div className="px-4 sm:px-6 max-w-3xl mx-auto lg:max-w-4xl pb-10">
      <div className="pt-5 sm:pt-8">
        <SectionHeading kicker="passed back & forth" title="Notes" note="love notes, reminders, futures" action={
          <button onClick={() => setShowNew(true)} className="touch inline-flex items-center gap-1 bg-[#2B2622] text-[#FAF6EF] px-4 rounded-[3px] text-[14px] font-bold shrink-0"><Plus size={15} /> Write</button>
        } />
        <FilterTabs
          ariaLabel="Note filters"
          value={onlyFav ? "fav" : "all"}
          onChange={(v) => setOnlyFav(v === "fav")}
          options={[
            { id: "all", label: "everything" },
            { id: "fav", label: "saved ♡" },
          ]}
        />
      </div>

      {list.length === 0 ? (
        <Empty title="A blank page" body="Leave the first note. It doesn't have to be big — “thinking of you” counts." action={<button type="button" onClick={() => setShowNew(true)} className="touch min-h-[44px] inline-flex items-center justify-center px-5 bg-[#2B2622] text-[#FAF6EF] rounded-[3px] font-bold text-[14px]">Write one ♡</button>} />
      ) : (
        <div className="columns-1 sm:columns-2 gap-4 [column-fill:balance]">
          {list.map((n) => (
            <div
              key={n.id}
              className={`break-inside-avoid mb-4 border p-5 pt-6 relative ${paperCls(n.style)}`}
              style={{ transform: `rotate(${(seededTilt(n.id) * 0.45).toFixed(2)}deg)` }}
            >
              <Tape className={seededTapeSpot(n.id)} tone={seededTapeTone(n.id)} />
              {editingId === n.id ? (
                <div className="flex flex-col gap-2">
                  <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} className="w-full bg-white/60 border border-[#B6AA99]/50 rounded-[3px] p-2.5 text-[15px] outline-none" />
                  <div className="flex gap-2">
                    <button onClick={async () => { await updateNote(n.id, { body: draft }); setEditingId(null); }} className="touch bg-[#2B2622] text-white px-4 rounded-[3px] text-[13.5px] font-bold">Save</button>
                    <button onClick={() => setEditingId(null)} className="touch px-3 text-[13.5px] font-bold text-[#8A7F72]">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className={`${n.style === "journal" || n.style === "letter" ? "font-hand text-[23px] leading-[1.2] break-words" : "text-[15.5px] leading-relaxed break-words"}`}>{n.body}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-[#8A7F72] truncate">{n.date_label ? `— ${n.author} · ${n.date_label}` : `— ${n.author}`}</span>
                    <span className="flex items-center gap-0.5 shrink-0">
                      <button type="button" aria-label={`Edit note by ${n.author}`} onClick={() => { setEditingId(n.id); setDraft(n.body); }} className="touch w-11 h-11 grid place-items-center text-[#8A7F72] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D2E3B] rounded-[3px]"><Pencil size={16} aria-hidden /></button>
                      <button type="button" aria-label={n.favorite ? `Remove favorite` : `Favorite note`} aria-pressed={n.favorite} onClick={() => toggleNoteFav(n.id)} className={`touch w-11 h-11 grid place-items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D2E3B] rounded-[3px] ${n.favorite ? "text-[#7D2E3B]" : "text-[#B6AA99]"}`}><Heart size={17} fill={n.favorite ? "currentColor" : "none"} aria-hidden /></button>
                      <button type="button" aria-label="Delete note" onClick={() => { if (confirm("Toss this note?")) deleteNote(n.id); }} className="touch w-11 h-11 grid place-items-center text-[#B6AA99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D2E3B] rounded-[3px]"><Trash2 size={16} aria-hidden /></button>
                    </span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <Sheet open={showNew} onClose={() => setShowNew(false)} title="Write a note">
        <NoteForm onDone={() => setShowNew(false)} />
      </Sheet>
    </div>
  );
}

function paperCls(style: string) {
  if (style === "sticky") return "bg-[#FCE9A8] border-[#E8A838]/50 shadow-sm";
  if (style === "letter") return "bg-[#F9E8E6] border-[#E8B4B8]/70";
  if (style === "scrap") return "bg-[#F3EBDD] border-[#B6AA99]/60";
  if (style === "index") return "bg-white border-[#B6AA99]/50 ruled";
  return "paper-card";
}

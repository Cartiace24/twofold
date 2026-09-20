import { useMemo, useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { useApp } from "../store/AppContext";
import { Empty, Sheet } from "../components/ui/primitives";
import { SectionHeading } from "../components/scrapbook/bits";
import { WishForm } from "../components/forms/forms";
import { WISHLIST_CATEGORIES } from "../lib/types";

export default function Wishlist() {
  const { wishlist, addWish: _add, toggleWish, deleteWish } = useApp();
  void _add;
  const [showNew, setShowNew] = useState(false);
  const [cat, setCat] = useState<string>("All");
  const [hideDone, setHideDone] = useState(false);

  const done = wishlist.filter((w) => w.done).length;
  const list = useMemo(() => wishlist.filter((w) => (cat === "All" || w.category === cat) && (!hideDone || !w.done)), [wishlist, cat, hideDone]);

  return (
    <div className="px-4 sm:px-6 max-w-2xl mx-auto pb-16">
      <div className="pt-5 sm:pt-8">
        <SectionHeading kicker="someday, together" title="Wishlist" note={`${done}/${wishlist.length} dreamed & done`} action={
          <button onClick={() => setShowNew(true)} className="touch inline-flex items-center gap-1 bg-[#2B2622] text-[#FAF6EF] px-4 rounded-[3px] text-[14px] font-bold"><Plus size={15} /> Dream</button>
        } />
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
          {["All", ...WISHLIST_CATEGORIES].map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`touch shrink-0 px-3.5 rounded-[3px] border text-[13px] font-bold ${cat === c ? "bg-[#7D2E3B] text-white border-[#7D2E3B]" : "bg-[#FFFDF7] border-[#E5DAC6] text-[#4A423B]"}`}>{c}</button>
          ))}
        </div>
        <label className="mt-2 inline-flex items-center gap-2 text-[13.5px] font-semibold text-[#8A7F72]">
          <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} className="w-5 h-5 accent-[#7D2E3B]" /> hide the done ones
        </label>
      </div>

      {list.length === 0 ? (
        <div className="mt-5"><Empty title={wishlist.length === 0 ? "Blank bucket list" : "No matches here"} body={wishlist.length === 0 ? "Dream a little — sunrise, Japan, that restaurant, camping with no phones." : "Try another filter, or clear them to see everything again."} /></div>
      ) : (
        <ul className="mt-4 bg-[#FFFDF7] border border-[#E5DAC6] divide-y divide-[#EFE6D3] rotate-[-0.3deg]">
          <li className="px-5 pt-4 pb-1"><p className="font-hand text-[22px] text-[#7D2E3B]">our someday list —</p></li>
          {list.map((w) => (
            <li key={w.id} className="px-4 sm:px-5 py-3 flex items-start gap-3">
              <button type="button" aria-label={w.done ? `Mark as not done: ${w.title}` : `Mark as done: ${w.title}`} aria-pressed={w.done} onClick={() => toggleWish(w.id)} className={`touch mt-0.5 w-[26px] h-[26px] shrink-0 grid place-items-center border-2 rounded-[4px] min-h-[44px] min-w-[44px] -m-[9px] p-[9px] ${w.done ? "bg-[#6B7F5E] border-[#6B7F5E] text-white" : "border-[#B6AA99] text-transparent"}`}>
                <Check size={16} strokeWidth={3} aria-hidden />
              </button>
              <span className="flex-1 min-w-0">
                <span className={`font-hand text-[22px] leading-[1.1] block break-words ${w.done ? "line-through decoration-[#7D2E3B]/60 text-[#8A7F72]" : "text-[#2B2622]"}`}>{w.title}</span>
                {(w.note || w.category) && <span className="text-[12.5px] font-bold text-[#8A7F72] break-words">{w.category}{w.note ? ` · ${w.note}` : ""}</span>}
              </span>
              <button type="button" aria-label={`Delete ${w.title}`} onClick={() => { if (confirm(`Remove “${w.title}”?`)) deleteWish(w.id); }} className="touch w-11 h-11 grid place-items-center text-[#8A7F72] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D2E3B] rounded-[3px]"><Trash2 size={16} aria-hidden /></button>
            </li>
          ))}
          <li className="px-5 py-3"><p className="font-hand text-[19px] text-[#B6AA99]">…and whatever we think of at 2am ♡</p></li>
        </ul>
      )}

      <Sheet open={showNew} onClose={() => setShowNew(false)} title="Add a dream">
        <WishForm onDone={() => setShowNew(false)} />
      </Sheet>
    </div>
  );
}

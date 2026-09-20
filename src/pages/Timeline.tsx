import { useState } from "react";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { useApp } from "../store/AppContext";
import { formatDate } from "../lib/format";
import { Empty, Sheet } from "../components/ui/primitives";
import { Doodle } from "../components/scrapbook/bits";
import { MilestoneForm } from "../components/forms/forms";

export default function Timeline() {
  const { timeline, deleteMilestone } = useApp();
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="px-4 sm:px-6 max-w-2xl mx-auto pb-16">
      <div className="pt-5 sm:pt-8 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#8B5E3C]">from the very first page</p>
        <h1 className="font-display text-[34px] font-semibold tracking-tight">Our story</h1>
        <p className="font-hand text-[21px] text-[#8A7F72]">every chapter, in order ♡</p>
        <button onClick={() => setShowNew(true)} className="touch mt-3 inline-flex items-center gap-1.5 bg-[#2B2622] text-[#FAF6EF] px-5 rounded-[3px] text-[14.5px] font-bold"><Plus size={16} /> Add milestone</button>
      </div>

      {timeline.length === 0 ? (
        <div className="mt-6"><Empty title="Once upon a time…" body="Pin your first milestone — where it all started." /></div>
      ) : (
        <ol className="mt-8 relative ml-3 border-l-2 border-[#2B2622]/80 pl-0 flex flex-col gap-8">
          {timeline.map((t, i) => (
            <li key={t.id} className="relative pl-8">
              <span className="absolute left-[-9px] top-1 w-[16px] h-[16px] rounded-full bg-[#FAF6EF] border-[3px] border-[#7D2E3B]" />
              <span className="stamp text-[#7D2E3B]">{formatDate(t.date)}</span>
              <h3 className="font-display text-[24px] font-semibold tracking-tight mt-1.5 leading-tight">{t.title}</h3>
              {t.location_label && <p className="text-[13px] font-bold text-[#8B5E3C] inline-flex items-center gap-1 mt-0.5"><MapPin size={13} /> {t.location_label}</p>}
              {t.description && <p className="text-[15px] text-[#4A423B] leading-relaxed mt-1 max-w-[52ch]">{t.description}</p>}
              {t.photo_url && (
                <div className={`mt-3 max-w-[380px] bg-[#FFFEFA] border border-[#E5DAC6] p-2 pb-1 shadow-sm ${i % 2 ? "rotate-[0.8deg]" : "rotate-[-0.8deg]"}`}>
                  <img src={t.photo_url} alt="" loading="lazy" className="w-full aspect-[4/3] object-cover" />
                  <p className="font-hand text-[18px] text-[#8A7F72] px-1 py-1">{t.title.toLowerCase()} ♡</p>
                </div>
              )}
              <div className="mt-1.5 flex items-center gap-3">
                <Doodle kind={i % 2 ? "heart" : "star"} className="text-[#E8B4B8]" />
                <button onClick={() => { if (confirm("Remove this milestone?")) deleteMilestone(t.id); }} className="inline-flex items-center gap-1 text-[12.5px] text-[#B6AA99] underline"><Trash2 size={12} /> remove</button>
              </div>
              {i < timeline.length - 1 && <div className="absolute left-[-22px] top-full mt-1 text-[#B6AA99] font-bold">↓</div>}
            </li>
          ))}
          <li className="pl-8 relative">
            <span className="absolute left-[-9px] top-1 w-[16px] h-[16px] rounded-full bg-[#7D2E3B]" />
            <p className="font-hand text-[24px] text-[#7D2E3B]">to be continued…</p>
          </li>
        </ol>
      )}

      <Sheet open={showNew} onClose={() => setShowNew(false)} title="New milestone">
        <MilestoneForm onDone={() => setShowNew(false)} />
      </Sheet>
    </div>
  );
}

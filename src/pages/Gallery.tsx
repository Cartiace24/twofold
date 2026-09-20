import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { useApp } from "../store/AppContext";
import { formatDate, formatMonthYear } from "../lib/format";
import { Empty } from "../components/ui/primitives";
import { SectionHeading, FilterTabs } from "../components/scrapbook/bits";

type Filter = "all" | "fav" | "year" | string; // string = month key

export default function Gallery() {
  const { memories } = useApp();
  const [filter, setFilter] = useState<Filter>("all");

  const photos = useMemo(() => {
    const all: Array<{ url: string; memoryId: string; title: string; date: string; fav: boolean }> = [];
    memories.forEach((m) => m.photos.forEach((p) => all.push({ url: p.url, memoryId: m.id, title: m.title, date: m.date, fav: m.favorite })));
    return all.sort((a, b) => b.date.localeCompare(a.date));
  }, [memories]);

  const months = useMemo(() => {
    const map = new Map<string, number>();
    photos.forEach((p) => {
      const key = p.date.slice(0, 7);
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6);
  }, [photos]);

  const year = new Date().getFullYear().toString();

  const filtered = photos.filter((p) => {
    if (filter === "all") return true;
    if (filter === "fav") return p.fav;
    if (filter === "year") return p.date.startsWith(year);
    return p.date.startsWith(filter);
  });

  return (
    <div className="px-4 sm:px-6 max-w-4xl mx-auto pb-10">
      <div className="pt-5 sm:pt-8">
        <SectionHeading kicker="contact sheet" title="Photos" note={`${photos.length} little rectangles of us`} />
        <FilterTabs
          ariaLabel="Photo filters"
          value={filter}
          onChange={setFilter}
          options={[
            { id: "all", label: "everything" },
            { id: "fav", label: "favorites ♡" },
            { id: "year", label: "this year" },
            ...months.map(([k]) => ({ id: k, label: formatMonthYear(k + "-01").toLowerCase() })),
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6"><Empty title="No photos here" body={filter !== "all" ? "No photos match that filter — try ‘everything’ again." : "Try another filter — or add a memory with photos."} action={filter !== "all" ? <button type="button" onClick={() => setFilter("all")} className="touch min-h-[44px] inline-flex items-center justify-center px-5 bg-[#2B2622] text-[#FAF6EF] rounded-[3px] font-bold text-[14px]">Show everything</button> : undefined} /></div>
      ) : (
        <div className="mt-5">
          <div className="film rounded-[3px]">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 px-3">
              {filtered.map((p, i) => (
                <Link key={`${p.memoryId}-${i}`} to={`/memories/${p.memoryId}`} className="relative group block bg-black/10">
                  <img src={p.url} alt={p.title} loading="lazy" className="w-full aspect-square object-cover border border-white/25" />
                  {p.fav && <span className="absolute top-1.5 left-1.5 bg-[#7D2E3B] text-white rounded-full p-1.5"><Heart size={12} fill="currentColor" /></span>}
                  <span className="absolute bottom-1.5 right-1.5 font-mono text-[10px] tracking-widest bg-black/55 text-white px-1.5 py-0.5">{formatDate(p.date)}</span>
                </Link>
              ))}
            </div>
          </div>
          <p className="mt-3 font-hand text-[19px] text-[#8A7F72] text-center">tap any frame to open its memory ♡</p>
        </div>
      )}
    </div>
  );
}

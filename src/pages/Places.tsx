import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, MapPin, Plus, Search, Trash2, X } from "lucide-react";
import { useApp } from "../store/AppContext";
import { formatDate } from "../lib/format";
import { Empty, Sheet } from "../components/ui/primitives";
import { SectionHeading } from "../components/scrapbook/bits";
import { PlaceForm } from "../components/forms/forms";
import type { Place } from "../lib/types";

interface GeoResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export interface PlaceDraft {
  name: string;
  lat: number;
  lng: number;
}

/** Free OpenStreetMap place search (Nominatim, no API key). Debounced to
 *  respect the 1 req/s usage policy; results carry OSM attribution. */
function PlaceSearch({ onPick }: { onPick: (d: PlaceDraft) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<number | null>(null);
  const seq = useRef(0);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  const search = (value: string) => {
    setQ(value);
    setFailed(false);
    if (timer.current) window.clearTimeout(timer.current);
    if (value.trim().length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }
    timer.current = window.setTimeout(async () => {
      const my = ++seq.current;
      setBusy(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&q=${encodeURIComponent(value.trim())}`,
          { headers: { Accept: "application/json" } }
        );
        if (!res.ok) throw new Error(`search ${res.status}`);
        const json = (await res.json()) as GeoResult[];
        if (seq.current === my) {
          setResults(json);
          setOpen(true);
        }
      } catch {
        if (seq.current === my) {
          setResults([]);
          setFailed(true);
          setOpen(false);
        }
      } finally {
        if (seq.current === my) setBusy(false);
      }
    }, 450);
  };

  const pick = (r: GeoResult) => {
    setOpen(false);
    setQ("");
    setResults([]);
    onPick({
      name: r.display_name.split(",")[0].trim(),
      lat: Number(r.lat),
      lng: Number(r.lon),
    });
  };

  return (
    <div className="relative">
      <label className="flex items-center gap-2 bg-[#FFFDF7] border border-[#E5DAC6] rounded-[3px] px-3">
        {busy ? <Loader2 size={18} className="animate-spin text-[#8B5E3C] shrink-0" /> : <Search size={18} className="text-[#B6AA99] shrink-0" />}
        <input
          value={q}
          onChange={(e) => search(e.target.value)}
          onFocus={() => { if (results.length) setOpen(true); }}
          placeholder="Search a place — try “Lisbon”, “Central Park”…"
          autoComplete="off"
          enterKeyHint="search"
          className="touch flex-1 min-w-0 bg-transparent outline-none text-[15px] placeholder:text-[#B6AA99]"
        />
        {q && (
          <button aria-label="clear search" onClick={() => { setQ(""); setResults([]); setOpen(false); }} className="w-10 h-10 grid place-items-center text-[#B6AA99] shrink-0">
            <X size={16} />
          </button>
        )}
      </label>
      {failed && <p className="mt-1.5 text-[13px] font-semibold text-[#7D2E3B]">Search hiccup — check connection and try again.</p>}
      {open && results.length > 0 && (
        <ul className="absolute z-[30] inset-x-0 top-full mt-1.5 bg-[#FFFDF7] border border-[#E5DAC6] rounded-[4px] shadow-xl max-h-[260px] overflow-y-auto">
          {results.map((r) => (
            <li key={r.place_id}>
              <button onClick={() => pick(r)} className="w-full min-h-[52px] flex items-center gap-2.5 text-left px-3.5 py-2.5 border-b border-[#EFE6D3] last:border-0 active:bg-[#F3EBDD]">
                <MapPin size={17} className="text-[#7D2E3B] shrink-0" />
                <span className="min-w-0">
                  <span className="block font-display font-semibold text-[15px] leading-tight truncate">{r.display_name.split(",")[0]}</span>
                  <span className="block text-[12.5px] text-[#8A7F72] truncate">{r.display_name}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && !busy && q.trim().length >= 3 && results.length === 0 && !failed && (
        <p className="absolute z-[30] inset-x-0 top-full mt-1.5 bg-[#FFFDF7] border border-[#E5DAC6] rounded-[4px] px-4 py-3 text-[14px] text-[#8A7F72]">No matches — try a nearby bigger place?</p>
      )}
    </div>
  );
}

export default function Places() {
  const { places, deletePlace, memories } = useApp();
  const [params] = useSearchParams();
  const [showNew, setShowNew] = useState(params.get("new") !== null);
  const [selected, setSelected] = useState<Place | null>(null);
  const [tap, setTap] = useState<{ lat: number; lng: number } | null>(null);
  // Prefill for the save sheet: from search (name + coords) or map tap (coords).
  const [draft, setDraft] = useState<PlaceDraft | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<L.Map | null>(null);

  // init map
  useEffect(() => {
    if (!mapRef.current || mapObj.current) return;
    const center: [number, number] = places.length ? [places[0].lat, places[0].lng] : [40.7128, -74.006];
    const map = L.map(mapRef.current, { zoomControl: false, attributionControl: true }).setView(center, places.length ? 10 : 4);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    map.on("click", (e: L.LeafletMouseEvent) => {
      const pos = { lat: Number(e.latlng.lat.toFixed(5)), lng: Number(e.latlng.lng.toFixed(5)) };
      setTap(pos);
      setDraft({ name: "", ...pos });
    });
    mapObj.current = map;
    return () => {
      map.remove();
      mapObj.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // markers
  useEffect(() => {
    const map = mapObj.current;
    if (!map) return;
    const layer = L.layerGroup().addTo(map);
    places.forEach((p) => {
      const icon = L.divIcon({
        className: "",
        html: `<div class="memory-pin"><span>♥</span></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 28],
      });
      const mk = L.marker([p.lat, p.lng], { icon });
      mk.on("click", () => setSelected(p));
      mk.addTo(layer);
    });
    if (places.length > 1) {
      const b = L.latLngBounds(places.map((p) => [p.lat, p.lng] as [number, number]));
      map.flyToBounds(b.pad(0.3), { duration: 0.6 });
    } else if (places.length === 1) {
      map.flyTo([places[0].lat, places[0].lng], 11, { duration: 0.6 });
    }
    return () => {
      layer.remove();
    };
  }, [places]);

  // Temporary dashed marker for a tapped / searched position.
  useEffect(() => {
    const map = mapObj.current;
    if (!map || !tap) return;
    const c = L.circleMarker([tap.lat, tap.lng], {
      radius: 10,
      color: "#7D2E3B",
      weight: 2,
      dashArray: "5 4",
      fillColor: "#7D2E3B",
      fillOpacity: 0.15,
    }).addTo(map);
    return () => {
      c.remove();
    };
  }, [tap]);

  const pickSearch = (d: PlaceDraft) => {
    setTap({ lat: d.lat, lng: d.lng });
    setDraft(d);
    mapObj.current?.flyTo([d.lat, d.lng], 13, { duration: 0.7 });
    setShowNew(true);
  };

  const memTitle = (id?: string | null) => memories.find((m) => m.id === id)?.title;

  return (
    <div className="pb-10">
      <div className="px-4 sm:px-6 max-w-4xl mx-auto pt-5 sm:pt-8">
        <SectionHeading kicker="little dots, big feelings" title="Our places" note={`${places.length} pinned`} action={
          <button onClick={() => setShowNew(true)} className="touch inline-flex items-center gap-1 bg-[#2B2622] text-[#FAF6EF] px-4 rounded-[3px] text-[14px] font-bold"><Plus size={15} /> Save</button>
        } />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <PlaceSearch onPick={pickSearch} />
        <p className="mt-1.5 text-[12px] text-[#B6AA99]">search by OpenStreetMap · or tap the map</p>
        <div className="mt-2 border border-[#E5DAC6] overflow-hidden rounded-[4px]">
          <div ref={mapRef} className="h-[340px] sm:h-[420px] w-full" />
        </div>
        <p className="mt-2 font-hand text-[19px] text-[#8A7F72] text-center">
          {tap ? `picked ${tap.lat}, ${tap.lng} — open Save to keep it ♡` : "search above, or tap the map — tap a ♥ to read it"}
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-5">
        {places.length === 0 ? (
          <Empty title="No pins yet" body="Save the bench, the café, the dock — anywhere that's yours." />
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {places.map((p, i) => (
              <button key={p.id} onClick={() => setSelected(p)} className={`touch text-left bg-[#FFFDF7] border border-[#E5DAC6] p-3.5 flex gap-3 items-start ${i % 2 ? "rotate-[0.4deg]" : "rotate-[-0.4deg]"}`}>
                {p.photo_url ? <img src={p.photo_url} alt="" className="w-[74px] h-[74px] object-cover shrink-0 border border-[#E5DAC6]" /> : <span className="w-[74px] h-[74px] grid place-items-center bg-[#F3EBDD] shrink-0"><MapPin className="text-[#8B5E3C]" /></span>}
                <span>
                  <span className="font-display font-semibold text-[16px] leading-tight block">{p.name}</span>
                  <span className="text-[13px] text-[#8A7F72] block line-clamp-2">{p.description || "—"}</span>
                  <span className="text-[12px] font-bold text-[#8B5E3C] uppercase tracking-wider">{p.date ? formatDate(p.date) : ""}{p.memory_id && memTitle(p.memory_id) ? ` · ${memTitle(p.memory_id)}` : ""}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* bottom sheet for selection (mobile-first) */}
      {selected && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
          <button aria-label="Close" onClick={() => setSelected(null)} className="absolute inset-0 bg-[#2B2622]/55" />
          <div className="relative w-full sm:max-w-md bg-[#FAF6EF] rounded-t-[14px] sm:rounded-[6px] border border-[#E5DAC6] overflow-hidden max-h-[86dvh] overflow-y-auto">
            <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-[#E5DAC6] sm:hidden" />
            {selected.photo_url && <img src={selected.photo_url} alt="" className="w-full h-[210px] object-cover" />}
            <div className="p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-[22px] font-semibold leading-tight">{selected.name}</h3>
                  <p className="text-[12.5px] font-bold uppercase tracking-[0.14em] text-[#8B5E3C] mt-0.5">{selected.date ? formatDate(selected.date) : "someday"} · {selected.lat.toFixed(3)}, {selected.lng.toFixed(3)}</p>
                </div>
                <button onClick={() => setSelected(null)} className="touch w-10 h-10 grid place-items-center border border-[#E5DAC6] rounded-full bg-white"><X size={17} /></button>
              </div>
              {selected.description && <p className="mt-2 text-[15px] leading-relaxed">{selected.description}</p>}
              {selected.memory_id && memTitle(selected.memory_id) && (
                <Link to={`/memories/${selected.memory_id}`} className="mt-3 inline-flex text-[14px] font-bold text-[#7D2E3B] underline">open linked memory: {memTitle(selected.memory_id)} →</Link>
              )}
              <div className="mt-4 flex gap-2">
                <a href={`https://www.openstreetmap.org/?mlat=${selected.lat}&mlon=${selected.lng}#map=15/${selected.lat}/${selected.lng}`} target="_blank" rel="noreferrer" className="touch flex-1 inline-flex items-center justify-center bg-[#2B2622] text-white rounded-[3px] font-bold text-[14.5px]">Directions</a>
                <button onClick={() => { if (confirm("Remove this place?")) { deletePlace(selected.id); setSelected(null); } }} className="touch px-4 inline-flex items-center gap-1.5 border border-[#E5DAC6] rounded-[3px] text-[14px] font-bold text-[#8A7F72]"><Trash2 size={15} /> Remove</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Sheet open={showNew} onClose={() => { setShowNew(false); setTap(null); setDraft(null); }} title="Save a place">
        <PlaceForm
          onDone={() => { setShowNew(false); setTap(null); setDraft(null); }}
          defaultName={draft?.name}
          defaultLat={draft?.lat ?? tap?.lat}
          defaultLng={draft?.lng ?? tap?.lng}
        />
      </Sheet>
    </div>
  );
}

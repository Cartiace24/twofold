import { useState } from "react";
import { Button, Field, Input, Textarea } from "../ui/primitives";
import { filesToDataUrls } from "../../lib/image";
import { todayISO } from "../../lib/format";
import { WISHLIST_CATEGORIES, type WishlistCategory } from "../../lib/types";
import { useApp } from "../../store/AppContext";
import { ImagePlus, Loader2 } from "lucide-react";

export function MemoryForm({ onDone, initialKind = "memory", initialPhotos }: { onDone: () => void; initialKind?: string; initialPhotos?: string[] }) {
  const { addMemory, user } = useApp();
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [date, setDate] = useState(todayISO());
  const [location, setLocation] = useState("");
  const [tags, setTags] = useState("");
  const [photos, setPhotos] = useState<string[]>(initialPhotos ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pick = async (files: FileList | null) => {
    if (!files) return;
    setBusy(true);
    try {
      const urls = await filesToDataUrls(files);
      setPhotos((p) => [...p, ...urls].slice(0, 6));
    } catch {
      setError("Couldn't read those photos. Try again?");
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!title.trim() && !caption.trim() && photos.length === 0) {
      setError("Give it a title, a line, or a photo — anything to remember it by.");
      return;
    }
    setBusy(true);
    try {
      await addMemory({
        title: title.trim() || (initialKind === "photo" ? "A little moment" : "Untitled memory"),
        caption: caption.trim(),
        date,
        location_label: location.trim(),
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        creator: user?.displayName || "You",
        favorite: false,
        photos: photos.map((url, i) => ({ id: `${Date.now()}-${i}`, url, sort: i })),
      });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save. Try again?");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <label className="block cursor-pointer">
        <input type="file" accept="image/*" multiple capture={initialKind === "photo" ? "environment" : undefined} className="hidden" onChange={(e) => pick(e.target.files)} />
        <span className="touch flex items-center justify-center gap-2 border border-dashed border-[#B6AA99] bg-[#FFFDF7] rounded-[4px] px-4 text-[15px] font-semibold text-[#4A423B]">
          {busy ? <Loader2 className="animate-spin" size={20} /> : <ImagePlus size={20} />}
          {photos.length ? `${photos.length} photo${photos.length > 1 ? "s" : ""} — tap to add more` : "Tap to add photos"}
        </span>
      </label>
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((u, i) => (
            <div key={i} className="relative">
              <img src={u} alt="" className="aspect-square object-cover w-full border border-[#E5DAC6]" />
              <button onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))} className="absolute top-1 right-1 bg-[#2B2622]/80 text-white text-[12px] px-2 py-1 rounded-[3px]">remove</button>
            </div>
          ))}
        </div>
      )}
      <Field label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Rainy Sunday, record player on" maxLength={80} /></Field>
      <Field label="Caption / story"><Textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="What made this one worth keeping?" rows={3} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Place"><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Home, Lisbon…" /></Field>
      </div>
      <Field label="Tags" hint="comma separated — e.g. home, slow days"><Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="home, date night" /></Field>
      {error && <p className="text-[14px] text-[#7D2E3B] font-semibold">{error}</p>}
      <Button onClick={submit} disabled={busy}>{busy ? "Saving…" : "Save memory ♡"}</Button>
    </div>
  );
}

export function NoteForm({ onDone }: { onDone: () => void }) {
  const { addNote, user } = useApp();
  const [body, setBody] = useState("");
  const [style, setStyle] = useState<"scrap" | "sticky" | "letter" | "index" | "journal">("journal");
  const [busy, setBusy] = useState(false);
  const styles: Array<{ id: typeof style; label: string; swatch: string }> = [
    { id: "journal", label: "Journal", swatch: "bg-[#FFFDF7] border-[#E5DAC6]" },
    { id: "sticky", label: "Sticky", swatch: "bg-[#FCE9A8] border-[#E8A838]/40" },
    { id: "letter", label: "Letter", swatch: "bg-[#F9E8E6] border-[#E8B4B8]" },
    { id: "scrap", label: "Scrap", swatch: "bg-[#F3EBDD] border-[#B6AA99]" },
    { id: "index", label: "Index", swatch: "bg-white border-[#B6AA99]" },
  ];
  return (
    <div className="flex flex-col gap-4">
      <Field label="Paper">
        <div className="flex flex-wrap gap-2">
          {styles.map((s) => (
            <button key={s.id} onClick={() => setStyle(s.id)} className={`touch px-4 border rounded-[3px] text-[14px] font-bold ${s.swatch} ${style === s.id ? "ring-2 ring-[#7D2E3B]/40" : ""}`}>{s.label}</button>
          ))}
        </div>
      </Field>
      <Field label="Note"><Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="I love the way you…" rows={5} maxLength={2000} /></Field>
      <Button disabled={!body.trim() || busy} onClick={async () => {
        setBusy(true);
        await addNote({ body: body.trim(), style, author: user?.displayName || "You", favorite: false, date_label: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }) });
        setBusy(false);
        onDone();
      }}>{busy ? "Tucking in…" : "Tuck it into the diary ♡"}</Button>
    </div>
  );
}

export function MilestoneForm({ onDone }: { onDone: () => void }) {
  const { addMilestone } = useApp();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayISO());
  const [desc, setDesc] = useState("");
  const [loc, setLoc] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <Field label="Milestone"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="We met, first trip…" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Where"><Input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="optional" /></Field>
      </div>
      <Field label="Story"><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="A sentence or two…" rows={3} /></Field>
      <Button disabled={!title.trim() || busy} onClick={async () => {
        setBusy(true);
        await addMilestone({ title: title.trim(), date, description: desc.trim(), location_label: loc.trim() });
        setBusy(false);
        onDone();
      }}>Pin to our story</Button>
    </div>
  );
}

export function PlaceForm({ onDone, defaultName, defaultLat, defaultLng }: { onDone: () => void; defaultName?: string; defaultLat?: number; defaultLng?: number }) {
  const { addPlace, memories } = useApp();
  const [name, setName] = useState(defaultName ?? "");
  const [desc, setDesc] = useState("");
  const [lat, setLat] = useState(defaultLat?.toFixed(4) ?? "40.7128");
  const [lng, setLng] = useState(defaultLng?.toFixed(4) ?? "-74.0060");
  const [memoryId, setMemoryId] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const allPhotos = memories.flatMap((m) => m.photos.map((p) => ({ url: p.url, memoryId: m.id, title: m.title })));
  return (
    <div className="flex flex-col gap-4">
      <Field label="Place name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Our bench, that café…" /></Field>
      <Field label="Why it matters"><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="What happened here?" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Lat"><Input inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} /></Field>
        <Field label="Lng"><Input inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} /></Field>
      </div>
      <Field label="Link a memory" hint="optional">
        <select value={memoryId} onChange={(e) => {
          const v = e.target.value;
          setMemoryId(v);
          if (v) {
            const m = memories.find((x) => x.id === v);
            if (m?.photos[0]?.url && !photoUrl) setPhotoUrl(m.photos[0].url);
          }
        }} className="touch w-full bg-[#FFFDF7] border border-[#E5DAC6] rounded-[3px] px-3 text-[15px]">
          <option value="">— none —</option>
          {memories.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
        </select>
      </Field>
      <Field label="Photo" hint={allPhotos.length ? "tap a memory photo to attach it" : "add memories with photos first"}>
        {allPhotos.length ? (
          <>
            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 py-1 snap-x">
              {allPhotos.slice(0, 12).map((p, i) => (
                <button
                  key={`${p.memoryId}-${i}`}
                  type="button"
                  onClick={() => {
                    setPhotoUrl(p.url);
                    setMemoryId(p.memoryId);
                  }}
                  className={`shrink-0 snap-start relative rounded-[3px] overflow-hidden border-2 ${photoUrl === p.url ? "border-[#7D2E3B]" : "border-[#E5DAC6]"}`}
                  aria-label={`Use photo from ${p.title}`}
                >
                  <img src={p.url} alt={p.title} className="w-[72px] h-[72px] object-cover" loading="lazy" />
                  {photoUrl === p.url && <span className="absolute inset-0 bg-[#7D2E3B]/15" aria-hidden />}
                </button>
              ))}
            </div>
            {photoUrl && (
              <div className="mt-2 flex items-center gap-2">
                <img src={photoUrl} alt="Selected" className="w-12 h-12 object-cover border border-[#E5DAC6] rounded-[3px]" />
                <span className="text-[13px] text-[#6B7F5E] font-semibold">selected ♡</span>
                <button type="button" onClick={() => setPhotoUrl(null)} className="text-[12px] underline text-[#8A7F72] ml-auto">clear</button>
              </div>
            )}
          </>
        ) : (
          <p className="text-[13px] text-[#B6AA99]">No memory photos yet — save a memory first.</p>
        )}
      </Field>
      <Button disabled={!name.trim() || busy} onClick={async () => {
        setBusy(true);
        await addPlace({ name: name.trim(), description: desc.trim(), lat: Number(lat) || 0, lng: Number(lng) || 0, date: todayISO(), photo_url: photoUrl, memory_id: memoryId || null });
        setBusy(false);
        onDone();
      }}>Save place</Button>
      <p className="text-[13px] text-[#8A7F72]">Tip: on the map, tap anywhere to pre-fill coordinates.</p>
    </div>
  );
}

export function WishForm({ onDone }: { onDone: () => void }) {
  const { addWish } = useApp();
  const [title, setTitle] = useState("");
  const [cat, setCat] = useState<WishlistCategory>("Experiences");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <Field label="Dream it"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Watch the sunrise together" /></Field>
      <Field label="Kind">
        <div className="flex flex-wrap gap-2">
          {WISHLIST_CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`touch px-3.5 border rounded-[3px] text-[13.5px] font-bold ${cat === c ? "bg-[#2B2622] text-[#FAF6EF] border-[#2B2622]" : "bg-[#FFFDF7] border-[#E5DAC6] text-[#4A423B]"}`}>{c}</button>
          ))}
        </div>
      </Field>
      <Field label="A little note" hint="optional"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="where / when / how" /></Field>
      <Button disabled={!title.trim() || busy} onClick={async () => {
        setBusy(true);
        await addWish(title.trim(), cat, note.trim() || undefined);
        setBusy(false);
        onDone();
      }}>Add to the list ♡</Button>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { useApp } from "../store/AppContext";
import { isValidHex, normalizeHex, BG_OPTIONS, THEME_PRESETS, themeFromCouple, themeToCouplePatch, themeCssVars, type CoupleTheme } from "../lib/theme";
import { Logo, Tape } from "../components/scrapbook/bits";
import { Button, Field, Input } from "../components/ui/primitives";

function PreviewCard({ theme }: { theme: CoupleTheme }) {
  // Use the same tokens as the global theme so the preview matches
  // exactly what saving would apply.
  const vars = themeCssVars(theme);

  return (
    <div className="paper-grain border border-[var(--twofold-border)] p-4" style={vars as React.CSSProperties}>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--twofold-muted)]">preview · {theme.name}</p>
      {/* nav mock */}
      <div className="mt-2 flex items-center justify-between">
        <span className="font-display font-semibold text-[14px]" style={{ color: "var(--twofold-text)" }}>twofold</span>
        <span className="px-2 py-1 rounded-[3px] text-[11px] font-bold" style={{ background: "var(--twofold-accent)", color: "var(--twofold-accent-text)" }}>Add</span>
      </div>
      <div className="mt-3 bg-[var(--twofold-surface)] border border-[var(--twofold-border)] p-3 flex gap-2 items-center">
        <div className="w-12 h-12 bg-[var(--twofold-bg)] border border-[var(--twofold-border)] grid place-items-center text-[var(--twofold-muted)]">♡</div>
        <div className="min-w-0">
          <p className="font-display font-semibold text-[14px] leading-none" style={{ color: "var(--twofold-text)" }}>Sunset at the lake</p>
          <p className="text-[11px] text-[var(--twofold-muted)]">Jul 4 · Lake Sebago</p>
          <p className="text-[12px] mt-1" style={{ color: "var(--twofold-text)" }}>A little moment worth keeping.</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button className="flex-1 py-2 rounded-[3px] font-bold text-[13px]" style={{ background: "var(--twofold-accent)", color: "var(--twofold-accent-text)", border: `1px solid var(--twofold-accent)` }}>Primary</button>
        <button className="flex-1 py-2 rounded-[3px] font-bold text-[13px] border" style={{ background: "var(--twofold-surface)", color: "var(--twofold-text)", borderColor: "var(--twofold-border)" }}>Secondary</button>
      </div>
      <div className="mt-3 flex items-center gap-2 text-[12px]" style={{ color: "var(--twofold-muted)" }}>
        <span className="w-2 h-2 rounded-full" style={{ background: "var(--twofold-secondary)" }} />
        secondary accent
        <span className="ml-auto text-[11px] font-bold uppercase tracking-[0.12em]">· {theme.preset}</span>
      </div>
    </div>
  );
}

export default function Appearance() {
  const { couple, updateCouple, usingDemo } = useApp();
  const initial = useMemo(() => themeFromCouple(couple), [couple]);
  const [draft, setDraft] = useState<CoupleTheme>(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => setDraft(initial), [initial]);

  const setPreset = (id: CoupleTheme["preset"]) => {
    const p = THEME_PRESETS.find((x) => x.id === id);
    if (!p) return;
    setDraft((d) => ({ ...d, preset: p.id, accent: p.accent, secondary: p.secondary, background: p.background }));
  };

  const updateHex = (key: "accent" | "secondary" | "background", val: string) => {
    const v = val.trim();
    if (!isValidHex(v)) {
      // allow typing, but don't update draft with invalid
      setDraft((d) => ({ ...d, [key]: v.toUpperCase() }));
      return;
    }
    setDraft((d) => ({ ...d, [key]: normalizeHex(v) }));
  };

  const isValid = isValidHex(draft.accent) && isValidHex(draft.secondary) && isValidHex(draft.background) && draft.name.trim().length > 0;

  const save = async () => {
    if (!isValid) {
      setErr("Fix the highlighted colors — use #RGB or #RRGGBB.");
      return;
    }
    setSaving(true);
    setErr("");
    setMsg("");
    try {
      const patch = themeToCouplePatch(draft);
      if (usingDemo) {
        // demo: persist via localStorage through AppContext's couple
        await updateCouple(patch);
      } else {
        await updateCouple(patch);
      }
      setMsg("Saved ♡ — you’ll both see it.");
      setTimeout(() => setMsg(""), 2500);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn’t save — try again?");
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setDraft(initial);
    setErr("");
    setMsg("");
  };

  if (!couple) return null;

  return (
    <div className="paper-grain min-h-dvh">
      <header className="max-w-[760px] mx-auto px-4 sm:px-6 pt-5 flex items-center justify-between">
        <Link to="/more" className="touch inline-flex items-center gap-1.5 text-[14px] font-bold text-[#8A7F72]">
          <ArrowLeft size={16} /> More
        </Link>
        <Link to="/" className="opacity-80">
          <Logo compact />
        </Link>
      </header>

      <main className="max-w-[760px] mx-auto px-4 sm:px-6 pb-16">
        <div className="relative mt-6 bg-[#FFFDF7] border border-[#E5DAC6] p-5 sm:p-6">
          <Tape className="left-1/2 -translate-x-1/2 -top-[11px]" />
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#8B5E3C]">appearance</p>
          <h1 className="font-display text-[28px] font-semibold tracking-tight leading-none mt-1">Make this space feel like yours.</h1>
          <p className="font-hand text-[18px] text-[#8A7F72] leading-tight mt-1">A few colors, one mood — still Twofold.</p>

          <div className="mt-6 grid lg:grid-cols-[1.05fr_0.95fr] gap-6">
            {/* controls */}
            <div className="flex flex-col gap-5 min-w-0">
              <Field label="Theme name" hint="12–32 chars, just a label">
                <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value.slice(0, 32) }))} placeholder="Our Space" maxLength={32} />
              </Field>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8B5E3C] mb-1.5">Preset</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {THEME_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPreset(p.id)}
                      className={`touch text-left p-3 rounded-[3px] border-2 transition ${draft.preset === p.id ? "border-[#2B2622]" : "border-[#E5DAC6] hover:border-[#B6AA99]"}`}
                      style={{ background: p.background, color: p.background === "#171615" ? "#FAF6EF" : "#2B2622" }}
                    >
                      <span className="font-display font-semibold text-[14px] leading-none block">{p.label}</span>
                      <span className="text-[11px] leading-tight block mt-1 opacity-80">{p.description}</span>
                      <span className="mt-2 flex gap-1.5">
                        <span className="w-5 h-5 rounded-full border border-black/10" style={{ background: p.accent }} />
                        <span className="w-5 h-5 rounded-full border border-black/10" style={{ background: p.secondary }} />
                        <span className="w-5 h-5 rounded-full border border-black/10" style={{ background: p.background }} />
                      </span>
                      {draft.preset === p.id && <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold"><Check size={12} /> selected</span>}
                    </button>
                  ))}
                </div>
              </div>

              <Field label="Accent" hint="primary buttons, active nav, links">
                <div className="flex items-center gap-2">
                  <input type="color" value={isValidHex(draft.accent) ? draft.accent : "#7D2E3B"} onChange={(e) => updateHex("accent", e.target.value)} className="touch w-12 h-12 p-1 border border-[#E5DAC6] rounded-[3px] bg-white" />
                  <Input value={draft.accent} onChange={(e) => updateHex("accent", e.target.value)} placeholder="#8B3A4A" className={`flex-1 font-mono ${!isValidHex(draft.accent) ? "border-[#7D2E3B] ring-2 ring-[#7D2E3B]/15" : ""}`} />
                  <span className="w-8 h-8 rounded-full border border-[#E5DAC6] shrink-0" style={{ background: isValidHex(draft.accent) ? draft.accent : "#transparent" }} aria-hidden />
                </div>
              </Field>

              <Field label="Secondary accent" hint="highlights, secondary accents">
                <div className="flex items-center gap-2">
                  <input type="color" value={isValidHex(draft.secondary) ? draft.secondary : "#B98282"} onChange={(e) => updateHex("secondary", e.target.value)} className="touch w-12 h-12 p-1 border border-[#E5DAC6] rounded-[3px] bg-white" />
                  <Input value={draft.secondary} onChange={(e) => updateHex("secondary", e.target.value)} placeholder="#B98282" className={`flex-1 font-mono ${!isValidHex(draft.secondary) ? "border-[#7D2E3B] ring-2 ring-[#7D2E3B]/15" : ""}`} />
                  <span className="w-8 h-8 rounded-full border border-[#E5DAC6] shrink-0" style={{ background: isValidHex(draft.secondary) ? draft.secondary : "transparent" }} aria-hidden />
                </div>
              </Field>

              <Field label="Background" hint="keep it subtle">
                <div className="flex flex-wrap gap-2">
                  {BG_OPTIONS.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, background: b.value }))}
                      className={`touch px-3.5 py-2 rounded-[3px] border-2 text-[13px] font-bold ${draft.background.toUpperCase() === b.value ? "border-[#2B2622]" : "border-[#E5DAC6]"}`}
                      style={{ background: b.value, color: b.value === "#171615" ? "#FAF6EF" : "#2B2622" }}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input type="color" value={isValidHex(draft.background) ? draft.background : "#FAF6EF"} onChange={(e) => updateHex("background", e.target.value)} className="touch w-12 h-12 p-1 border border-[#E5DAC6] rounded-[3px] bg-white" />
                  <Input value={draft.background} onChange={(e) => updateHex("background", e.target.value)} placeholder="#FAF6EF" className={`flex-1 font-mono ${!isValidHex(draft.background) ? "border-[#7D2E3B] ring-2 ring-[#7D2E3B]/15" : ""}`} />
                </div>
              </Field>

              {err && <p className="text-[13px] font-semibold text-[#7D2E3B]" role="alert">{err}</p>}
              {msg && <p className="font-hand text-[18px] text-[#6B7F5E]">{msg}</p>}

              <div className="flex gap-2">
                <Button variant="secondary" onClick={cancel} disabled={saving} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={save} disabled={saving || !isValid} className="flex-1">
                  {saving ? "Saving…" : "Save Changes"}
                </Button>
              </div>
              <p className="text-[11px] text-[#8A7F72] leading-relaxed">Changing the theme updates the shared space for both of you. No gradients, no neon — just Twofold, but yours.</p>
            </div>

            {/* live preview */}
            <div className="lg:sticky lg:top-6 self-start">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8B5E3C] mb-2">Live preview</p>
              <PreviewCard theme={draft} />
              <p className="mt-2 text-[11px] text-[#8A7F72] text-center">Preview updates as you tweak — save to keep it.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

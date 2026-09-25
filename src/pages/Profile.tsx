import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, ChevronRight, ImagePlus, Loader2, LogOut, Palette, Trash2, LogOutIcon, UserX } from "lucide-react";
import { useApp } from "../store/AppContext";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";
import { daysTogether, formatDate, formatDays, todayISO } from "../lib/format";
import { Button, Field, Input } from "../components/ui/primitives";
import { InviteCodeCard } from "../components/InviteCode";
import { SectionHeading, Tape } from "../components/scrapbook/bits";
import { Avatar } from "../components/profile/Avatar";
import { CropSheet } from "../components/profile/CropSheet";
import { filesToDataUrls } from "../lib/image";

export default function Profile() {
  const {
    couple,
    updateCouple,
    regenerateCode,
    signOut,
    leaveCouple,
    deleteCouple,
    deleteAccount,
    isOwner,
    memories,
    notes,
    places,
    usingDemo,
    profile,
    partnerProfile,
    avatarUrl,
    partnerAvatarUrl,
    avatarBusy,
    avatarError,
    uploadAvatar,
    removeAvatar,
    profileLoading,
    refreshProfiles,
    user,
  } = useApp();
  const [name, setName] = useState(couple?.name ?? "");
  const [since, setSince] = useState(couple?.together_since ?? todayISO());
  const [desc, setDesc] = useState(couple?.description ?? "");
  const [accent, setAccent] = useState(couple?.accent ?? "#7D2E3B");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);
  const [dangerBusy, setDangerBusy] = useState<string | null>(null);
  const [dangerErr, setDangerErr] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteTyped, setDeleteTyped] = useState("");
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameBusy, setNameBusy] = useState(false);
  const [nameError, setNameError] = useState("");
  const [nameSaved, setNameSaved] = useState("");

  const startNameEdit = () => {
    setNameDraft(profile?.display_name || user?.displayName || "");
    setNameError("");
    setNameSaved("");
    setEditingName(true);
  };

  const saveName = async () => {
    const clean = nameDraft.trim().slice(0, 40);
    if (!clean) {
      setNameError("Give yourself a name — a word or two is plenty.");
      return;
    }
    if (clean.includes("@")) {
      setNameError("Use a display name, not your email.");
      return;
    }
    if (!user) return;
    setNameBusy(true);
    setNameError("");
    try {
      if (isSupabaseConfigured) {
        const sb = getSupabase();
        if (!sb) throw new Error("Not connected — try again?");
        const { error } = await sb
          .from("profiles")
          .upsert({ id: user.id, email: user.email, display_name: clean }, { onConflict: "id" });
        if (error) throw new Error(error.message);
        // Best-effort: keep auth metadata in sync for future sessions.
        try {
          await sb.auth.updateUser({ data: { display_name: clean } });
        } catch {
          /* profiles row is the source of truth; metadata is a bonus */
        }
      }
      await refreshProfiles();
      setEditingName(false);
      setNameSaved("Saved ♡");
      window.setTimeout(() => setNameSaved(""), 2500);
    } catch (e) {
      setNameError(e instanceof Error ? e.message : "Couldn't save — try again?");
    } finally {
      setNameBusy(false);
    }
  };
  const accentTimer = useRef<number | null>(null);
  useEffect(() => () => {
    if (accentTimer.current) window.clearTimeout(accentTimer.current);
  }, []);
  useEffect(() => {
    if (couple?.accent) setAccent(couple.accent);
  }, [couple?.accent]);

  const changeAccent = (value: string) => {
    setAccent(value);
    if (accentTimer.current) window.clearTimeout(accentTimer.current);
    accentTimer.current = window.setTimeout(() => {
      updateCouple({ accent: value });
    }, 400);
  };

  if (!couple) return null;

  const save = async () => {
    setBusy(true);
    await updateCouple({ name: name.trim() || couple.name, together_since: since, description: desc.trim() });
    setBusy(false);
    setSaved("Saved ♡ — your diary updated.");
    setTimeout(() => setSaved(""), 2500);
  };

  const pickCover = async (files: FileList | null) => {
    if (!files?.length) return;
    const urls = await filesToDataUrls(files);
    if (urls[0]) await updateCouple({ cover_url: urls[0] });
  };

  const handlePick = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      // handled in uploadAvatar, but give quick feedback
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      return;
    }
    const url = URL.createObjectURL(f);
    setCropSrc(url);
    setCropOpen(true);
  };

  const handleCropSave = async (blob: Blob) => {
    setCropOpen(false);
    const r = await uploadAvatar(blob);
    if (cropSrc) {
      URL.revokeObjectURL(cropSrc);
      setCropSrc(null);
    }
    if (r.error) {
      // error already in avatarError
    }
  };

  const handleCropCancel = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setCropOpen(false);
  };

  const handleRemove = async () => {
    if (!confirm("Remove your profile photo?")) return;
    await removeAvatar();
  };

  return (
    <div className="px-4 sm:px-6 max-w-2xl mx-auto pb-16">
      <div className="pt-5 sm:pt-8"><SectionHeading kicker="the inside cover" title="This book belongs to us" note="written in pencil, naturally" /></div>

      <div className="relative mt-2 border border-[#E5DAC6] bg-[#FFFDF7] overflow-hidden">
        <div className="h-[150px] sm:h-[190px] bg-[#EDE6D6] relative">
          {couple.cover_url && <img src={couple.cover_url} alt="Couple cover" className="w-full h-full object-cover" />}
          <label className="absolute bottom-2 right-2 cursor-pointer bg-[#2B2622]/85 text-white text-[12.5px] font-bold px-3 py-2 rounded-[3px]">
            change cover
            <input type="file" accept="image/*" className="hidden" onChange={(e) => pickCover(e.target.files)} />
          </label>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-3 -mt-12 relative z-10">
            <span className="w-[72px] h-[72px] rounded-full border-[3px] border-[#FFFDF7] overflow-hidden bg-[#F3EBDD] shadow grid place-items-center font-display font-bold text-[22px]">
              {couple.avatar_a_url ? <img src={couple.avatar_a_url} alt="" className="w-full h-full object-cover" /> : (couple.name[0] || "T")}
            </span>
            <div>
              <h2 className="font-display text-[24px] font-semibold leading-none">{couple.name}</h2>
              <p className="text-[13px] font-bold mt-1" style={{ color: accent }}>{formatDays(daysTogether(couple.together_since))} days · since {formatDate(couple.together_since)}</p>
              <span className="inline-block mt-1.5 h-1.5 w-16 rounded-full" style={{ background: accent, opacity: 0.9 }} aria-hidden />
            </div>
          </div>

          <div className="mt-4 border-y border-dashed border-[#B6AA99] py-3.5 px-2 text-center">
            <p className="font-hand text-[23px] leading-tight text-[#4A423B]">this book belongs to the two of us —</p>
            {couple.description ? (
              <p className="font-hand text-[21px] leading-snug text-[#7D2E3B] mt-1">“{couple.description}”</p>
            ) : (
              <p className="font-hand text-[20px] text-[#B6AA99] mt-1">write a line about you two below ♡</p>
            )}
            <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#8A7F72]">handle with love · est. {formatDate(couple.together_since)}</p>
          </div>

          {/* personal profile pictures — you & partner */}
          <div className="mt-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8B5E3C] mb-2">who’s who — your faces ♡</p>
            {profileLoading ? (
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="paper-card p-4 animate-pulse h-[140px]" />
                <div className="paper-card p-4 animate-pulse h-[140px]" />
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {/* you */}
                <div className="paper-card p-4 relative rotate-[-0.4deg]">
                  <Tape className="left-1/2 -translate-x-1/2 -top-[8px] w-[56px] rotate-[-2deg]" />
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#7D2E3B]">You — {user?.displayName ?? "You"}</p>
                  <div className="mt-2 flex gap-3 items-start">
                    <Avatar src={avatarUrl} name={profile?.display_name || user?.displayName} size={84} frame="square" />
                    <div className="flex-1 min-w-0">
                      {!editingName ? (
                        <>
                          <p className="font-display font-semibold text-[15px] leading-tight truncate">{profile?.display_name || user?.displayName}</p>
                          <p className="text-[11px] text-[#8A7F72] truncate">{user?.email}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <p className="font-hand text-[16px] text-[#8A7F72] leading-none">your profile</p>
                            {!usingDemo && (
                              <button
                                onClick={startNameEdit}
                                aria-label="Edit display name"
                                className="touch text-[12px] font-bold text-[#7D2E3B] underline px-2"
                              >
                                Edit name
                              </button>
                            )}
                          </div>
                          {nameSaved && <p className="font-hand text-[17px] text-[#6B7F5E]">{nameSaved}</p>}
                        </>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          <Field label="Display name" hint="shown across Twofold, never your email">
                            <Input
                              value={nameDraft}
                              onChange={(e) => setNameDraft(e.target.value.slice(0, 40))}
                              placeholder="e.g. Hope"
                              maxLength={40}
                              autoFocus
                            />
                          </Field>
                          {nameError && <p className="text-[12px] font-semibold text-[#7D2E3B]" role="alert">{nameError}</p>}
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingName(false)}
                              disabled={nameBusy}
                              className="touch flex-1 bg-[#FFFDF7] border border-[#E5DAC6] rounded-[3px] font-bold text-[13px] text-[#4A423B] disabled:opacity-60"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={saveName}
                              disabled={nameBusy}
                              className="touch flex-1 bg-[#2B2622] text-[#FAF6EF] rounded-[3px] font-bold text-[13px] disabled:opacity-60"
                            >
                              {nameBusy ? "Saving…" : "Save"}
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="mt-2 flex flex-col gap-1.5">
                        <label className="touch inline-flex items-center justify-center gap-1.5 bg-[#2B2622] text-[#FAF6EF] px-3 py-2 rounded-[3px] text-[12px] font-bold cursor-pointer active:scale-[0.98]">
                          {avatarBusy ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                          {avatarBusy ? "Uploading…" : avatarUrl ? "Change photo" : "Choose photo"}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={(e) => handlePick(e.target.files)}
                          />
                        </label>
                        {/* take photo via camera — capture attribute */}
                        <label className="touch inline-flex items-center justify-center gap-1.5 bg-[#FFFDF7] border border-[#E5DAC6] px-3 py-1.5 rounded-[3px] text-[11px] font-bold cursor-pointer">
                          <ImagePlus size={12} /> Take photo
                          <input type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => handlePick(e.target.files)} />
                        </label>
                        {avatarUrl && (
                          <button
                            type="button"
                            onClick={handleRemove}
                            disabled={avatarBusy}
                            className="touch text-[11px] underline text-[#8A7F72] font-bold text-left"
                            aria-label="Remove profile photo"
                          >
                            Remove photo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  {avatarError && <p className="mt-2 text-[12px] font-semibold text-[#7D2E3B]" role="alert">{avatarError}</p>}
                  {avatarBusy && <p className="mt-1 font-hand text-[18px] text-[#8A7F72]">Uploading photo…</p>}
                </div>

                {/* partner */}
                <div className="paper-card p-4 relative rotate-[0.5deg] bg-[#F9E8E6] border-[#E8B4B8]/50">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B7F5E]">Your partner</p>
                  <div className="mt-2 flex gap-3 items-center">
                    <Avatar src={partnerAvatarUrl} name={partnerProfile?.display_name} size={84} frame="polaroid" />
                    <div className="min-w-0">
                      <p className="font-display font-semibold text-[15px] leading-tight truncate">{partnerProfile?.display_name ?? "—"}</p>
                      <p className="font-hand text-[16px] text-[#8A7F72] leading-none mt-1">{partnerProfile ? "with you ♡" : "not yet joined"}</p>
                    </div>
                  </div>
                  {!partnerProfile && <p className="mt-2 text-[12px] text-[#8A7F72]">Share your invite code to see them here.</p>}
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8B5E3C] -mb-1">the details · pencil welcome</p>
            <Field label="Couple name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Together since"><Input type="date" value={since} max={todayISO()} onChange={(e) => setSince(e.target.value)} /></Field>
              <Field label="Accent" hint="kept subtle, always twofold"><Input type="color" value={accent} onChange={(e) => changeAccent(e.target.value)} className="h-[48px] p-1.5" /></Field>
            </div>
            <Field label="Short description"><Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Two lives, one story…" /></Field>
            {saved && <p className="font-hand text-[20px] text-[#6B7F5E]">{saved}</p>}
            <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save profile"}</Button>
          </div>
        </div>
      </div>

      {/* invite — now using the shared accessible card */}
      <InviteCodeCard code={couple.invite_code} onRegenerate={regenerateCode} />

      <Link to="/appearance" className="mt-4 flex items-center gap-3 bg-[var(--twofold-surface)] border border-[var(--twofold-border)] p-4 active:scale-[0.98] transition touch">
        <span className="w-10 h-10 grid place-items-center bg-[var(--twofold-bg)] border border-[var(--twofold-border)] rounded-[3px] text-[var(--twofold-accent)]">
          <Palette size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="font-display font-semibold text-[16px] leading-none block">Appearance</span>
          <span className="text-[13px] text-[var(--twofold-muted)] block">colors & mood for your space</span>
        </span>
        <ChevronRight size={16} className="text-[var(--twofold-muted)]/60" />
      </Link>

      {/* stats */}
      <p className="font-hand text-[21px] text-[#8A7F72] text-center mt-5">collected so far ♡</p>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        {[["memories", memories.length], ["notes", notes.length], ["places", places.length]].map(([l, n]) => (
          <div key={l as string} className="paper-card py-4">
            <div className="font-display font-bold text-[24px]">{n}</div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8A7F72]">{l}</div>
          </div>
        ))}
      </div>

      {usingDemo && (
        <p className="mt-4 text-[13px] text-[#8A7F72] bg-[#FFFDF7] border border-dashed border-[#B6AA99] p-3 rounded-[3px]">Demo mode — everything is stored on this device. Add your Supabase URL + key in <code>.env</code> to go live (see README).</p>
      )}

      <button onClick={signOut} className="touch mt-6 w-full inline-flex items-center justify-center gap-2 border border-[#E8B4B8] text-[#7D2E3B] font-bold rounded-[3px] py-3 bg-[#FFFDF7]"><LogOut size={17} /> Log out</button>

      {/* danger zone — scrapbook drawer note, not a SaaS warning wall */}
      <div className="mt-8 border border-dashed border-[#E8B4B8]/60 bg-[#FFFEFA] p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7D2E3B]">Careful — paper tears</p>
        <h3 className="font-display text-[18px] font-semibold tracking-tight mt-1">Manage this book</h3>
        <p className="text-[13px] text-[#8A7F72] mt-1 leading-relaxed">
          Leave the couple, delete everything here, or delete your account entirely. Photos in <code>memory_photos</code> are cascade-deleted; any
          <code> couple-photos</code> Storage objects are best-effort removed.
        </p>
        {dangerErr && <p className="mt-3 text-[13px] font-semibold text-[#7D2E3B]">{dangerErr}</p>}

        <div className="mt-4 flex flex-col gap-2.5">
          <button
            disabled={!!dangerBusy}
            onClick={async () => {
              if (!confirm("Leave this couple? You can rejoin with an invite code.")) return;
              setDangerBusy("leave");
              setDangerErr("");
              const r = await leaveCouple();
              setDangerBusy(null);
              if (r.error) setDangerErr(r.error);
            }}
            className="touch w-full inline-flex items-center justify-center gap-2 bg-[#FFFDF7] border border-[#E5DAC6] font-bold rounded-[3px] text-[14px] text-[#4A423B] disabled:opacity-60"
          >
            {dangerBusy === "leave" ? "Leaving…" : <><LogOutIcon size={16} /> Leave couple</>}
          </button>

          <button
            disabled={!!dangerBusy}
            onClick={async () => {
              const msg = isOwner
                ? "Delete this couple and ALL its memories, notes, places and photos? This cannot be undone."
                : "Only the owner can delete the whole couple. You can leave instead.";
              if (!isOwner) {
                setDangerErr(msg);
                return;
              }
              if (!confirm(msg)) return;
              if (prompt("Type DELETE to confirm") !== "DELETE") return;
              setDangerBusy("couple");
              setDangerErr("");
              const r = await deleteCouple();
              setDangerBusy(null);
              if (r.error) setDangerErr(r.error);
            }}
            className="touch w-full inline-flex items-center justify-center gap-2 bg-[#FFFDF7] border border-[#E8B4B8] text-[#7D2E3B] font-bold rounded-[3px] text-[14px] disabled:opacity-60"
            title={isOwner ? "Delete the couple and all its data" : "Owner only"}
          >
            {dangerBusy === "couple" ? "Deleting…" : <><Trash2 size={16} /> Delete couple + all data</>}
            {!isOwner && <span className="ml-1 text-[11px] text-[#B6AA99]">(owner only)</span>}
          </button>

          <div className="border-t border-dashed border-[#E5DAC6] my-1" />

          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="touch w-full inline-flex items-center justify-center gap-2 bg-[#7D2E3B] text-[#FAF6EF] font-bold rounded-[3px] text-[14px]"
            >
              <UserX size={16} /> Delete my account
            </button>
          ) : (
            <div className="bg-[#F9E8E6] border border-[#E8B4B8]/50 p-3 rounded-[3px]">
              <p className="text-[13px] font-bold text-[#7D2E3B]">Delete your account forever?</p>
              <p className="text-[12.5px] text-[#4A423B] mt-1">This removes your login, your membership, and — via cascade — orphaned couples and their photos. Type <strong>DELETE</strong> to confirm.</p>
              <Input value={deleteTyped} onChange={(e) => setDeleteTyped(e.target.value)} placeholder="DELETE" className="mt-2 font-mono text-[13px]" />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => { setConfirmDelete(false); setDeleteTyped(""); }}
                  className="touch flex-1 bg-[#FFFDF7] border border-[#E5DAC6] rounded-[3px] font-bold text-[13px]"
                >
                  Cancel
                </button>
                <button
                  disabled={dangerBusy === "account" || deleteTyped !== "DELETE"}
                  onClick={async () => {
                    setDangerBusy("account");
                    setDangerErr("");
                    const r = await deleteAccount();
                    setDangerBusy(null);
                    if (r.error) setDangerErr(r.error);
                    else { setConfirmDelete(false); setDeleteTyped(""); }
                  }}
                  className="touch flex-1 bg-[#7D2E3B] text-white rounded-[3px] font-bold text-[13px] disabled:opacity-60"
                >
                  {dangerBusy === "account" ? "Deleting…" : "Yes, delete"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 text-center text-[12.5px] text-[#8A7F72] leading-relaxed">
        <Link to="/terms" className="underline text-[#7D2E3B] font-bold">Terms</Link>
        <span className="mx-1.5 text-[#B6AA99]">·</span>
        <Link to="/privacy" className="underline text-[#7D2E3B] font-bold">Privacy</Link>
        <span className="mx-1.5 text-[#B6AA99]">·</span>
        <Link to="/guidelines" className="underline text-[#7D2E3B] font-bold">Guidelines</Link>
        <span className="mx-1 block mt-1 font-hand text-[16px]">Two Lives, one story — handle with love.</span>
      </div>

      <CropSheet open={cropOpen} src={cropSrc ?? ""} onCancel={handleCropCancel} onSave={handleCropSave} />
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, RefreshCw, SwitchCamera, Users } from "lucide-react";
import { useApp } from "../../store/AppContext";
import { getSupabase } from "../../lib/supabase";
import { todayISO } from "../../lib/format";
import { Button, Sheet } from "../ui/primitives";
import { FilterTabs, Tape } from "../scrapbook/bits";
import { MemoryForm } from "../forms/forms";
import { ADJUST_DEFAULTS, BOOTH_PRESETS } from "./filters";
import {
  blobToFinalDataUrl,
  canvasToJpeg,
  composeTogetherStripCanvas,
  decodeToCanvas,
  grabFrame,
  gradePhotoCanvas,
  resolveGrade,
} from "./render";
import { useCamera, type Facing } from "./useCamera";
import { partnerStale, useTogetherSession } from "./useTogetherSession";

function wait(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

/** Long-distance mode: two devices, one shared moment. Local camera only —
 *  no video is streamed. Sync happens through the session row (realtime):
 *  join → ready → shared capture_at countdown → each captures locally →
 *  both photos land in the row → each composes the same strip locally. */
export default function TogetherBooth({ onBack }: { onBack: () => void }) {
  const { user, couple, partnerProfile, addMemory } = useApp();
  const nav = useNavigate();
  const sb = getSupabase();
  const myName = user?.displayName ?? "You";
  const partnerLabel = partnerProfile?.display_name || "your person";

  const t = useTogetherSession(sb, couple?.id ?? null, user?.id ?? null, myName);
  const { session, role } = t;

  const [facing, setFacing] = useState<Facing>("user");
  const [presetId, setPresetId] = useState("softfilm");
  const [count, setCount] = useState<number | null>(null);
  const [flashOn, setFlashOn] = useState(false);
  const [pageError, setPageError] = useState("");
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const [showSave, setShowSave] = useState(false);
  const [saveView, setSaveView] = useState<"choice" | "memory">("choice");
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [finalDataUrl, setFinalDataUrl] = useState<string | null>(null);

  // Camera stays off in the lobby — it starts once a session exists.
  const { videoRef, status: camStatus, detail: camDetail, restart: camRestart } = useCamera(facing, !!session);
  const mirror = facing === "user";
  const cameraOk = camStatus === "ready";

  const capturedRef = useRef<string | null>(null);
  const composingRef = useRef(false);
  const resultBlobRef = useRef<Blob | null>(null);
  const leaveRef = useRef(t.leaveQuietly);
  leaveRef.current = t.leaveQuietly;
  // doCapture is memoized but needs the latest session/upload — refs avoid
  // a stale closure that would silently swallow the capture.
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const uploadPhotoRef = useRef(t.uploadPhoto);
  uploadPhotoRef.current = t.uploadPhoto;

  const ownReady = role === "creator" ? session?.creator_ready : session?.partner_ready;
  const otherReady = role === "creator" ? session?.partner_ready : session?.creator_ready;
  const otherName = role === "creator" ? session?.partner_name || partnerLabel : session?.creator_name || "your person";
  const stale = !!session && !!role && partnerStale(session, role) && !resultUrl;

  // Leave quietly when navigating away mid-session.
  useEffect(() => {
    return () => {
      void leaveRef.current();
    };
  }, []);

  // New session → reset capture/compose guards.
  useEffect(() => {
    capturedRef.current = null;
    composingRef.current = false;
  }, [session?.id]);

  // Partner hit retake (or a fresh round started) → both clients return to
  // the ready view instead of lingering on a stale result.
  useEffect(() => {
    if (
      session &&
      session.status === "ready" &&
      !session.creator_photo &&
      !session.partner_photo &&
      resultUrl
    ) {
      URL.revokeObjectURL(resultUrl);
      setResultUrl(null);
      resultBlobRef.current = null;
      capturedRef.current = null;
      composingRef.current = false;
      setCount(null);
      setPageError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.status, session?.creator_photo, session?.partner_photo]);

  // Camera up → I'm ready (auto: init success is the signal).
  useEffect(() => {
    if (!session || !role || ownReady || resultUrl) return;
    if (!cameraOk) return;
    if (!["joined", "ready"].includes(session.status)) return;
    void t.markReady();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, session?.status, role, ownReady, cameraOk, resultUrl]);

  const doCapture = useCallback(async () => {
    const video = videoRef.current;
    const s = sessionRef.current;
    if (!video || !s) {
      setPageError("Couldn't grab that frame — try retake?");
      return;
    }
    setPageError("");
    setFlashOn(true);
    await wait(280);
    try {
      const src = grabFrame(video, mirror);
      if (!src) throw new Error("camera not ready");
      const preset = BOOTH_PRESETS.find((p) => p.id === s.preset_id) ?? BOOTH_PRESETS[0];
      const graded = gradePhotoCanvas(src, resolveGrade(preset, 100, ADJUST_DEFAULTS));
      const blob = await canvasToJpeg(graded);
      const url = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.onerror = rej;
        r.readAsDataURL(blob);
      });
      await uploadPhotoRef.current(url);
    } catch {
      setPageError("Couldn't grab that frame — try retake?");
    } finally {
      setFlashOn(true);
      await wait(160);
      setFlashOn(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoRef, mirror]);

  // Shared countdown: both devices count to session.capture_at on their own clocks.
  useEffect(() => {
    if (!session || session.status !== "countdown" || !session.capture_at) {
      if (!session?.capture_at) capturedRef.current = null;
      return;
    }
    if (capturedRef.current === session.capture_at) return;
    const target = new Date(session.capture_at).getTime();
    const id = window.setInterval(() => {
      const remain = Math.ceil((target - Date.now()) / 1000);
      setCount(remain > 0 ? remain : 0);
      if (target - Date.now() <= 0) {
        window.clearInterval(id);
        if (capturedRef.current !== session.capture_at) {
          capturedRef.current = session.capture_at;
          void doCapture();
        }
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [session?.status, session?.capture_at, doCapture]);

  // Both photos in → compose the shared strip locally.
  useEffect(() => {
    if (!session?.creator_photo || !session?.partner_photo || resultUrl || composingRef.current) return;
    composingRef.current = true;
    void (async () => {
      try {
        const [cb, pb] = await Promise.all([
          fetch(session.creator_photo as string).then((r) => r.blob()),
          fetch(session.partner_photo as string).then((r) => r.blob()),
        ]);
        const [cc, pc] = await Promise.all([decodeToCanvas(cb), decodeToCanvas(pb)]);
        const strip = await composeTogetherStripCanvas(
          cc,
          pc,
          session.creator_name || "you",
          session.partner_name || partnerLabel
        );
        const blob = await canvasToJpeg(strip);
        resultBlobRef.current = blob;
        setResultUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
        setCount(null);
      } catch {
        setPageError("Couldn't develop the strip — try retake?");
      } finally {
        composingRef.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.creator_photo, session?.partner_photo]);

  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  const handleRetake = () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    resultBlobRef.current = null;
    capturedRef.current = null;
    composingRef.current = false;
    setCount(null);
    setPageError("");
    void t.retake();
  };

  const openSave = async () => {
    const blob = resultBlobRef.current;
    if (!blob) return;
    setSaveError("");
    try {
      setFinalDataUrl(await blobToFinalDataUrl(blob));
      setSaveView("choice");
      setShowSave(true);
    } catch {
      setSaveError("Couldn't get that photo ready — try retaking?");
    }
  };

  const savePhotoOnly = async () => {
    if (!finalDataUrl || saveBusy) return;
    setSaveBusy(true);
    setSaveError("");
    try {
      const id = await addMemory({
        title: "Photo together",
        caption: "together, even from miles away ♡",
        date: todayISO(),
        location_label: "",
        tags: ["photobooth", "together"],
        creator: myName,
        favorite: false,
        photos: [{ id: `${Date.now()}-0`, url: finalDataUrl, caption: "", sort: 0 }],
      });
      setShowSave(false);
      nav(`/memories/${id}`);
    } catch {
      setSaveError("Couldn't save — check connection and try again?");
    } finally {
      setSaveBusy(false);
    }
  };

  const handleDone = () => {
    void t.endSession().then(() => onBack());
  };

  /* ---------- demo / logged-out guard ---------- */

  if (!sb || !couple || !user) {
    return (
      <div className="min-h-dvh flex flex-col bg-[#FAF6EF] max-w-xl mx-auto">
        <header className="flex items-center gap-2 px-3 pt-[calc(0.6rem+env(safe-area-inset-top))] pb-2 border-b border-[#E5DAC6]">
          <button onClick={onBack} aria-label="Back to photobooth" className="touch w-12 h-12 grid place-items-center text-[#4A423B]">
            <ArrowLeft size={24} />
          </button>
          <p className="font-display font-semibold text-[19px] tracking-tight">photo together</p>
        </header>
        <div className="flex-1 grid place-items-center px-6 py-10 text-center">
          <div>
            <Users size={36} className="mx-auto text-[#8B5E3C]" />
            <h2 className="font-display font-semibold text-[24px] mt-3">two phones, one moment</h2>
            <p className="text-[14.5px] text-[#4A423B] mt-2 max-w-[36ch]">
              Taking a photo together needs a live connection so both sides stay in sync. Connect Twofold to Supabase and sign in to use it — the solo booth works fine offline.
            </p>
            <Button variant="secondary" onClick={onBack} className="mt-5">
              Back to the booth
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- ended / expired ---------- */

  if (!session && !resultUrl && t.ended) {
    return (
      <div className="min-h-dvh flex flex-col bg-[#FAF6EF] max-w-xl mx-auto">
        <header className="flex items-center gap-2 px-3 pt-[calc(0.6rem+env(safe-area-inset-top))] pb-2 border-b border-[#E5DAC6]">
          <button onClick={onBack} aria-label="Back to photobooth" className="touch w-12 h-12 grid place-items-center text-[#4A423B]">
            <ArrowLeft size={24} />
          </button>
          <p className="font-display font-semibold text-[19px] tracking-tight">photo together</p>
        </header>
        <div className="flex-1 grid place-items-center px-6 py-10 text-center">
          <div>
            <p className="font-hand text-[26px] text-[#8A7F72]">
              {t.ended === "expired" ? "that moment expired…" : t.ended === "ended" ? "your person ended the session" : "session over"}
            </p>
            <p className="text-[14px] text-[#4A423B] mt-1">Nothing saved, nothing lost.</p>
            <Button onClick={onBack} className="mt-5">
              Back to the booth
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- result ---------- */

  if (resultUrl) {
    return (
      <div className="min-h-dvh flex flex-col bg-[#FAF6EF] max-w-xl mx-auto">
        <div className="flex-1 flex flex-col px-4 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] max-w-md w-full mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#8B5E3C] text-center">photo together</p>
          <h2 className="font-display text-[26px] font-semibold tracking-tight text-center">you're together, even from miles away ♡</h2>
          <div className="relative mt-4 self-center max-w-full">
            <Tape className="left-1/2 -translate-x-1/2 -top-[11px] rotate-[-4deg] z-10" />
            <img src={resultUrl} alt="Finished together photo strip" className="block border border-[#E5DAC6] shadow-md max-h-[52dvh] w-auto mx-auto" />
          </div>
          {t.ended === "ended" && (
            <p className="mt-3 text-[13.5px] text-[#8A7F72] text-center">Your person left — your copy is safe above.</p>
          )}
          {saveError && <p className="mt-3 text-[14px] font-semibold text-[#7D2E3B] text-center">{saveError}</p>}
          <div className="mt-5 grid grid-cols-3 gap-2">
            {session ? (
              <button
                onClick={handleRetake}
                className="touch inline-flex items-center justify-center gap-1.5 bg-[#FFFDF7] border border-[#E5DAC6] rounded-[3px] font-bold text-[15px] text-[#4A423B]"
              >
                <RefreshCw size={17} /> Retake
              </button>
            ) : (
              <span aria-hidden />
            )}
            <button
              onClick={openSave}
              className="touch inline-flex items-center justify-center gap-1.5 bg-[#7D2E3B] text-[#FFFDF7] rounded-[3px] font-bold text-[15px] col-span-2"
            >
              Save to Memories
            </button>
          </div>
          <button onClick={handleDone} className="touch mt-2 text-[14px] font-bold text-[#8A7F72] underline">
            Done
          </button>
        </div>
        <Sheet
          open={showSave}
          onClose={() => {
            setShowSave(false);
            setSaveView("choice");
            setSaveError("");
          }}
          title={saveView === "choice" ? "Keep this one?" : "Tuck it into a memory"}
        >
          {saveView === "choice" ? (
            <div className="flex flex-col gap-3">
              {finalDataUrl && (
                <img src={finalDataUrl} alt="Photo to keep" className="w-24 h-24 object-cover border border-[#E5DAC6] self-center rotate-[-2deg]" />
              )}
              <p className="font-hand text-[21px] text-[#8A7F72] text-center -mt-1">miles apart, same frame ♡</p>
              {saveError && <p className="text-[14px] font-semibold text-[#7D2E3B] text-center">{saveError}</p>}
              <button
                onClick={() => setSaveView("memory")}
                className="touch text-left bg-[#E7EBDD] border border-[#A8B89A]/60 p-4 rounded-[4px] rotate-[0.4deg] active:scale-[0.98]"
              >
                <div className="font-display font-semibold text-[16px]">Save to Memory</div>
                <div className="text-[13px] text-[#6B7F5E]">add a title + note, keep it with your story</div>
              </button>
              <button
                onClick={savePhotoOnly}
                disabled={saveBusy}
                className="touch text-left bg-[#FFFDF7] border border-[#E5DAC6] p-4 rounded-[4px] rotate-[-0.4deg] active:scale-[0.98] disabled:opacity-60"
              >
                <div className="font-display font-semibold text-[16px]">{saveBusy ? "Tucking it in…" : "Just save the photo"}</div>
                <div className="text-[13px] text-[#8A7F72]">a quick together page, no words needed</div>
              </button>
            </div>
          ) : finalDataUrl ? (
            <MemoryForm
              initialPhotos={[finalDataUrl]}
              onDone={() => {
                setShowSave(false);
                setSaveView("choice");
                nav("/memories");
              }}
            />
          ) : null}
        </Sheet>
      </div>
    );
  }

  /* ---------- lobby (no session) ---------- */

  if (!session) {
    return (
      <div className="min-h-dvh flex flex-col bg-[#FAF6EF] max-w-xl mx-auto">
        <header className="flex items-center gap-2 px-3 pt-[calc(0.6rem+env(safe-area-inset-top))] pb-2 border-b border-[#E5DAC6]">
          <button onClick={onBack} aria-label="Back to photobooth" className="touch w-12 h-12 grid place-items-center text-[#4A423B]">
            <ArrowLeft size={24} />
          </button>
          <div className="leading-none">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8B5E3C]">twofold · photo booth</p>
            <p className="font-display font-semibold text-[19px] tracking-tight">take photo together</p>
          </div>
        </header>
        <div className="flex-1 px-4 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] max-w-md w-full mx-auto flex flex-col gap-4">
          <p className="font-hand text-[21px] text-[#8A7F72] text-center leading-tight">
            two phones, two cameras,<br />one moment ♡
          </p>

          {t.invites.length > 0 && (
            <div className="flex flex-col gap-2">
              {t.invites.map((inv) => (
                <div key={inv.id} className="bg-[#FFFDF7] border border-[#E5DAC6] p-4 rotate-[0.3deg]">
                  <p className="font-display font-semibold text-[18px] leading-tight">
                    {inv.creator_name || "your person"} wants to take a photo together
                  </p>
                  <p className="text-[13px] text-[#8A7F72] mt-0.5">open your camera and join in</p>
                  {t.error && <p className="text-[13.5px] font-semibold text-[#7D2E3B] mt-1">{t.error}</p>}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => t.dismissInvite(inv.id)}
                      className="touch bg-[#FFFDF7] border border-[#E5DAC6] rounded-[3px] font-bold text-[15px] text-[#4A423B]"
                    >
                      Not now
                    </button>
                    <button
                      onClick={() => t.joinSession(inv.id)}
                      disabled={t.busy}
                      className="touch bg-[#7D2E3B] text-[#FFFDF7] rounded-[3px] font-bold text-[15px] disabled:opacity-60"
                    >
                      {t.busy ? "Joining…" : "Join"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-[#FFFDF7] border border-[#E5DAC6] p-4 rotate-[-0.3deg]">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8B5E3C]">start a session</p>
            <p className="text-[14px] text-[#4A423B] mt-1">
              {partnerLabel} will see your invite the next time they open the booth.
            </p>
            <div className="mt-2">
              <FilterTabs
                ariaLabel="Together film look"
                value={presetId}
                onChange={(v: string) => setPresetId(v)}
                options={BOOTH_PRESETS.map((p) => ({ id: p.id, label: p.label }))}
              />
            </div>
            {t.error && <p className="text-[13.5px] font-semibold text-[#7D2E3B] mt-1">{t.error}</p>}
            <Button onClick={() => t.createSession(presetId)} disabled={t.busy} className="w-full mt-3">
              {t.busy ? "Starting…" : "Take Photo Together"}
            </Button>
            <p className="text-[12px] text-[#8A7F72] mt-2 text-center">Sessions expire after 30 minutes.</p>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- active session ---------- */

  const waiting = session.status === "waiting";
  const counting = session.status === "countdown";
  const iCaptured = (role === "creator" ? session.creator_photo : session.partner_photo) != null;
  const otherCaptured = (role === "creator" ? session.partner_photo : session.creator_photo) != null;
  const bothReady = session.creator_ready && session.partner_ready;
  const canStart = session.status === "ready" && bothReady && !resultUrl;

  return (
    <div className="min-h-dvh flex flex-col bg-[#FAF6EF] max-w-xl mx-auto">
      <header className="flex items-center gap-2 px-3 pt-[calc(0.6rem+env(safe-area-inset-top))] pb-2 border-b border-[#E5DAC6]">
        <button onClick={handleDone} aria-label="Leave together session" className="touch w-12 h-12 grid place-items-center text-[#4A423B]">
          <ArrowLeft size={24} />
        </button>
        <div className="leading-none">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8B5E3C]">twofold · photo booth</p>
          <p className="font-display font-semibold text-[19px] tracking-tight">photo together</p>
        </div>
      </header>

      {/* camera preview — local only, never streamed */}
      <div className="min-h-[40dvh] relative bg-[#141110] overflow-hidden shrink-0">
        <div className="absolute inset-0 flex flex-col justify-center">
          <div className="relative w-full overflow-hidden bg-black aspect-[4/3]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              aria-label="Your camera preview"
              className="absolute inset-0 w-full h-full object-cover block"
              style={{
                transform: mirror ? "scaleX(-1)" : undefined,
                opacity: cameraOk ? 1 : 0,
                visibility: cameraOk ? "visible" : "hidden",
              }}
            />
          </div>
        </div>

        {count !== null && counting && count > 0 && (
          <div aria-live="polite" aria-atomic className="absolute inset-0 grid place-items-center pointer-events-none">
            <span className="font-display font-semibold text-[110px] leading-none text-[#FFFDF7] drop-shadow-[0_2px_18px_rgba(0,0,0,0.6)]">
              {count}
            </span>
          </div>
        )}
        {count === 0 && counting && (
          <div aria-live="polite" className="absolute inset-0 grid place-items-center pointer-events-none">
            <span className="font-display font-semibold text-[64px] leading-none text-[#FFFDF7] drop-shadow-[0_2px_18px_rgba(0,0,0,0.6)]">smile ♡</span>
          </div>
        )}
        {flashOn && <div aria-hidden className="absolute inset-0 bg-[#FFFDF7] pointer-events-none" />}

        {!cameraOk && (
          <div className="absolute inset-0 bg-[#F3EBDD] p-6 flex flex-col items-center justify-center text-center gap-2 overflow-y-auto">
            <p className="font-display font-semibold text-[20px]">
              {camStatus === "denied" ? "Camera access needed" : "warming up…"}
            </p>
            {camDetail && <p className="text-[13.5px] text-[#4A423B] max-w-[36ch]">{camDetail}</p>}
            {camStatus === "denied" && (
              <p className="text-[13px] text-[#8A7F72] max-w-[36ch]">
                Camera access is needed to take your side of the photo. Allow it in the browser address bar, then retry.
              </p>
            )}
            {(camStatus === "denied" || camStatus === "error") && (
              <Button variant="secondary" onClick={camRestart} className="mt-1">
                Try again
              </Button>
            )}
          </div>
        )}
      </div>

      {/* session state */}
      <div className="border-t border-[#E5DAC6] bg-[#FAF6EF] px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] overflow-y-auto no-scrollbar">
        {pageError && <p className="text-[14px] font-semibold text-[#7D2E3B] text-center mb-2">{pageError}</p>}
        {!t.linkOk && (
          <p className="text-[13.5px] font-semibold text-[#8B5E3C] text-center mb-2">
            connection hiccup…{" "}
            <button onClick={t.retryLink} className="underline">
              retry
            </button>
          </p>
        )}

        {waiting ? (
          <div className="text-center py-2">
            <p className="font-display font-semibold text-[22px]">Waiting for {partnerLabel}…</p>
            <p className="font-hand text-[21px] text-[#8A7F72] mt-1 animate-pulse">● waiting…</p>
            <p className="text-[13.5px] text-[#8A7F72] mt-1">Keep this screen open — they'll see your invite in the booth.</p>
            <Button variant="secondary" onClick={handleDone} className="mt-4">
              Cancel
            </Button>
          </div>
        ) : (
          <>
            <div className="bg-[#FFFDF7] border border-[#E5DAC6] p-3.5">
              <div className="flex items-center justify-between text-[14.5px] font-bold">
                <span>you</span>
                <span className={ownReady ? "text-[#6B7F5E]" : "text-[#8A7F72]"}>
                  {ownReady ? "● camera ready" : "○ getting ready…"}
                </span>
              </div>
              <div className="flex items-center justify-between text-[14.5px] font-bold mt-1.5">
                <span className="truncate mr-2">{otherName}</span>
                <span className={otherReady ? "text-[#6B7F5E]" : "text-[#8A7F72]"}>
                  {otherReady ? "● camera ready" : "○ getting ready…"}
                </span>
              </div>
              {stale && (
                <p className="text-[13px] text-[#8B5E3C] mt-1.5">reconnecting… keep this screen open ♡</p>
              )}
            </div>

            {counting || iCaptured ? (
              <div className="text-center py-3">
                <p className="font-hand text-[24px] text-[#8A7F72]">
                  {!iCaptured ? "say cheese…" : !otherCaptured ? "uploading…" : "both photos received…"}
                </p>
                <div className="mt-2 flex justify-center gap-4 text-[14px] font-bold">
                  <span className={iCaptured ? "text-[#6B7F5E]" : "text-[#8A7F72]"}>
                    {iCaptured ? "✓" : "○"} you
                  </span>
                  <span className={otherCaptured ? "text-[#6B7F5E]" : "text-[#8A7F72]"}>
                    {otherCaptured ? "✓" : "○"} {otherName}
                  </span>
                </div>
                {iCaptured && otherCaptured && (
                  <p className="mt-2 inline-flex items-center gap-2 font-hand text-[21px] text-[#8A7F72]">
                    <Loader2 size={18} className="animate-spin" /> creating your photo…
                  </p>
                )}
                {pageError && (
                  <div className="mt-2">
                    <button onClick={handleRetake} className="touch text-[14px] font-bold text-[#7D2E3B] underline">
                      try again
                    </button>
                  </div>
                )}
                {!pageError && (
                  <button onClick={handleDone} className="touch mt-1 text-[13px] font-bold text-[#8A7F72] underline">
                    end session
                  </button>
                )}
              </div>
            ) : (
              <div className="py-2 text-center">
                {bothReady ? (
                  <>
                    <p className="font-display font-semibold text-[20px]">Both cameras are ready ♡</p>
                    <Button onClick={() => t.startCountdown()} disabled={!canStart || !cameraOk} className="w-full mt-3">
                      Take Photo
                    </Button>
                  </>
                ) : (
                  <p className="font-hand text-[21px] text-[#8A7F72]">getting both cameras ready…</p>
                )}
                <div className="mt-2 flex items-center justify-center gap-3">
                  <button
                    onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
                    disabled={!cameraOk}
                    aria-label="Switch camera"
                    className="touch inline-flex items-center gap-1.5 text-[13.5px] font-bold text-[#4A423B] disabled:opacity-40"
                  >
                    <SwitchCamera size={18} /> flip
                  </button>
                  <span aria-hidden className="text-[#E5DAC6]">·</span>
                  <button onClick={handleDone} className="touch text-[13.5px] font-bold text-[#8A7F72] underline">
                    end session
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

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
  const {
    videoRef,
    status: camStatus,
    detail: camDetail,
    restart: camRestart,
    reattachCamera,
  } = useCamera(facing, !!session);
  const reattachRef = useRef(reattachCamera);
  reattachRef.current = reattachCamera;
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
  const [retakeNotice, setRetakeNotice] = useState<string | null>(null);
  const handledRetakeRef = useRef<string | null>(null);

  const ownReady = role === "creator" ? session?.creator_ready : session?.partner_ready;
  const otherReady = role === "creator" ? session?.partner_ready : session?.creator_ready;
  const otherName = role === "creator" ? session?.partner_name || partnerLabel : session?.creator_name || "your person";
  const stale = !!session && !!role && partnerStale(session, role) && !resultUrl;
  const bothReady = !!session?.creator_ready && !!session?.partner_ready;
  // Fix C: joined + both-flags is semantically both-ready. Gating only on
  // 'ready' wedged desktop when the intermediate status landed late —
  // both cameras ready is the real precondition, not the label.
  const canStart =
    !!session && (session.status === "ready" || session.status === "joined") && bothReady && !resultUrl;

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
    setCapState("idle");
    setCount(null);
    setLocalPreviewUrl((prev) => {
      if (prev) {
        if (typeof console !== "undefined") {
          // eslint-disable-next-line no-console
          console.info("[LongDistance] capturedPhoto CLEARED", { reason: "new session" });
        }
        try {
          URL.revokeObjectURL(prev);
        } catch {
          /* already gone */
        }
      }
      return null;
    });
  }, [session?.id]);

  // Transition diagnostics: session status / camera state around capture.
  useEffect(() => {
    if (typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      console.info("[LongDistance] session status changed", {
        status: session?.status ?? null,
        creator_ready: session?.creator_ready ?? null,
        partner_ready: session?.partner_ready ?? null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, session?.status]);
  useEffect(() => {
    if (typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      console.info("[LongDistance] camera state changed", { camStatus });
    }
  }, [camStatus]);

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
      setCapState("idle");
      setPageError("");
      setLocalPreviewUrl((prev) => {
        if (prev) {
          if (typeof console !== "undefined") {
            // eslint-disable-next-line no-console
            console.info("[LongDistance] capturedPhoto CLEARED", { reason: "partner retake sync" });
          }
          try {
            URL.revokeObjectURL(prev);
          } catch {
            /* already gone */
          }
        }
        return null;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.status, session?.creator_photo, session?.partner_photo]);

  // Camera up → I'm ready (auto: init success is the signal).
  useEffect(() => {
    if (!session || !role || ownReady || resultUrl) return;
    if (!cameraOk) return;
    if (!["joined", "ready", "retake_requested"].includes(session.status)) return;
    void t.markReady();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, session?.status, role, ownReady, cameraOk, resultUrl]);

  // Synchronized retake: an explicit retake_requested (newer than anything
  // handled) clears my captured preview, returns me to the camera, and
  // re-attaches the stream — no button press needed on this side.
  // mergeRow() is untouched: the wipe here is intentional, not stale data.
  useEffect(() => {
    if (!session || session.status !== "retake_requested" || !session.retake_at) return;
    if (handledRetakeRef.current === session.retake_at) return;
    handledRetakeRef.current = session.retake_at;
    if (typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      console.info("[LongDistance] RETAKE received", { by: session.retake_by });
      // eslint-disable-next-line no-console
      console.info("[LongDistance] returning to camera");
    }
    // Intentionally discard round photos locally (the explicit retake
    // exception to mergeRow): otherwise stale round-1 photos would satisfy
    // the complete-promotion during the next countdown and cancel it.
    t.clearPhotosForRetake();
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    resultBlobRef.current = null;
    capturedRef.current = null;
    composingRef.current = false;
    setCount(null);
    setCapState("idle");
    setWaitLong(false);
    setPageError("");
    setLocalPreviewUrl((prev) => {
      if (prev) {
        if (typeof console !== "undefined") {
          // eslint-disable-next-line no-console
          console.info("[LongDistance] capturedPhoto CLEARED", { reason: "retake requested" });
        }
        try {
          URL.revokeObjectURL(prev);
        } catch {
          /* already gone */
        }
      }
      return null;
    });
    void reattachRef.current();
    const byOther = !!session.retake_by && session.retake_by !== myName;
    setRetakeNotice(byOther ? `${session.retake_by} wants to retake ♡` : "Retaking together ♡");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.status, session?.retake_at]);

  // Retake notice is transient: gone once we're ready again.
  useEffect(() => {
    if (session?.status === "ready") setRetakeNotice(null);
  }, [session?.status]);
  useEffect(() => {
    if (!retakeNotice) return;
    const id = window.setTimeout(() => setRetakeNotice(null), 8000);
    return () => window.clearTimeout(id);
  }, [retakeNotice]);

  // Take-Photo gate diagnostics: names the exact false condition.
  useEffect(() => {
    if (typeof console === "undefined") return;
    if (resultUrl) return;
    if (!session || !["joined", "ready", "retake_requested"].includes(session.status)) return;
    const reason = !cameraOk
      ? "local camera not ready"
      : !ownReady
        ? "local ready not reported"
        : !otherReady
          ? "waiting for partner camera"
          : session.status !== "ready" && session.status !== "joined"
            ? `session status ${session.status}`
            : "none (enabled)";
    // eslint-disable-next-line no-console
    console.info("[LongDistance] localCameraReady:", { cameraOk });
    // eslint-disable-next-line no-console
    console.info("[LongDistance] partnerCameraReady:", { otherReady });
    // eslint-disable-next-line no-console
    console.info("[LongDistance] sessionStatus:", { status: session.status });
    // eslint-disable-next-line no-console
    console.info("[LongDistance] retakeState:", {
      retake_at: session.retake_at,
      retake_by: session.retake_by,
      handled: handledRetakeRef.current,
    });
    // eslint-disable-next-line no-console
    console.info("[LongDistance] canTakePhoto:", { canStart });
    // eslint-disable-next-line no-console
    console.info("[LongDistance] takePhotoDisabledReason:", { reason });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOk, ownReady, otherReady, session?.status, session?.retake_at, resultUrl]);

  // Readiness diagnostics.
  useEffect(() => {
    if (otherReady && typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      console.info("[LongDistance] partner camera ready");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherReady]);
  useEffect(() => {
    if (bothReady && typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      console.info("[LongDistance] both cameras ready");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bothReady]);

  const [capState, setCapState] = useState<"idle" | "capturing" | "uploading" | "done" | "failed">("idle");
  const [waitLong, setWaitLong] = useState(false);
  // Immediate local preview: set straight from the captured Blob (object
  // URL), shown before upload finishes and independent of partner sync.
  // Same shared flow on phone and desktop — no device-specific branches.
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

  // Build marker: confirms both devices run this exact bundle.
  useEffect(() => {
    if (typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      console.info("[LongDistance] booth build together-v6-retake");
    }
  }, []);

  const doCapture = useCallback(async () => {
    const video = videoRef.current;
    const s = sessionRef.current;
    // Capture uses the intrinsic camera dimensions (never clientWidth /
    // clientHeight), preserving whatever aspect the camera delivers —
    // portrait phone or landscape desktop webcam alike.
    const stream = (video?.srcObject as MediaStream | null) ?? null;
    if (typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      console.info("[LongDistance] Video dimensions:", {
        hasVideo: !!video,
        hasSession: !!s,
        readyState: video?.readyState ?? -1,
        videoWidth: video?.videoWidth ?? 0,
        videoHeight: video?.videoHeight ?? 0,
        clientWidth: video?.clientWidth ?? 0,
        clientHeight: video?.clientHeight ?? 0,
        paused: video?.paused ?? true,
        hasSrcObject: !!video?.srcObject,
        tracks: stream?.getVideoTracks().map((tr) => ({
          enabled: tr.enabled,
          readyState: tr.readyState,
          muted: tr.muted,
        })) ?? null,
      });
    }
    if (!video || !s) {
      setCapState("failed");
      setPageError("Couldn't grab that frame — try retake?");
      return;
    }
    setPageError("");
    setCapState("capturing");
    setFlashOn(true);
    await wait(280);
    try {
      // Smaller than solo captures: two phones upload over mobile data and
      // both sides wait — 1600px is plenty for the strip.
      const src = grabFrame(video, mirror, 1600);
      if (typeof console !== "undefined") {
        // eslint-disable-next-line no-console
        console.info("[LongDistance] Canvas capture:", {
          canvasWidth: src?.width ?? 0,
          canvasHeight: src?.height ?? 0,
        });
      }
      if (!src) throw new Error("camera not ready");
      const preset = BOOTH_PRESETS.find((p) => p.id === s.preset_id) ?? BOOTH_PRESETS[0];
      const graded = gradePhotoCanvas(src, resolveGrade(preset, 100, ADJUST_DEFAULTS));
      const blob = await canvasToJpeg(graded, 0.82);
      if (typeof console !== "undefined") {
        // eslint-disable-next-line no-console
        console.info("[LongDistance] Capture successful");
        // eslint-disable-next-line no-console
        console.info("[LongDistance] Blob size:", { size: blob.size, type: blob.type });
      }
      // Show my photo immediately from the Blob — no waiting on upload,
      // partner, realtime, or the combined strip.
      const previewUrl = URL.createObjectURL(blob);
      setLocalPreviewUrl((prev) => {
        if (prev) {
          try {
            URL.revokeObjectURL(prev);
          } catch {
            /* already gone */
          }
        }
        return previewUrl;
      });
      if (typeof console !== "undefined") {
        // eslint-disable-next-line no-console
        console.info("[LongDistance] capture SUCCESS");
        // eslint-disable-next-line no-console
        console.info("[LongDistance] Local preview URL:", { ready: true });
        // eslint-disable-next-line no-console
        console.info("[LongDistance] capturedPhoto SET");
      }
      const url = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.onerror = rej;
        r.readAsDataURL(blob);
      });
      if (typeof console !== "undefined") {
        // eslint-disable-next-line no-console
        console.info("[LongDistance] Upload:", { dataUrlChars: url.length });
      }
      setCapState("uploading");
      if (typeof console !== "undefined") {
        // eslint-disable-next-line no-console
        console.info("[LongDistance] upload started");
      }
      const ok = await uploadPhotoRef.current(url);
      if (typeof console !== "undefined") {
        // eslint-disable-next-line no-console
        console.info("[LongDistance] upload finished", { ok });
      }
      setCapState(ok ? "done" : "failed");
    } catch (e) {
      if (typeof console !== "undefined") {
        // eslint-disable-next-line no-console
        console.info("[LongDistance] capture FAILED", {
          message: e instanceof Error ? e.message : String(e),
        });
      }
      setCapState("failed");
      setPageError("Couldn't grab that frame — try retake?");
    } finally {
      setFlashOn(true);
      await wait(160);
      setFlashOn(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoRef, mirror]);

  // Shared countdown: both devices count to session.capture_at on their own
  // clocks. Single authoritative owner per capture attempt, guarded by a
  // generation token: only the current generation may tick, fire capture,
  // or touch countdown state — a stale interval dies loudly, never silently.
  const countdownTokenRef = useRef(0);
  const localPreviewRef = useRef(localPreviewUrl);
  localPreviewRef.current = localPreviewUrl;
  useEffect(() => {
    if (!session || session.status !== "countdown" || !session.capture_at) {
      if (!session?.capture_at) capturedRef.current = null;
      return;
    }
    if (capturedRef.current === session.capture_at) return;
    const token = ++countdownTokenRef.current;
    const statusAtStart = session.status;
    const captureAt = session.capture_at;
    if (typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      console.info("[LongDistance] countdown START", {
        token,
        status: statusAtStart,
        capture_at: captureAt,
        bothReady,
        cameraOk,
        photosPresent: !!(session.creator_photo || session.partner_photo),
        handledRetake: handledRetakeRef.current,
      });
    }
    setPageError("");
    const parsed = new Date(captureAt).getTime();
    // Guard against a skewed local clock (or an unparseable timestamp):
    // normally we fire at the shared moment; worst case we fire 25s after
    // the countdown started rather than waiting forever.
    const target = Number.isFinite(parsed) ? parsed : Date.now() + 3000;
    const startedAt = Date.now();
    const WATCHDOG_MS = 25_000;
    const fire = (why: string) => {
      if (token !== countdownTokenRef.current) {
        if (typeof console !== "undefined") {
          // eslint-disable-next-line no-console
          console.info("[LongDistance] stale countdown ignored", { token, why });
        }
        return;
      }
      window.clearInterval(id);
      if (typeof console !== "undefined") {
        // eslint-disable-next-line no-console
        console.info("[LongDistance] countdown COMPLETE", { token, why });
      }
      if (capturedRef.current !== captureAt) {
        capturedRef.current = captureAt;
        if (typeof console !== "undefined") {
          // eslint-disable-next-line no-console
          console.info("[LongDistance] capture START", { token });
        }
        void doCapture();
      }
    };
    const id = window.setInterval(() => {
      if (token !== countdownTokenRef.current) {
        window.clearInterval(id);
        return;
      }
      const now = Date.now();
      const remain = Math.ceil((target - now) / 1000);
      setCount(remain > 0 ? remain : 0);
      if (typeof console !== "undefined") {
        // eslint-disable-next-line no-console
        console.info("[LongDistance] countdown TICK:", { token, value: remain > 0 ? remain : 0 });
        // eslint-disable-next-line no-console
        console.info("[LongDistance] session status during countdown:", {
          token,
          status: sessionRef.current?.status,
        });
        // eslint-disable-next-line no-console
        console.info("[LongDistance] capturedPhoto during countdown:", {
          token,
          hasPreview: !!localPreviewRef.current,
        });
      }
      if (target - now <= 0 || now - startedAt > WATCHDOG_MS) {
        fire(target - now <= 0 ? "target-reached" : "watchdog");
      }
    }, 200);
    return () => {
      window.clearInterval(id);
      if (typeof console !== "undefined") {
        // eslint-disable-next-line no-console
        console.info("[LongDistance] countdown CLEANUP", {
          token,
          reason: `effect re-run/unmount; status at setup was ${statusAtStart}`,
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.status, session?.capture_at, doCapture]);

  // Both photos in → compose the shared strip locally. Gated on an
  // active round so a stale row can never resurrect an old strip.
  useEffect(() => {
    if (!session || !["countdown", "complete"].includes(session.status)) return;
    if (!session.creator_photo || !session.partner_photo || resultUrl || composingRef.current) return;
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
      if (localPreviewUrl) {
        if (typeof console !== "undefined") {
          // eslint-disable-next-line no-console
          console.info("[LongDistance] capturedPhoto CLEARED", { reason: "unmount" });
        }
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  const handleRetake = async () => {
    // Transactional: the confirmed retake_requested echo (mine or my
    // partner's) drives the return-to-camera. On failure nothing local is
    // cleared — the error stays visible with a retry.
    setPageError("");
    await t.requestRetake();
  };

  // If my photo is up but my person's isn't arriving, say so and offer a
  // way out instead of spinning forever.
  const myPhoto = role === "creator" ? session?.creator_photo : session?.partner_photo;
  const otherPhoto = role === "creator" ? session?.partner_photo : session?.creator_photo;
  const waitingForPartner = !!session && !!role && myPhoto != null && otherPhoto == null && !resultUrl;
  useEffect(() => {
    setWaitLong(false);
    if (!waitingForPartner) return;
    const id = window.setTimeout(() => setWaitLong(true), 45_000);
    return () => window.clearTimeout(id);
  }, [waitingForPartner, session?.id]);

  const handleTakePhoto = async () => {
    setPageError("");
    const v = videoRef.current;
    const stream = (v?.srcObject as MediaStream | null) ?? null;
    if (typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      console.info("[LongDistance] TAKE PHOTO clicked", {
        status: session?.status,
        creator_ready: session?.creator_ready,
        partner_ready: session?.partner_ready,
        role,
        canStart,
        cameraOk,
        hasStream: !!stream,
        streamLive: stream?.getVideoTracks().some((tr) => tr.readyState === "live") ?? false,
      });
    }
    const started = await t.startCountdown();
    if (!started) {
      // Either someone else started (realtime will show the countdown) or
      // the write failed — the session view will reveal which.
      setPageError("Hmm — waiting to see the countdown… if nothing happens, try again.");
    }
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
        {retakeNotice && (
          <p className="font-hand text-[21px] text-[#8A7F72] text-center mb-1">{retakeNotice}</p>
        )}
        {pageError && <p className="text-[14px] font-semibold text-[#7D2E3B] text-center mb-2">{pageError}</p>}
        {t.error && <p className="text-[14px] font-semibold text-[#7D2E3B] text-center mb-2">{t.error}</p>}
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

            {/* Local capture preview — hoisted above the session-state
                branches on purpose: once captured, my photo stays rendered
                while uploading/waiting no matter what the session row,
                realtime echoes, or polling merges do. Same on phone and
                desktop; never display:none, no device branches. */}
            {localPreviewUrl && (
              <div className="mt-1 flex flex-col items-center">
                <img
                  src={localPreviewUrl}
                  alt="Your captured photo"
                  className="max-h-44 w-auto border border-[#E5DAC6] shadow-sm"
                  onLoad={() => {
                    if (typeof console !== "undefined") {
                      // eslint-disable-next-line no-console
                      console.info("[LongDistance] Rendering captured photo");
                    }
                  }}
                />
                <p className="text-[12.5px] font-bold text-[#6B7F5E] mt-1">your side, captured ♡</p>
              </div>
            )}
            {counting || iCaptured ? (
              <div className="text-center py-3">
                <p className="font-hand text-[24px] text-[#8A7F72]">
                  {!iCaptured
                    ? capState === "capturing"
                      ? "capturing…"
                      : capState === "uploading"
                        ? "uploading your photo…"
                        : "say cheese…"
                    : !otherCaptured
                      ? "uploading…"
                      : "both photos received…"}
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
                {waitLong && !otherCaptured && (
                  <p className="text-[13px] text-[#8A7F72] mt-2">
                    still waiting for {otherName} — they may be stuck on their countdown. You can wait a little more or start the round over.
                  </p>
                )}
                {(pageError || (waitLong && !otherCaptured)) && (
                  <div className="mt-2">
                    <button onClick={handleRetake} className="touch text-[14px] font-bold text-[#7D2E3B] underline">
                      start this round over
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
                    <Button onClick={handleTakePhoto} disabled={!canStart || !cameraOk} className="w-full mt-3">
                      Take Photo
                    </Button>
                    {!cameraOk && (
                      <p className="text-[13px] text-[#8A7F72] mt-2">waiting for this camera to warm up…</p>
                    )}
                    {session.status === "joined" && cameraOk && (
                      <p className="text-[13px] text-[#8A7F72] mt-2">syncing final state… you can still take the photo ♡</p>
                    )}
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

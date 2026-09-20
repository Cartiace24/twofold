import { useCallback, useEffect, useRef, useState } from "react";

export type Facing = "environment" | "user";
export type CamStatus = "starting" | "ready" | "denied" | "missing" | "insecure" | "error";

/** Owns the getUserMedia lifecycle: starts on mount / facing change, stops
 *  every track on cleanup so the camera never runs in the background.
 *  Robust for mobile Safari / Android Chrome. */
export function useCamera(facing: Facing) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const genRef = useRef(0);
  const [status, setStatus] = useState<CamStatus>("starting");
  const [detail, setDetail] = useState("");

  const stop = useCallback(() => {
    genRef.current += 1;
    streamRef.current?.getTracks().forEach((t) => {
      try {
        t.stop();
      } catch {
        /* already stopped */
      }
    });
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const start = useCallback(
    async (f: Facing) => {
      const gen = ++genRef.current;

      // Secure-context check — HTTP (except localhost) has no mediaDevices
      // and mobile browsers reject getUserMedia without HTTPS.
      if (typeof window !== "undefined" && !window.isSecureContext) {
        setStatus("insecure");
        setDetail(
          "The Photobooth needs a secure connection to access your camera. Open Twofold over HTTPS (or localhost) and try again."
        );
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        // Distinguish insecure (above) from genuinely unsupported browsers.
        if (typeof window !== "undefined" && window.location.protocol === "http:") {
          setStatus("insecure");
          setDetail(
            "The Photobooth needs a secure connection to access your camera. Open Twofold over HTTPS and try again."
          );
        } else {
          setStatus("missing");
          setDetail("This browser can't access the camera — try a newer browser, or add from your gallery instead.");
        }
        return;
      }

      setStatus("starting");
      setDetail("");

      // Spec-preferred: ideal rear first, then bare fallback so low-end /
      // permission-gated devices still get something. No permanent rear
      // requirement, no overconstrained `exact` first that trips iPhones.
      const attempts: MediaStreamConstraints[] = [
        { video: { facingMode: { ideal: f } }, audio: false },
        { video: true, audio: false },
      ];

      for (const constraints of attempts) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          if (gen !== genRef.current) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          // Verify a live video track — otherwise we'd show a black preview.
          const vTrack = stream.getVideoTracks()[0];
          if (!vTrack || vTrack.readyState !== "live") {
            stream.getTracks().forEach((t) => t.stop());
            continue;
          }
          if (!vTrack.enabled) {
            try {
              vTrack.enabled = true;
            } catch {
              /* ignore */
            }
          }
          streamRef.current = stream;
          // Wait for the <video> to be mounted — the stable preview keeps it
          // mounted, but on first mount there is a one-frame gap.
          let el = videoRef.current;
          if (!el) {
            await new Promise<void>((res) => requestAnimationFrame(() => res()));
            el = videoRef.current;
          }
          if (el) {
            // Ensure any previous srcObject is cleared before assigning.
            if (el.srcObject !== stream) el.srcObject = stream;
            // iOS Safari needs muted+playsInline+autoPlay and an explicit play().
            try {
              await el.play();
            } catch {
              /* autoplay with muted+playsInline can still need a gesture on some iOS */
            }
            // Wait for enough data so videoWidth/Height >0 — otherwise
            // the preview is black and canvas capture would be 0×0.
            await new Promise<void>((res) => {
              if (el!.readyState >= 2 && el!.videoWidth > 0 && el!.videoHeight > 0) return res();
              let done = false;
              const finish = () => {
                if (done) return;
                done = true;
                el!.removeEventListener("loadedmetadata", finish);
                el!.removeEventListener("canplay", finish);
                res();
              };
              el!.addEventListener("loadedmetadata", finish, { once: true });
              el!.addEventListener("canplay", finish, { once: true } as AddEventListenerOptions);
              setTimeout(finish, 1400);
            });
            // Final verification — if dimensions are still 0, the video is not
            // actually playing (e.g. track muted by OS). Treat as error.
            if (el.videoWidth === 0 || el.videoHeight === 0) {
              stream.getTracks().forEach((t) => t.stop());
              streamRef.current = null;
              el.srcObject = null;
              continue;
            }
          } else {
            // No video element to show the stream — keep it live but don't
            // mark ready; the next render will attach it.
            stream.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
            continue;
          }
          if (gen !== genRef.current) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          setStatus("ready");
          return;
        } catch (e) {
          const name = (e as DOMException | null)?.name ?? "";
          const msg = (e as Error | null)?.message ?? "";
          if (import.meta.env.DEV && typeof console !== "undefined") {
            // Surface the raw failure so the actual device reason is visible
            // in remote debugging instead of being silently swallowed.
            // eslint-disable-next-line no-console
            console.warn("[twofold] getUserMedia failed", { name, message: msg, constraints });
          }
          if (name === "NotAllowedError" || name === "SecurityError") {
            setStatus("denied");
            setDetail(
              "Camera access was blocked. Allow it in the browser address bar / site settings, then try again — or add from your gallery instead."
            );
            return;
          }
          if (name === "NotFoundError" || name === "DevicesNotFoundError") break;
          if (name === "OverconstrainedError") continue;
          if (name === "NotReadableError" || name === "AbortError" || name === "TrackStartError") {
            setStatus("error");
            setDetail("The camera seems busy (another app may be using it). Close it elsewhere and retry.");
            return;
          }
          // Unknown error on this constraint set — try the looser one.
        }
      }
      if (gen === genRef.current) {
        setStatus("missing");
        setDetail("No camera was found on this device — add from your gallery instead.");
      }
    },
    []
  );

  useEffect(() => {
    void start(facing);
    return () => {
      stop();
    };
  }, [facing, start, stop]);

  // Heartbeat: ensure tracks are stopped even if the component unmounts
  // without the normal cleanup (e.g. hard navigation). The `gen` bump on
  // `stop()` already prevents stale callbacks from restoring tracks.
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return { videoRef, status, detail, stop, restart: () => start(facing) };
}
